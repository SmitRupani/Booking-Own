import { and, eq, gt, gte, lt, ne, sql, or, inArray } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings } from './db/schema';

// Interface for booking items stored as JSON
interface BookingItem {
    itemId: string | number;
    name?: string;
    qty: number;
}

async function getReservedQuantitiesForItems(
    itemIds: number[],
    start: Date,
    end: Date,
    excludeBookingId?: number,
    db = getDb()
): Promise<Map<number, number>> {
    if (itemIds.length === 0) {
        return new Map();
    }

    let conditions = [];

    // RESERVATION AVAILABILITY MODEL:
    // - CONFIRMED/PENDING: only count when overlapping the requested window
    // - CHECKED_IN: always count while items are physically issued (including overdue returns)
    conditions.push(
        or(
            and(
                inArray(bookings.status, ['CONFIRMED', 'PENDING']),
                lt(bookings.startAt, end),
                gt(bookings.endAt, start)
            ),
            eq(bookings.status, 'CHECKED_IN')
        )
    );

    if (excludeBookingId) {
        conditions.push(ne(bookings.id, excludeBookingId));
    }

    const overlappingBookings = await db
        .select({
            items: bookings.items,
        })
        .from(bookings)
        .where(and(...conditions));

    const itemIdSet = new Set(itemIds);
    const reservedByItemId = new Map<number, number>();

    for (const booking of overlappingBookings) {
        const items = booking.items as BookingItem[] | null;
        if (!items) continue;

        for (const item of items) {
            const idAsNum = Number(item.itemId);
            if (!itemIdSet.has(idAsNum)) continue;
            reservedByItemId.set(idAsNum, (reservedByItemId.get(idAsNum) ?? 0) + item.qty);
        }
    }

    return reservedByItemId;
}

/**
 * Calculate available quantity for an equipment item during a specific time window.
 * This checks for overlapping bookings and returns how many items are available.
 */
export async function getAvailableQuantity(
    itemId: string | number,
    start: Date,
    end: Date,
    totalQuantity: number,
    excludeBookingId?: string | number,
    db = getDb()
): Promise<number> {
    const idAsNum = Number(itemId);
    const excludeIdAsNum = excludeBookingId ? Number(excludeBookingId) : undefined;

    const reservedQuantities = await getReservedQuantitiesForItems(
        [idAsNum],
        start,
        end,
        excludeIdAsNum,
        db
    );
    const reservedQuantity = reservedQuantities.get(idAsNum) ?? 0;

    // Available = Total - Reserved in overlapping bookings
    return Math.max(0, totalQuantity - reservedQuantity);
}

/**
 * Check if a booking request can be fulfilled based on time-based availability.
 */
export async function checkBookingAvailability(
    items: Array<{ itemId: string | number; qty: number; totalQty: number; name?: string }>,
    start: Date,
    end: Date,
    excludeBookingId?: string | number,
    db = getDb()
): Promise<{
    success: boolean;
    message?: string;
    unavailableItems?: Array<{ itemId: number; name: string; requested: number; available: number }>;
}> {
    const excludeIdAsNum = excludeBookingId ? Number(excludeBookingId) : undefined;
    const itemIds = items.map((item) => Number(item.itemId));
    
    const reservedQuantities = await getReservedQuantitiesForItems(
        itemIds,
        start,
        end,
        excludeIdAsNum,
        db
    );

    const unavailableItems: Array<{ itemId: number; name: string; requested: number; available: number }> = [];

    for (const item of items) {
        const idAsNum = Number(item.itemId);
        const available = Math.max(0, item.totalQty - (reservedQuantities.get(idAsNum) ?? 0));

        if (available < item.qty) {
            unavailableItems.push({
                itemId: idAsNum,
                name: item.name || 'Unknown Item',
                requested: item.qty,
                available
            });
        }
    }

    if (unavailableItems.length > 0) {
        const itemNames = unavailableItems.map(i =>
            `${i.name} (requested: ${i.requested}, available: ${i.available})`
        ).join(', ');

        return {
            success: false,
            message: `Not enough items available for the selected time slot: ${itemNames}`,
            unavailableItems
        };
    }

    return { success: true };
}
