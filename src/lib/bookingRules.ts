import { and, eq, gte, lt, inArray, sql, count } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings } from './db/schema';
import { POLICIES, loadDynamicPolicies } from './policies';
import { getStartOfDayUTC, toIST } from './timezone';
import { getGroupParticipantBookings } from './groupBookingParticipation';

export type BookingCategory = 'FACILITY' | 'ROOM' | 'EQUIPMENT' | 'LIBRARY';

// Legacy hardcoded limits - kept for fallback only
export const CATEGORY_DAILY_LIMITS: Record<BookingCategory, number> = {
  FACILITY: POLICIES.MAX_FACILITY_BOOKINGS_PER_DAY,
  ROOM: POLICIES.MAX_ROOM_BOOKINGS_PER_DAY,
  EQUIPMENT: POLICIES.MAX_EQUIPMENT_BOOKINGS_PER_DAY,
  LIBRARY: POLICIES.MAX_LIBRARY_BOOKINGS_PER_DAY,
};

/**
 * Check per-user, per-category daily and monthly limits for a new booking.
 * This is intentionally conservative and only counts non-cancelled bookings.
 * 
 * NOW USES DYNAMIC POLICIES - Admin changes in settings take effect!
 */
export async function canUserCreateBookingWithCaps(options: {
  userId: string | number;
  kind: BookingCategory;
  start: Date;
  end: Date;
  session?: any; // kept for compatibility
}): Promise<{ allowed: boolean; reason?: string }> {
  const { userId, kind, start, end } = options;
  const uId = Number(userId);

  // Load dynamic policies from database (with caching)
  const dynamicPolicies = await loadDynamicPolicies([
    'MAX_FACILITY_BOOKINGS_PER_DAY',
    'MAX_ROOM_BOOKINGS_PER_DAY',
    'MAX_EQUIPMENT_BOOKINGS_PER_DAY',
    'MAX_LIBRARY_BOOKINGS_PER_DAY',
    'MAX_FACILITY_HOURS_PER_MONTH',
    'MAX_ROOM_HOURS_PER_MONTH',
    'MAX_EQUIPMENT_BORROWS_PER_MONTH',
  ]);

  // Build dynamic category limits from database values
  const categoryDailyLimits: Record<BookingCategory, number> = {
    FACILITY: dynamicPolicies.MAX_FACILITY_BOOKINGS_PER_DAY,
    ROOM: dynamicPolicies.MAX_ROOM_BOOKINGS_PER_DAY,
    EQUIPMENT: dynamicPolicies.MAX_EQUIPMENT_BOOKINGS_PER_DAY,
    LIBRARY: dynamicPolicies.MAX_LIBRARY_BOOKINGS_PER_DAY,
  };

  // Group booking participation (only relevant for facility/room limits)
  const participantBookings =
    kind === 'FACILITY' || kind === 'ROOM'
      ? await getGroupParticipantBookings(uId)
      : [];

  const db = getDb();

  // DAILY LIMITS (per category & user, based on the day of the booking start in IST)
  const startIST = toIST(start);
  const dayStart = getStartOfDayUTC(startIST);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dailyLimit = categoryDailyLimits[kind];

  if (dailyLimit && dailyLimit > 0) {
    const dailyCountResult = await db
      .select({ count: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.userId, uId),
          eq(bookings.kind, kind),
          inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
          gte(bookings.startAt, dayStart),
          lt(bookings.startAt, dayEnd)
        )
      );

    const dailyCount = dailyCountResult[0]?.count ?? 0;

    const dailyGroupCount =
      participantBookings.length === 0
        ? 0
        : participantBookings.filter(
          (b) => {
            const startIST = toIST(new Date(b.start));
            return startIST >= dayStart && startIST < dayEnd;
          }
        ).length;

    const dailyTotal = dailyCount + dailyGroupCount;

    if (dailyTotal >= dailyLimit) {
      return {
        allowed: false,
        reason: `You have reached the daily limit of ${dailyLimit} ${kind.toLowerCase()} bookings for this day.`,
      };
    }
  }

  // MONTHLY LIMITS
  const bookingStartIST = toIST(start);
  const monthStart = getStartOfDayUTC(new Date(bookingStartIST.getFullYear(), bookingStartIST.getMonth(), 1));
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const monthlyBookings = await db
    .select({
      startAt: bookings.startAt,
      endAt: bookings.endAt
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.userId, uId),
        eq(bookings.kind, kind),
        inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING', 'COMPLETED', 'RETURNED']),
        gte(bookings.startAt, monthStart),
        lt(bookings.startAt, monthEnd)
      )
    );

  const monthlyGroupBookings =
    participantBookings.length === 0
      ? []
      : participantBookings.filter(
        (b) => {
          const startIST = toIST(new Date(b.start));
          return startIST >= monthStart && startIST < monthEnd;
        }
      );

  if (kind === 'FACILITY') {
    const totalHours = [...monthlyBookings.map(b => ({ start: b.startAt, end: b.endAt })), ...monthlyGroupBookings].reduce((total, b) => {
      const hours = (new Date(b.end).getTime() - new Date(b.start).getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);

    const newHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const maxHours = dynamicPolicies.MAX_FACILITY_HOURS_PER_MONTH;
    if (totalHours + newHours > maxHours) {
      return {
        allowed: false,
        reason: `Monthly facility limit exceeded. You have used ${totalHours.toFixed(
          1,
        )} hours out of ${maxHours} hours this month.`,
      };
    }
  }

  if (kind === 'ROOM') {
    const totalHours = [...monthlyBookings.map(b => ({ start: b.startAt, end: b.endAt })), ...monthlyGroupBookings].reduce((total, b) => {
      const hours = (new Date(b.end).getTime() - new Date(b.start).getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);

    const newHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const maxHours = dynamicPolicies.MAX_ROOM_HOURS_PER_MONTH;
    if (totalHours + newHours > maxHours) {
      return {
        allowed: false,
        reason: `Monthly room limit exceeded. You have used ${totalHours.toFixed(
          1,
        )} hours out of ${maxHours} hours this month.`,
      };
    }
  }

  if (kind === 'EQUIPMENT') {
    const maxBorrows = dynamicPolicies.MAX_EQUIPMENT_BORROWS_PER_MONTH;
    if (monthlyBookings.length >= maxBorrows) {
      return {
        allowed: false,
        reason: `Monthly equipment limit exceeded. You can only borrow equipment ${maxBorrows} times per month.`,
      };
    }
  }

  return { allowed: true };
}
