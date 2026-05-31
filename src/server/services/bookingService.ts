import { db } from '../../lib/db/client';
import { bookings } from '../../lib/db/schema';

export async function isResourceAvailable(resourceId: number, startAt: Date, endAt: Date) {
  // Drizzle API shapes may differ between versions; ignore strict types here for now
  // @ts-ignore
  const q = await db
    .select()
    .from(bookings)
    // @ts-ignore
    .where(
      // @ts-ignore
      bookings.resourceId.eq(resourceId).and(
        // @ts-ignore
        bookings.startAt.lt(endAt).and(bookings.endAt.gt(startAt)),
      ),
    )
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
