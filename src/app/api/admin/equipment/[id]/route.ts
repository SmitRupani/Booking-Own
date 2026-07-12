import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { equipmentItems, bookings } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { insertEquipmentItemSchema } from '@/lib/db/zod';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['ADMIN']);
    const { id } = await params;
    const itemId = Number(id);

    const body = await req.json();

    if ('qtyReserved' in body) {
      throw new ValidationError('Cannot directly modify reserved quantity');
    }

    const validationResult = insertEquipmentItemSchema.partial().safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed: ' + JSON.stringify(validationResult.error.flatten()));
    }

    const updatedList = await db
      .update(equipmentItems)
      .set(validationResult.data)
      .where(eq(equipmentItems.id, itemId))
      .returning();

    const item = updatedList[0];
    if (!item) {
      throw new NotFoundError('Equipment item');
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(['ADMIN']);
    const { id } = await params;
    const itemId = Number(id);

    // Check for active bookings with this item
    const activeBookings = await db
      .select({ items: bookings.items })
      .from(bookings)
      .where(inArray(bookings.status, ['PENDING', 'CONFIRMED', 'CHECKED_IN']));

    const hasActiveBooking = activeBookings.some((b: any) => {
      const items = b.items as any[];
      return items?.some((item: any) => Number(item.itemId) === itemId);
    });

    if (hasActiveBooking) {
      throw new ConflictError('Cannot delete equipment with active bookings');
    }

    const deletedList = await db
      .delete(equipmentItems)
      .where(eq(equipmentItems.id, itemId))
      .returning();

    if (deletedList.length === 0) {
      throw new NotFoundError('Equipment item');
    }

    return NextResponse.json({ success: true, message: 'Equipment item deleted' });
  } catch (error: any) {
    return handleApiError(error);
  }
}
