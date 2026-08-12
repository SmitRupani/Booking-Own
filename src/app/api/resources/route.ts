import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { resources } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

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

    const db = getDb();
    const resList = await db
      .select()
      .from(resources)
      .where(and(...conditions))
      .orderBy(asc(resources.name));

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
    const db = getDb();
    const inserted = await db.insert(resources).values(body).returning();
    const resource = inserted[0];

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);

    const body = await req.json();
    const { id, name, category, location, capacity, status } = body;

    if (!id) {
      throw new ValidationError('Resource ID is required');
    }

    const db = getDb();
    const [updated] = await db
      .update(resources)
      .set({
        name,
        category: category?.toLowerCase(),
        location,
        capacity: Number(capacity) || 1,
        status: status || 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(resources.id, Number(id)))
      .returning();

    if (!updated) {
      throw new NotFoundError('Resource');
    }

    return NextResponse.json({ resource: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      throw new ValidationError('Resource ID is required');
    }

    const db = getDb();
    await db.delete(resources).where(eq(resources.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
