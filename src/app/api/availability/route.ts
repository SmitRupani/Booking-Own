import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { resources, bookings, blocks } from '@/lib/db/schema';
import { eq, and, inArray, lt, gt } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';
import { toIST, getStartOfDayUTC } from '@/lib/timezone';
import { POLICIES, loadDynamicPolicies } from '@/lib/policies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/availability
 * Returns available and busy time slots for a resource on a specific date
 */
export async function GET(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const resourceIdStr = searchParams.get('resourceId');
    const date = searchParams.get('date');

    if (!resourceIdStr || !date) {
      throw new ValidationError('resourceId and date are required');
    }

    const resourceId = Number(resourceIdStr);
    const db = getDb();

    // Verify resource exists
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource || resource.status !== 'ACTIVE') {
      throw new NotFoundError('Resource');
    }

    // Parse date and get day boundaries
    const dayStart = getStartOfDayUTC(new Date(`${date}T00:00:00+05:30`));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Build resource ids to check (include shared turf siblings)
    const resourceIds = [resourceId];
    if (resource.sharedGroupId) {
      const siblings = await db
        .select({ id: resources.id })
        .from(resources)
        .where(
          and(
            eq(resources.sharedGroupId, resource.sharedGroupId),
            eq(resources.status, 'ACTIVE')
          )
        );
      resourceIds.push(...siblings.map((s) => s.id));
    }

    // Get all active bookings for this resource on this date
    const bookingRows = await db
      .select({
        startAt: bookings.startAt,
        endAt: bookings.endAt,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.resourceId, resourceIds),
          inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
          lt(bookings.startAt, dayEnd),
          gt(bookings.endAt, dayStart)
        )
      );

    // Get all blocks for this resource on this date
    const blockRows = await db
      .select({
        startAt: blocks.startAt,
        endAt: blocks.endAt,
        reason: blocks.reason,
        type: blocks.type,
      })
      .from(blocks)
      .where(
        and(
          inArray(blocks.resourceId, resourceIds),
          lt(blocks.startAt, dayEnd),
          gt(blocks.endAt, dayStart)
        )
      );

    const formatWallClock = (d: Date) => {
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Convert bookings to busy slots
    const bookingBusySlots = bookingRows.map((booking) => {
      const startIST = toIST(new Date(booking.startAt));
      const endIST = toIST(new Date(booking.endAt));

      return {
        start: formatWallClock(startIST),
        end: formatWallClock(endIST),
        source: 'booking' as const,
      };
    });

    const blockBusySlots = blockRows.map((block) => {
      const startIST = toIST(new Date(block.startAt));
      const endIST = toIST(new Date(block.endAt));

      return {
        start: formatWallClock(startIST),
        end: formatWallClock(endIST),
        source: 'block' as const,
        reason: block.reason || 'Maintenance',
        blockType: block.type || 'MAINTENANCE',
      };
    });

    const busySlots = [...bookingBusySlots, ...blockBusySlots].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    // Working hours (dynamic via admin settings)
    const dynamicPolicies = await loadDynamicPolicies([
      'WORKING_HOURS_START',
      'WORKING_HOURS_END',
    ]);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const workingHours = {
      start: `${pad(dynamicPolicies.WORKING_HOURS_START ?? POLICIES.WORKING_HOURS_START)}:00`,
      end: `${pad(dynamicPolicies.WORKING_HOURS_END ?? POLICIES.WORKING_HOURS_END)}:00`,
    };

    return NextResponse.json({
      resourceId,
      date,
      busySlots,
      workingHours,
    });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return handleApiError(error);
  }
}
