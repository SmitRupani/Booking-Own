import { getNow, toIST } from './timezone';
import { POLICIES } from './policies-constants';
export { POLICIES };

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
