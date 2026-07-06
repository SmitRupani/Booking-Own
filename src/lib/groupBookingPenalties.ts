import { and, eq, sql, inArray, sum } from 'drizzle-orm';
import { getDb } from './db/client';
import { users, penalties, groupBookings, bookings } from './db/schema';
import { POLICIES, isGroupBookingExpired } from './policies';

/**
 * Recalculate a user's penalty points and apply escalating suspensions
 * Implements three-strike system with automatic point reset
 *
 * Level 0 (Fresh): 20 points -> 7 day suspension -> Level 1, points reset
 * Level 1 (Probation): 10 points -> 10 day suspension -> Level 2, points reset
 * Level 2 (Final Warning): 10 points -> Permanent block
 */
export async function recalculatePenaltyPoints(
  userId: string | number,
  session?: any // kept for signature compatibility
): Promise<number> {
  const now = new Date();
  const uId = Number(userId);
  const db = getDb();

  // Calculate total points from non-waived AND non-served penalties
  const result = await db
    .select({ totalPoints: sum(penalties.points) })
    .from(penalties)
    .where(
      and(
        eq(penalties.userId, uId),
        sql`${penalties.waivedBy} IS NULL`,
        eq(penalties.served, false)
      )
    );

  const activePoints = Number(result[0]?.totalPoints ?? 0);

  // Get the user
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, uId));
    
  const user = userResult[0];
  if (!user) {
    return activePoints;
  }

  let userPenaltyPoints = activePoints;
  let currentLevel = user.suspensionLevel || 0;
  let userSuspensionLevel = currentLevel;
  let userBlocked = user.blocked;
  let userBlockedAt = user.blockedAt;
  let userSuspendedUntil = user.suspendedUntil;

  // Determine threshold based on current suspension level
  let threshold: number;
  let suspensionDays: number;

  switch (currentLevel) {
    case 0: // Fresh - First offense
      threshold = POLICIES.PENALTY_THRESHOLD_LEVEL_0; // 20 points
      suspensionDays = POLICIES.SUSPENSION_DURATION_LEVEL_0; // 7 days
      break;
    case 1: // Probation - Second offense
      threshold = POLICIES.PENALTY_THRESHOLD_LEVEL_1; // 10 points
      suspensionDays = POLICIES.SUSPENSION_DURATION_LEVEL_1; // 10 days
      break;
    case 2: // Final warning - Third offense = permanent block
      threshold = POLICIES.PENALTY_THRESHOLD_LEVEL_2; // 10 points
      suspensionDays = 0; // Will be blocked instead
      break;
    default:
      threshold = POLICIES.PENALTY_THRESHOLD_LEVEL_0;
      suspensionDays = POLICIES.SUSPENSION_DURATION_LEVEL_0;
  }

  // Check if user has exceeded the threshold for their current level
  if (activePoints >= threshold) {
    if (currentLevel === 2) {
      // Level 2 -> Permanent block
      userBlocked = true;
      userBlockedAt = now;
      userSuspendedUntil = null; // Clear suspension, they're blocked

      // Mark all active penalties as served
      await db
        .update(penalties)
        .set({ served: true, servedAt: now })
        .where(
          and(
            eq(penalties.userId, uId),
            eq(penalties.served, false),
            sql`${penalties.waivedBy} IS NULL`
          )
        );

      // Reset penalty points to 0 for consistency
      userPenaltyPoints = 0;
    } else {
      // Level 0 or 1 -> Suspend and escalate
      const suspensionDate = new Date(now);
      suspensionDate.setDate(suspensionDate.getDate() + suspensionDays);
      userSuspendedUntil = suspensionDate;

      // Increment suspension level
      userSuspensionLevel = currentLevel + 1;

      // Mark all active penalties as served
      await db
        .update(penalties)
        .set({ served: true, servedAt: now })
        .where(
          and(
            eq(penalties.userId, uId),
            eq(penalties.served, false),
            sql`${penalties.waivedBy} IS NULL`
          )
        );

      // Reset penalty points to 0 since all penalties are now served
      userPenaltyPoints = 0;
    }
  } else {
    // Below threshold, clear suspension if it has expired
    if (userSuspendedUntil && userSuspendedUntil < now) {
      userSuspendedUntil = null;
    }
  }

  // Save updates to User
  await db
    .update(users)
    .set({
      penaltyPoints: userPenaltyPoints,
      suspensionLevel: userSuspensionLevel,
      blocked: userBlocked,
      blockedAt: userBlockedAt,
      suspendedUntil: userSuspendedUntil,
      updatedAt: now
    })
    .where(eq(users.id, uId));

  return userPenaltyPoints;
}

/**
 * Check and expire group bookings that haven't been confirmed
 * Expires if: expiresAt has passed OR booking start time has passed
 */
export async function expireGroupBookings(): Promise<number> {
  const db = getDb();

  // Find all pending group bookings
  const pendingBookings = await db
    .select({
      id: groupBookings.id,
      bookingId: groupBookings.bookingId,
      expiresAt: groupBookings.expiresAt,
      confirmedCount: groupBookings.confirmedCount,
      requiredMinimum: groupBookings.requiredMinimum,
    })
    .from(groupBookings)
    .where(eq(groupBookings.status, 'PENDING_CONFIRMATIONS'));

  let expiredCount = 0;

  for (const gb of pendingBookings) {
    try {
      // Get booking to check start time
      const bResult = await db
        .select({
          id: bookings.id,
          startAt: bookings.startAt,
        })
        .from(bookings)
        .where(eq(bookings.id, gb.bookingId));
        
      const booking = bResult[0];
      if (!booking) {
        console.warn(`[expireGroupBookings] Booking ${gb.bookingId} not found for group booking ${gb.id}`);
        continue;
      }

      // Check if expired
      if (isGroupBookingExpired(gb.expiresAt, booking.startAt)) {
        if (gb.confirmedCount >= gb.requiredMinimum) {
          // Enough confirmations - mark as confirmed
          await db
            .update(groupBookings)
            .set({ status: 'CONFIRMED', updatedAt: new Date() })
            .where(eq(groupBookings.id, gb.id));

          await db
            .update(bookings)
            .set({ status: 'CONFIRMED', updatedAt: new Date() })
            .where(eq(bookings.id, gb.bookingId));
        } else {
          // Not enough confirmations - cancel
          await db
            .update(groupBookings)
            .set({ status: 'EXPIRED', updatedAt: new Date() })
            .where(eq(groupBookings.id, gb.id));

          await db
            .update(bookings)
            .set({ status: 'CANCELLED', updatedAt: new Date() })
            .where(eq(bookings.id, gb.bookingId));

          expiredCount++;
        }
      }
    } catch (error) {
      console.error(`[expireGroupBookings] Failed to process group booking ${gb.id}:`, error);
    }
  }

  return expiredCount;
}
