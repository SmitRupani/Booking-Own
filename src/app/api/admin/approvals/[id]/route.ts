import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { bookings, approvalTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(['ADMIN']);
    const { id } = await params;
    const bookingId = Number(id);

    if (isNaN(bookingId)) {
      throw new ValidationError('Invalid booking ID');
    }

    const body = await req.json();
    const { action, reason } = body;

    if (!['approve', 'reject'].includes(action)) {
      throw new ValidationError('Action must be either approve or reject');
    }

    const db = getDb();
    const bookingList = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    const booking = bookingList[0];
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    const updates: Partial<typeof bookings.$inferInsert> = {};

    if (action === 'approve') {
      updates.status = 'CONFIRMED';
      updates.approval = 'APPROVED';
      updates.approvedBy = String(user.id);
      updates.approvedAt = new Date();
    } else {
      updates.status = 'CANCELLED';
      updates.approval = 'REJECTED';
      if (reason) {
        updates.rejectionReason = reason;
        updates.overrideReason = reason;
      }
    }

    const [updatedBooking] = await db
      .update(bookings)
      .set(updates)
      .where(eq(bookings.id, booking.id))
      .returning();

    // Delete any pending email approval tokens
    await db.delete(approvalTokens).where(eq(approvalTokens.bookingId, booking.id));

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
