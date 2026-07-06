import { and, eq, gt, lt, inArray, sql, ne } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings, equipmentItems } from './db/schema';

export const SPORT_CATEGORIES = {
    BADMINTON: 'BADMINTON',
    BASKETBALL: 'BASKETBALL',
    CRICKET: 'CRICKET',
    FOOTBALL: 'FOOTBALL',
    TABLE_TENNIS: 'TABLE_TENNIS',
    VOLLEYBALL: 'VOLLEYBALL',
    TENNIS: 'TENNIS',
    GENERAL: 'GENERAL',
} as const;

export type SportCategory = typeof SPORT_CATEGORIES[keyof typeof SPORT_CATEGORIES];

/**
 * Get the sport categories for equipment items in a booking
 */
export async function getItemsSportCategories(
    itemIds: number[]
): Promise<Set<SportCategory>> {
    if (itemIds.length === 0) {
        return new Set();
    }

    const db = getDb();
    const items = await db
        .select({ sportCategory: equipmentItems.sportCategory })
        .from(equipmentItems)
        .where(inArray(equipmentItems.id, itemIds));

    const categories = new Set<SportCategory>();

    for (const item of items) {
        if (item.sportCategory) {
            categories.add(item.sportCategory as SportCategory);
        }
    }

    return categories;
}

/**
 * Check if user can borrow equipment from a new sport category
 * based on their active bookings.
 */
export async function canBorrowSportCategory(options: {
    userId: string | number;
    requestedItemIds: number[];
    start: Date;
    end: Date;
}): Promise<{
    allowed: boolean;
    reason?: string;
    conflictingSport?: string;
    activeBookingIds?: number[];
    totalOverlappingItems: number;
}> {
    const { userId, requestedItemIds, start, end } = options;
    const uId = Number(userId);

    // Get sport categories for the requested items
    const requestedCategories = await getItemsSportCategories(requestedItemIds);

    // Remove GENERAL category as it doesn't conflict
    requestedCategories.delete(SPORT_CATEGORIES.GENERAL);

    // If no sport-specific categories, allow
    if (requestedCategories.size === 0) {
        return { allowed: true, totalOverlappingItems: 0 };
    }

    // Check if user is trying to borrow from multiple sports in one booking
    if (requestedCategories.size > 1) {
        const sports = Array.from(requestedCategories).join(', ');
        return {
            allowed: false,
            reason: `Cannot borrow equipment from multiple sports in one booking (${sports}). Please create separate bookings.`,
            totalOverlappingItems: 0,
        };
    }

    // Get the single sport category being requested
    const [requestedSport] = Array.from(requestedCategories);

    const db = getDb();

    // Find OVERLAPPING equipment bookings for this user
    const overlappingBookings = await db
        .select({ id: bookings.id, items: bookings.items })
        .from(bookings)
        .where(
            and(
                eq(bookings.userId, uId),
                eq(bookings.kind, 'EQUIPMENT'),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
                lt(bookings.startAt, end),
                gt(bookings.endAt, start)
            )
        );

    // Calculate total items from overlapping bookings
    let totalOverlappingItems = 0;

    // Collect ALL item IDs from overlapping bookings in one pass
    const allOverlappingItemIds: number[] = [];
    const bookingItemMap = new Map<number, number[]>(); // bookingId -> itemIds

    for (const booking of overlappingBookings) {
        const items = booking.items as Array<{ itemId: string | number; qty: number }> | null;
        if (items && items.length > 0) {
            totalOverlappingItems += items.reduce((sum, item) => sum + (item.qty || 0), 0);
            const ids = items.map((item) => Number(item.itemId));
            allOverlappingItemIds.push(...ids);
            bookingItemMap.set(booking.id, ids);
        }
    }

    // Batch-fetch sport categories for ALL overlapping items in one query
    if (allOverlappingItemIds.length > 0) {
        const uniqueIds = [...new Set(allOverlappingItemIds)];
        const items = await db
            .select({ id: equipmentItems.id, sportCategory: equipmentItems.sportCategory })
            .from(equipmentItems)
            .where(inArray(equipmentItems.id, uniqueIds));

        const categoryByItemId = new Map(
            items.map((item) => [item.id, item.sportCategory as SportCategory | null])
        );

        // Check each overlapping booking for conflicting sport categories
        for (const booking of overlappingBookings) {
            const itemIds = bookingItemMap.get(booking.id);
            if (!itemIds) continue;

            for (const itemId of itemIds) {
                const cat = categoryByItemId.get(itemId);
                if (cat && cat !== SPORT_CATEGORIES.GENERAL && cat !== requestedSport) {
                    return {
                        allowed: false,
                        reason: `You have an overlapping ${cat} equipment booking during this time. You can only borrow from one sport at a time.`,
                        conflictingSport: cat,
                        activeBookingIds: [booking.id],
                        totalOverlappingItems,
                    };
                }
            }
        }
    }

    return { allowed: true, totalOverlappingItems };
}

/**
 * Get a user-friendly display name for a sport category
 */
export function getSportCategoryDisplayName(category: SportCategory): string {
    const displayNames: Record<SportCategory, string> = {
        BADMINTON: 'Badminton',
        BASKETBALL: 'Basketball',
        CRICKET: 'Cricket',
        FOOTBALL: 'Football',
        TABLE_TENNIS: 'Table Tennis',
        VOLLEYBALL: 'Volleyball',
        TENNIS: 'Tennis',
        GENERAL: 'General',
    };

    return displayNames[category] || category;
}

/**
 * Best-effort mapping from facility/resource name to sport category.
 */
export function getFacilitySportCategory(resourceName?: string): SportCategory | null {
    if (!resourceName) return null;
    const name = resourceName.toLowerCase();

    if (name.includes('table tennis')) return SPORT_CATEGORIES.TABLE_TENNIS;
    if (name.includes('basketball')) return SPORT_CATEGORIES.BASKETBALL;
    if (name.includes('volleyball')) return SPORT_CATEGORIES.VOLLEYBALL;
    if (name.includes('turf')) return SPORT_CATEGORIES.FOOTBALL;
    if (name.includes('cricket')) return SPORT_CATEGORIES.CRICKET;

    return null;
}
