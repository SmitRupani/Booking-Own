import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { resources } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    const conditions: any[] = [eq(resources.status, 'ACTIVE')];

    if (type) {
      conditions.push(eq(resources.type, type));
    }
    if (category) {
      conditions.push(eq(resources.category, category.toLowerCase()));
    }

    const resList = await db
      .select()
      .from(resources)
      .where(and(...conditions))
      .orderBy(asc(resources.name));

    // Add _id alias for compatibility
    const resourcesWithId = resList.map((r: any) => ({
      ...r,
      _id: r.id,
    }));

    return NextResponse.json({ resources: resourcesWithId });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);

    const body = await req.json();
    const inserted = await db.insert(resources).values(body).returning();
    const resource = inserted[0];

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
