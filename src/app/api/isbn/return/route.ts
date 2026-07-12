import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { bookings, equipmentItems, resources, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { parseStudentEmail } from '@/lib/utils';
import { getNow } from '@/lib/timezone';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['GUARD', 'ADMIN']);

    const { isbn } = await req.json();

    if (!isbn) {
      throw new ValidationError('ISBN is required');
    }

    const normalizedIsbn = isbn.replace(/[-\s]/g, '');

    const result = await db.transaction(async (tx: any) => {
      const bookList = await tx
        .select()
        .from(equipmentItems)
        .where(eq(equipmentItems.isbn, normalizedIsbn))
        .limit(1);

      const book = bookList[0];
      if (!book) {
        throw new NotFoundError('Book with this ISBN not found in library');
      }

      // Fetch active bookings for library resources
      const candidateBookings = await tx
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.kind, 'LIBRARY'),
            inArray(bookings.status, ['CHECKED_IN', 'CONFIRMED'])
          )
        );

      const activeBooking = candidateBookings.find((b: any) => {
        const items = b.items as any[] | null;
        return items?.some((item) => Number(item.itemId) === book.id);
      });

      if (!activeBooking) {
        throw new NotFoundError('No active booking found for this book');
      }

      if (activeBooking.status === 'RETURNED' || activeBooking.status === 'COMPLETED') {
        throw new ConflictError('This book has already been returned');
      }

      if (!activeBooking.items || (activeBooking.items as any[]).length === 0) {
        throw new ValidationError('Booking has no items');
      }

      const itemsList = activeBooking.items as any[];
      const itemInBooking = itemsList.find(
        (item: any) => Number(item.itemId) === book.id
      );

      if (!itemInBooking) {
        throw new NotFoundError('Book item not found in booking');
      }

      // Increment available quantity
      await tx
        .update(equipmentItems)
        .set({
          qtyAvailable: book.qtyAvailable + itemInBooking.qty,
        })
        .where(eq(equipmentItems.id, book.id));

      const now = getNow();
      const updatedBookingList = await tx
        .update(bookings)
        .set({
          status: 'RETURNED',
          returnedAt: now,
        })
        .where(eq(bookings.id, activeBooking.id))
        .returning();

      const updatedBooking = updatedBookingList[0];

      const resourceList = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, activeBooking.resourceId))
        .limit(1);
      const resource = resourceList[0];

      const studentList = await tx
        .select()
        .from(users)
        .where(eq(users.id, activeBooking.userId))
        .limit(1);
      const student = studentList[0];

      if (!student) {
        throw new NotFoundError('Student not found');
      }

      return {
        booking: updatedBooking,
        resource,
        student,
        book,
      };
    });

    const studentInfo = parseStudentEmail(result.student.email);

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        kind: result.booking.kind,
        status: result.booking.status,
        resourceName: result.resource?.name || 'Unknown Resource',
        returnedAt: result.booking.returnedAt,
      },
      book: {
        name: result.book.name,
        author: result.book.author,
        isbn: result.book.isbn,
      },
      student: {
        id: result.student.id,
        name: result.student.name,
        email: result.student.email,
        rollNumber: studentInfo?.rollNumber || null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
