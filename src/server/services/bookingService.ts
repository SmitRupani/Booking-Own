import { getDb } from '../../lib/db/client';
import { bookings } from '../../lib/db/schema';
import { and, eq, gt, lt } from 'drizzle-orm';

export async function isResourceAvailable(resourceId: number, startAt: Date, endAt: Date) {
  const db = getDb();
  const q = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.resourceId, resourceId), lt(bookings.startAt, endAt), gt(bookings.endAt, startAt)))
    .limit(1);

  return q.length === 0;
}

export async function createBooking(domain: {
  resourceId: number;
  userId: number;
  startAt: Date;
  endAt: Date;
  kind?: string;
}) {
  const db = getDb();
  const available = await isResourceAvailable(domain.resourceId, domain.startAt, domain.endAt);
  if (!available) throw new Error('Resource not available for the requested slot');

  const result = await db
    .insert(bookings)
    .values({
      resourceId: domain.resourceId,
      userId: domain.userId,
      startAt: domain.startAt,
      endAt: domain.endAt,
      kind: domain.kind || 'FACILITY',
    })
    .returning();

  return result;
}
