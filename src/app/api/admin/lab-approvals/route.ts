import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { bookings, resources, users } from '@/lib/db/schema';
import { eq, or, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);
    const db = getDb();

    const pendingList = await db
      .select({
        id: bookings.id,
        _id: bookings.id,
        resourceId: bookings.resourceId,
        resourceName: resources.name,
        resourceCategory: resources.category,
        userId: bookings.userId,
        userName: users.name,
        userEmail: users.email,
        startAt: bookings.startAt,
        start: bookings.startAt,
        endAt: bookings.endAt,
        end: bookings.endAt,
        status: bookings.status,
        approval: bookings.approval,
        items: bookings.items,
        borrowReason: bookings.borrowReason,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(resources, eq(bookings.resourceId, resources.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(or(eq(bookings.status, 'PENDING'), eq(bookings.approval, 'PENDING')))
      .orderBy(desc(bookings.createdAt));

    return NextResponse.json({ bookings: pendingList });
  } catch (error) {
    return handleApiError(error);
  }
}
