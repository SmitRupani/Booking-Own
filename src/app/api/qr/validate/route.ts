import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { bookings, qrTokens, users, resources, equipmentItems } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { verifyQRToken } from '@/lib/qr';
import { handleApiError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { getAvailableQuantity } from '@/lib/inventory';
import { parseStudentEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['GUARD', 'ADMIN']);

    const { token } = await req.json();
    const normalizedToken = typeof token === 'string' ? token.trim() : '';

    if (!normalizedToken) {
      throw new ValidationError('Token required');
    }

    const result = await db.transaction(async (tx: any) => {
      const dbTokenList = await tx
        .select()
        .from(qrTokens)
        .where(eq(qrTokens.token, normalizedToken))
        .limit(1);

      const dbToken = dbTokenList[0];
      if (!dbToken) throw new NotFoundError('Token');

      const verification = verifyQRToken(normalizedToken);
      if (!verification.valid) {
        console.warn(
          `QR token signature verification failed for stored token ${dbToken.id}: ${verification.error}`
        );
      }

      if (dbToken.used) {
        const usedAtStr = dbToken.usedAt ? new Date(dbToken.usedAt).toISOString() : 'unknown time';
        throw new ConflictError(`This QR code was already scanned at ${usedAtStr}. Please generate a new one.`);
      }

      if (new Date().getTime() > new Date(dbToken.expiresAt).getTime()) {
        throw new ValidationError('Token expired');
      }

      const bookingList = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, dbToken.bookingId))
        .limit(1);

      const booking = bookingList[0];
      if (!booking) throw new NotFoundError('Booking');

      if (booking.kind !== 'EQUIPMENT') {
        throw new ValidationError('QR validation is only for equipment pickup');
      }

      if (booking.status === 'CHECKED_IN') {
        throw new ConflictError('Equipment already checked in');
      }

      if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
        throw new ValidationError('Booking is not in a valid state for check-in');
      }

      const bookingOwnerList = await tx
        .select()
        .from(users)
        .where(eq(users.id, booking.userId))
        .limit(1);

      const bookingOwner = bookingOwnerList[0];
      if (!bookingOwner) throw new NotFoundError('Booking owner');

      if (bookingOwner.suspendedUntil && bookingOwner.suspendedUntil > new Date()) {
        throw new ValidationError('User is currently suspended');
      }

      const resourceList = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, booking.resourceId))
        .limit(1);

      const resource = resourceList[0];
      if (!resource) throw new NotFoundError('Resource');
      if (resource.status !== 'ACTIVE') {
        throw new ValidationError('Resource is currently inactive');
      }

      const items = booking.items as Array<{ itemId: number; name: string; qty: number }> | null;
      if (items && items.length > 0) {
        const itemIds = items.map((i: any) => i.itemId);
        const eqItemsList = await tx
          .select()
          .from(equipmentItems)
          .where(inArray(equipmentItems.id, itemIds));

        const equipmentItemMap = new Map<number, any>(eqItemsList.map((item: any) => [item.id, item]));

        for (const item of items as any[]) {
          const equipmentItem = equipmentItemMap.get(item.itemId);
          if (!equipmentItem) {
            throw new ConflictError(`Insufficient inventory for ${item.name}`);
          }

          const availableNow = await getAvailableQuantity(
            item.itemId,
            new Date(booking.startAt),
            new Date(booking.endAt),
            equipmentItem.qtyTotal,
            booking.id,
            tx
          );

          if (availableNow < item.qty) {
            throw new ConflictError(`Insufficient inventory for ${item.name}`);
          }

          await tx
            .update(equipmentItems)
            .set({
              qtyAvailable: Math.max(0, availableNow - item.qty),
            })
            .where(eq(equipmentItems.id, item.itemId));
        }
      }

      const updatedBookingList = await tx
        .update(bookings)
        .set({
          status: 'CHECKED_IN',
          checkedInAt: new Date(),
        })
        .where(eq(bookings.id, booking.id))
        .returning();

      await tx
        .update(qrTokens)
        .set({ used: true, usedAt: new Date() })
        .where(eq(qrTokens.id, dbToken.id));

      return {
        booking: updatedBookingList[0],
        resource,
        bookingOwner,
      };
    });

    const studentInfo = parseStudentEmail(result.bookingOwner.email);

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        kind: result.booking.kind,
        status: result.booking.status,
        items: result.booking.items,
        resourceName: result.resource.name,
        returnBy: result.booking.endAt,
      },
      student: {
        id: result.bookingOwner.id,
        name: result.bookingOwner.name,
        email: result.bookingOwner.email,
        rollNumber: studentInfo?.rollNumber || null,
      },
    });
  } catch (error) {
    console.error('QR validation error:', error);
    return handleApiError(error);
  }
}
