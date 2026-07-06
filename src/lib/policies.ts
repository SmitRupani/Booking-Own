// System-wide booking policies and rules
import { getNow, toIST } from './timezone';

// Cache for runtime policy values (refreshed from DB)
let policyCache: Map<string, number> | null = null;
let policyCacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a policy value with DB override support.
 * Checks the database for runtime-configured values, falls back to hardcoded defaults.
 * Uses an in-memory cache to avoid repeated DB queries.
 */
export async function getPolicyValue(key: keyof typeof POLICIES): Promise<number> {
  const now = Date.now();

  // Refresh cache if expired or not initialized
  if (!policyCache || now > policyCacheExpiry) {
    try {
      // Dynamic import to avoid circular dependencies
      const { getDb } = await import('./db/client');
      const { systemConfig } = await import('./db/schema');
      const db = getDb();

      const configs = await db.select().from(systemConfig);
      policyCache = new Map(configs.map((c: any) => [c.key, c.value]));
      policyCacheExpiry = now + CACHE_TTL_MS;
    } catch (error) {
      console.error('[Policies] Failed to refresh cache:', error);
      // On error, continue with defaults but don't cache permanently
      if (!policyCache) {
        policyCache = new Map();
      }
      policyCacheExpiry = now + 30000; // Retry in 30 seconds
    }
  }

  // Return cached value or fall back to default
  return policyCache?.get(key) ?? (POLICIES[key] as number);
}

/**
 * Synchronous version using cached values only.
 * Use this when you can't await, but be aware it may return stale values.
 */
export function getPolicyValueSync(key: keyof typeof POLICIES): number {
  return policyCache?.get(key) ?? (POLICIES[key] as number);
}

/**
 * Force refresh the policy cache (call this after admin updates policies)
 */
export async function refreshPolicyCache(): Promise<void> {
  policyCacheExpiry = 0; // Force refresh on next access
  await getPolicyValue('MAX_FACILITY_BOOKINGS_PER_DAY'); // Trigger refresh
}

/**
 * Load multiple dynamic policy values at once.
 * More efficient than individual getPolicyValue calls when you need many values.
 * Returns an object with the policy keys as properties.
 */
export async function loadDynamicPolicies<K extends keyof typeof POLICIES>(
  keys: K[]
): Promise<{ [P in K]: number }> {
  // Ensure cache is fresh
  const now = Date.now();
  if (!policyCache || now > policyCacheExpiry) {
    await getPolicyValue(keys[0]); // This triggers cache refresh
  }

  const result = {} as { [P in K]: number };
  for (const key of keys) {
    result[key] = policyCache?.get(key) ?? (POLICIES[key] as number);
  }
  return result;
}

export const POLICIES = {
  // Booking limits
  MAX_ACTIVE_FACILITIES: 2,
  MAX_ACTIVE_ROOMS: 1,

  MAX_SPORTS_EQUIPMENT_ITEMS_PER_BOOKING: 3,
  MAX_LAB_EQUIPMENT_ITEMS_PER_BOOKING: 1,

  // Daily limits (per type - more granular control)
  MAX_FACILITY_BOOKINGS_PER_DAY: 3,   // Max 3 facility bookings per day
  MAX_ROOM_BOOKINGS_PER_DAY: 2,       // Max 2 room bookings per day
  MAX_EQUIPMENT_BOOKINGS_PER_DAY: 5,  // Max 5 equipment borrows per day
  MAX_LIBRARY_BOOKINGS_PER_DAY: 1,    // Max 1 library borrow per day (matches MAX_BOOKS_PER_STUDENT)
  MAX_TOTAL_ACTIVE_BOOKINGS: 3, // Max 3 active bookings across all types

  // Monthly limits (hours)
  MAX_FACILITY_HOURS_PER_MONTH: 15, // 15 hours of facility time per month
  MAX_ROOM_HOURS_PER_MONTH: 8,      // 8 hours of room time per month
  MAX_EQUIPMENT_BORROWS_PER_MONTH: 20, // 20 equipment borrows per month

  // Consecutive booking prevention
  MIN_GAP_BETWEEN_BOOKINGS_MINUTES: 0, // Gap removed to allow back-to-back bookings
  MAX_CONSECUTIVE_SLOTS: 2, // Can't book more than 2 consecutive slots for same resource type

  // Dynamic slot booking constraints (global defaults)
  MIN_BOOKING_DURATION_MINUTES: 15, // Minimum 15 minutes per booking
  MAX_BOOKING_DURATION_MINUTES: 120, // Maximum 2 hours per booking
  WORKING_HOURS_START: 8, // 8 AM IST
  WORKING_HOURS_END: 20,  // 8 PM IST

  // Per-type duration defaults: Facilities
  MIN_DURATION_FACILITY: 15,
  MAX_DURATION_FACILITY: 120,
  HOURS_START_FACILITY: 8,
  HOURS_END_FACILITY: 20,

  // Per-type duration defaults: Rooms
  MIN_DURATION_ROOM: 15,
  MAX_DURATION_ROOM: 120,
  HOURS_START_ROOM: 8,
  HOURS_END_ROOM: 20,

  // Per-type duration defaults: Sports Equipment
  MIN_DURATION_SPORTS: 15,
  MAX_DURATION_SPORTS: 120, // align with facility max duration
  HOURS_START_SPORTS: 8,
  HOURS_END_SPORTS: 20,

  // Per-type duration defaults: Lab Equipment (now dynamic: 1 hour to 7 days)
  MIN_DURATION_LAB: 60,       // 1 hour minimum
  MAX_DURATION_LAB: 10080,    // 7 days maximum (in minutes)
  HOURS_START_LAB: 8,
  HOURS_END_LAB: 20,

  // Cancellation limits
  LATE_CANCELLATION_HOURS: 24,  // Cancel within 24h of start = late cancellation

  // Advance booking window
  ADVANCE_BOOKING_DAYS: 7,

  // Slot durations (minutes) - legacy, kept for compatibility
  FACILITY_SLOT_MINUTES: 60,
  ROOM_SLOT_MINUTES: 60,
  SPORTS_EQUIPMENT_BORROW_MINUTES: 120,   // Up to 120 minutes for sports equipment (matches facility cap)
  LAB_EQUIPMENT_BORROW_MINUTES: 10080,    // Up to 7 days for lab equipment
  LIBRARY_BOOK_BORROW_MINUTES: 20160, // 14 days for library books

  // Equipment extension rules
  MAX_EQUIPMENT_EXTENSION_MINUTES: 60, // Max 60 mins extension per booking
  MAX_EXTENSIONS_PER_BOOKING: 1,       // Only 1 extension allowed per booking

  // Auto-cancel timings
  NO_SHOW_GRACE_MINUTES: 30,  // 30 minutes grace period before marking as no-show/cancelled

  // QR validity windows (minutes)
  QR_VALIDITY_BEFORE_START: 15, // Can generate QR 15 min before booking start
  QR_VALIDITY_AFTER_START: 30,  // Can generate QR up to 30 min after booking start (matches grace period)
  QR_EQUIPMENT_PICKUP_WINDOW: 10, // QR expires 10 min after generation

  // Reschedule policies
  MAX_RESCHEDULE_PER_BOOKING: 1,           // Only 1 reschedule per booking
  MAX_RESCHEDULE_PER_MONTH: 3,             // Max 3 reschedules per month
  RESCHEDULE_PENALTY_POINTS: 0,            // No penalty for reschedule (keeps slot filled, better than cancel)
  RESCHEDULE_BLOCK_WINDOW_HOURS: 2,        // Cannot reschedule within 2 hours

  // Penalties
  // System uses 4x multiplier: 0.25 points = 1, 0.5 points = 2, 1 point = 4, 2 points = 8
  PENALTY_NO_SHOW: 4,          // 1 point
  PENALTY_LATE_RETURN: 4,      // 1 point
  PENALTY_DAMAGE: 8,           // 2 points
  PENALTY_CANCELLATION: 0,     // No penalty for early cancellation
  PENALTY_LATE_CANCELLATION: 2, // 0.5 points (late cancellation within 24h of start)
  PENALTY_BOOK_LATE_RETURN: 8, // 2 points
  PENALTY_BOOK_NO_PICKUP: 2,   // 0.5 points

  // Escalating penalty system (Three-Strike System)
  PENALTY_THRESHOLD_LEVEL_0: 20,  // First offense threshold
  PENALTY_THRESHOLD_LEVEL_1: 10,  // Second offense threshold
  PENALTY_THRESHOLD_LEVEL_2: 10,  // Third offense threshold -> Ban
  SUSPENSION_DURATION_LEVEL_0: 7,  // 7 days for first suspension
  SUSPENSION_DURATION_LEVEL_1: 10, // 10 days for second suspension

  // Legacy alias kept for calculateSuspensionDate()
  SUSPENSION_DAYS: 7,

  // Special rules
  SHARED_TURF_GROUP_ID: 'TURF-1', // Football & Cricket share this
  LAB_EQUIPMENT_REQUIRES_APPROVAL: true,

  // Library rules
  MAX_BOOKS_PER_STUDENT: 1, // Only 1 book at a time
  LIBRARY_BOOK_PICKUP_WINDOW_HOURS: 24, // Must pick up within 24 hours

  // Group booking rules
  GROUP_BOOKING_MIN_MEMBERS: 6, // Minimum 6 people for team sports
  GROUP_BOOKING_MIN_REPLY_TIME_HOURS: 10 / 60, // 10 minutes for friends to respond (0.167 hours) - LEGACY
  GROUP_BOOKING_FINALIZATION_CUTOFF_HOURS: 5 / 60, // Group must be finalized at least 5 minutes before booking start - LEGACY
  GROUP_BOOKING_REPLY_TIME_MINUTES: 10, // 10 minutes for friends to respond
  GROUP_BOOKING_CUTOFF_MINUTES: 5, // Must be confirmed 5 minutes before start
  GROUP_BOOKING_TEAM_SPORTS: ['Main Turf', 'Basketball Court', 'Volleyball Court'], // Sports that require groups
} as const;

export function canUserBook(user: {
  penaltyPoints: number;
  suspendedUntil?: Date | null;
  blocked?: boolean | null;  // Add blocked field to properly reject permanently blocked users
}): { allowed: boolean; reason?: string } {
  // Check if user is permanently blocked first (takes precedence over suspension)
  if (user.blocked) {
    return {
      allowed: false,
      reason: 'Your account has been permanently blocked. You cannot make new bookings.',
    };
  }

  // Compare using UTC to match stored DB timestamps
  if (user.suspendedUntil && new Date() < new Date(user.suspendedUntil)) {
    return {
      allowed: false,
      reason: `You are suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}`,
    };
  }

  if (user.penaltyPoints >= POLICIES.PENALTY_THRESHOLD_LEVEL_0) {
    return {
      allowed: false,
      reason: `You have ${user.penaltyPoints} penalty points. Maximum allowed is ${POLICIES.PENALTY_THRESHOLD_LEVEL_0 - 1}.`,
    };
  }

  return { allowed: true };
}

export function calculateSuspensionDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + POLICIES.SUSPENSION_DAYS);
  return date;
}

export function isWithinAdvanceWindow(startDate: Date): boolean {
  const now = getNow();
  const maxDate = getNow();
  maxDate.setDate(maxDate.getDate() + POLICIES.ADVANCE_BOOKING_DAYS);

  const startDateIST = toIST(startDate);

  return startDateIST >= now && startDateIST <= maxDate;
}

export function calculateTotalHours(bookings: Array<{ start: Date; end: Date }>): number {
  return bookings.reduce((total, booking) => {
    const hours = (new Date(booking.end).getTime() - new Date(booking.start).getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);
}

export function hasConsecutiveBookings(
  existingBookings: Array<{ start: Date; end: Date; resourceId: number }>,
  newStart: Date,
  newEnd: Date,
  resourceId: number
): boolean {
  // Get bookings for same resource, sorted by start time
  const sameResourceBookings = existingBookings
    .filter(b => Number(b.resourceId) === Number(resourceId))
    .map(b => ({
      start: toIST(new Date(b.start)).getTime(),
      end: toIST(new Date(b.end)).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  if (sameResourceBookings.length === 0) {
    return false; // No existing bookings, new one is fine
  }

  const newStartTime = toIST(new Date(newStart)).getTime();
  const newEndTime = toIST(new Date(newEnd)).getTime();
  const CONSECUTIVE_THRESHOLD = 60000; // 1 minute in milliseconds

  // Build the full chain by starting from the new booking and expanding in both directions
  const chain: Array<{ start: number; end: number }> = [
    { start: newStartTime, end: newEndTime }
  ];

  let changed = true;
  while (changed) {
    changed = false;

    for (const existing of sameResourceBookings) {
      const chainStart = chain[0];
      if (Math.abs(existing.end - chainStart.start) < CONSECUTIVE_THRESHOLD) {
        if (!chain.some(c => c.start === existing.start && c.end === existing.end)) {
          chain.unshift(existing);
          changed = true;
        }
      }

      const chainEnd = chain[chain.length - 1];
      if (Math.abs(chainEnd.end - existing.start) < CONSECUTIVE_THRESHOLD) {
        if (!chain.some(c => c.start === existing.start && c.end === existing.end)) {
          chain.push(existing);
          changed = true;
        }
      }
    }
  }

  return chain.length > POLICIES.MAX_CONSECUTIVE_SLOTS;
}

export async function calculateGroupBookingExpiration(
  bookingStart: Date,
  createdAt: Date = getNow()
): Promise<Date> {
  const startDate = new Date(bookingStart);
  const creationTime = new Date(createdAt);

  const [cutoffMinutes, replyMinutes] = await Promise.all([
    getPolicyValue('GROUP_BOOKING_CUTOFF_MINUTES'),
    getPolicyValue('GROUP_BOOKING_REPLY_TIME_MINUTES'),
  ]);

  const expirationFromCreation = new Date(
    creationTime.getTime() + (replyMinutes + cutoffMinutes) * 60 * 1000
  );

  const latestPossibleExpiration = new Date(
    startDate.getTime() - cutoffMinutes * 60 * 1000
  );

  return expirationFromCreation < latestPossibleExpiration
    ? expirationFromCreation
    : latestPossibleExpiration;
}

export async function canCreateGroupBooking(bookingStart: Date): Promise<{ allowed: boolean; reason?: string }> {
  const startDate = toIST(new Date(bookingStart));
  const now = getNow();

  const [cutoffMinutes, replyMinutes] = await Promise.all([
    getPolicyValue('GROUP_BOOKING_CUTOFF_MINUTES'),
    getPolicyValue('GROUP_BOOKING_REPLY_TIME_MINUTES'),
  ]);

  const minRequiredMinutes = cutoffMinutes + replyMinutes;
  const minRequiredMs = minRequiredMinutes * 60 * 1000;
  const timeUntilStart = startDate.getTime() - now.getTime();

  if (timeUntilStart < minRequiredMs) {
    return {
      allowed: false,
      reason: `Group bookings must be created at least ${minRequiredMinutes} minutes before the start time to allow friends time to respond.`,
    };
  }

  return { allowed: true };
}

export function isGroupBookingExpired(expiresAt: Date, bookingStart: Date): boolean {
  const now = getNow();
  const expiresDate = toIST(new Date(expiresAt));
  const startDate = toIST(new Date(bookingStart));

  return now > expiresDate || now >= startDate;
}
