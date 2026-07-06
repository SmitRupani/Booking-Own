/**
 * Lazy Expiration System
 * 
 * Triggers background cleanup tasks on-demand instead of relying on CRON jobs.
 * This is essential for Vercel Hobby plan which doesn't support CRON.
 * 
 * Tasks handled:
 * - Group booking expiration (confirm or cancel based on member count)
 * - Facility/Room auto-completion (mark as COMPLETED after end time)
 * 
 * Rate-limited to run at most once per minute to avoid performance impact.
 */

import { and, eq, lt, inArray, or, sql } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings } from './db/schema';
import { expireGroupBookings } from './groupBookingPenalties';

const LAZY_EXPIRATION_KEY = Symbol.for('__LAZY_EXPIRATION_TIMESTAMP__');
const MIN_INTERVAL_MS = 60 * 1000; // 1 minute

function getLastRunTimestamp(): number {
    return (globalThis as any)[LAZY_EXPIRATION_KEY] || 0;
}

function setLastRunTimestamp(ts: number): void {
    (globalThis as any)[LAZY_EXPIRATION_KEY] = ts;
}

/**
 * Trigger lazy expiration tasks in the background.
 * This is non-blocking and fire-and-forget.
 * Call this from high-traffic API endpoints.
 */
export function triggerLazyExpiration(): void {
    const now = Date.now();

    // Skip if we ran recently
    if (now - getLastRunTimestamp() < MIN_INTERVAL_MS) {
        return;
    }

    setLastRunTimestamp(now);

    // Run in background - don't await, don't block the request
    runExpirationTasks().catch((error) => {
        console.error('[LazyExpiration] Background task failed:', error);
    });
}

/**
 * Run all expiration tasks.
 * This is called in the background and should handle its own errors.
 */
async function runExpirationTasks(): Promise<void> {
    try {
        // Run tasks in parallel for efficiency
        await Promise.all([
            expireGroupBookings(),
            autoCompleteFacilitiesAndRooms(),
            expireEquipmentNoShows(),
        ]);
    } catch (error) {
        console.error('[LazyExpiration] Error running tasks:', error);
    }
}

/**
 * Auto-complete facility and room bookings that have ended.
 * These don't need check-in/check-out like equipment.
 */
async function autoCompleteFacilitiesAndRooms(): Promise<number> {
    const db = getDb();
    const now = new Date();

    const result = await db
        .update(bookings)
        .set({ status: 'COMPLETED', updatedAt: now })
        .where(
            and(
                eq(bookings.status, 'CONFIRMED'),
                inArray(bookings.kind, ['ROOM', 'FACILITY']),
                lt(bookings.endAt, now)
            )
        );

    const completedCount = (result as any).rowCount || 0;

    if (completedCount > 0) {
        console.log(`[LazyExpiration] Auto-completed ${completedCount} facility/room bookings`);
    }

    return completedCount;
}

/**
 * Expire equipment/library bookings that have passed the grace period without pickup.
 * This marks them as NO_SHOW without applying penalties.
 */
async function expireEquipmentNoShows(): Promise<number> {
    const { POLICIES } = await import('./policies');
    const db = getDb();
    const now = new Date();
    const gracePeriodMs = POLICIES.NO_SHOW_GRACE_MINUTES * 60 * 1000;
    const noShowCutoff = new Date(now.getTime() - gracePeriodMs);

    // Mark CONFIRMED equipment/library bookings as NO_SHOW if past grace period
    const confirmResult = await db
        .update(bookings)
        .set({ status: 'NO_SHOW', updatedAt: now })
        .where(
            and(
                eq(bookings.status, 'CONFIRMED'),
                inArray(bookings.kind, ['EQUIPMENT', 'LIBRARY']),
                sql`${bookings.checkedInAt} IS NULL`,
                or(
                    lt(bookings.startAt, noShowCutoff),
                    lt(bookings.endAt, now)
                )
            )
        );

    // Also cancel PENDING equipment bookings that have started (can't pick up anymore)
    const pendingResult = await db
        .update(bookings)
        .set({ status: 'CANCELLED', updatedAt: now })
        .where(
            and(
                eq(bookings.status, 'PENDING'),
                inArray(bookings.kind, ['EQUIPMENT', 'LIBRARY']),
                lt(bookings.startAt, now)
            )
        );

    const totalExpired = ((confirmResult as any).rowCount || 0) + ((pendingResult as any).rowCount || 0);

    if (totalExpired > 0) {
        console.log(`[LazyExpiration] Expired ${totalExpired} equipment/library bookings`);
    }

    return totalExpired;
}
