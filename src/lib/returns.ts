import { and, eq, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings, equipmentItems, penalties } from './db/schema';
import { POLICIES } from './policies';
import { recalculatePenaltyPoints } from './groupBookingPenalties';
import { ConflictError, NotFoundError, ValidationError } from './errors';

interface ProcessReturnOptions {
  bookingId: string | number;
  condition: string;
  notes?: string;
  returnedBy?: string;
}

interface BookingItem {
  itemId: string | number;
  name?: string;
  qty: number;
}

/**
 * Shared return processing for equipment and library bookings.
 * Validates booking state, restores inventory, applies penalties, and completes booking.
 */
export async function processReturn({
  bookingId,
  condition,
  notes,
  returnedBy,
}: ProcessReturnOptions) {
  const bId = Number(bookingId);
  const db = getDb();

  return await db.transaction(async (tx) => {
    // Fetch booking
    const bookingResult = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, bId));

    const booking = bookingResult[0];
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.kind !== 'EQUIPMENT' && booking.kind !== 'LIBRARY') {
      throw new ValidationError('Only equipment and library bookings can be returned');
    }

    if (booking.status !== 'CHECKED_IN') {
      throw new ValidationError('Booking must be checked in to return');
    }

    if (booking.returnedAt) {
      throw new ConflictError('Equipment already returned');
    }

    // Restore qtyAvailable on return
    const items = booking.items as BookingItem[] | null;
    if (items && items.length > 0) {
      for (const item of items) {
        const itemIds = Number(item.itemId);
        await tx
          .update(equipmentItems)
          .set({
            qtyAvailable: sql`${equipmentItems.qtyAvailable} + ${item.qty}`,
          })
          .where(eq(equipmentItems.id, itemIds));
      }
    }

    // Dynamic Return Deadline Logic with 15-min grace
    const now = new Date();
    let adjustedEndTime = new Date(booking.endAt).getTime();
    if (booking.checkedInAt) {
      const pickupTime = new Date(booking.checkedInAt).getTime();
      const startTime = new Date(booking.startAt).getTime();
      const pickupDelay = pickupTime - startTime;
      if (pickupDelay > 0) {
        adjustedEndTime += pickupDelay;
      }
    }
    adjustedEndTime += POLICIES.NO_SHOW_GRACE_MINUTES * 60 * 1000;

    const isLate = now.getTime() > adjustedEndTime;
    const isDamaged = condition === 'damaged';

    let penaltyApplied = false;

    if (isLate) {
      const latePoints = booking.kind === 'LIBRARY'
        ? POLICIES.PENALTY_BOOK_LATE_RETURN
        : POLICIES.PENALTY_LATE_RETURN;

      const reason = booking.kind === 'LIBRARY' ? 'Late book return' : 'Late equipment return';

      await tx.insert(penalties).values({
        userId: booking.userId,
        bookingId: booking.id,
        points: latePoints,
        reason,
        served: false,
      });

      penaltyApplied = true;
    }

    if (isDamaged) {
      await tx.insert(penalties).values({
        userId: booking.userId,
        bookingId: booking.id,
        points: POLICIES.PENALTY_DAMAGE,
        reason: `Equipment returned damaged${notes ? `: ${notes}` : ''}`,
        served: false,
      });

      penaltyApplied = true;
    }

    // Update booking status
    await tx
      .update(bookings)
      .set({
        status: 'COMPLETED',
        returnedAt: now,
        returnCondition: condition,
        returnNotes: notes || '',
        returnedBy: returnedBy || '',
        updatedAt: now,
      })
      .where(eq(bookings.id, bId));

    return { booking, penaltyApplied };
  }).then(async (result) => {
    // Recalculate penalty points outside of transaction if penalty was applied
    if (result.penaltyApplied) {
      await recalculatePenaltyPoints(result.booking.userId);
    }
    return result;
  });
}
