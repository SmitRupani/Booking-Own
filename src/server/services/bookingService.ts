import { db } from '../../lib/db/client';
import { bookings } from '../../lib/db/schema';

export async function isResourceAvailable(resourceId: number, startAt: Date, endAt: Date) {
  // Drizzle API shapes may differ between versions; ignore strict types here for now
  const q = await db
    .select()
    .from(bookings)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    .where(
      (bookings.resourceId as any).eq(resourceId).and(
        (bookings.startAt as any).lt(endAt).and((bookings.endAt as any).gt(startAt)),
      ),
    )
    /* eslint-enable @typescript-eslint/no-explicit-any */
    .limit(1);

  return q.length === 0;
}

export async function createBooking(domain: {
  resourceId: number;
  userId: number;
  startAt: Date;
  endAt: Date;
}) {
  const available = await isResourceAvailable(domain.resourceId, domain.startAt, domain.endAt);
  if (!available) throw new Error('Resource not available for the requested slot');

  const result = await db.insert(bookings).values({
    resourceId: domain.resourceId,
    userId: domain.userId,
    startAt: domain.startAt,
    endAt: domain.endAt,
  }).returning();

  return result;
}
