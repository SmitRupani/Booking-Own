import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { equipmentItems, bookings } from '@/lib/db/schema';
import { eq, and, asc, or, lte, gte, inArray } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors';
import { insertEquipmentItemSchema } from '@/lib/db/zod';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const resourceIdParam = searchParams.get('resourceId');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const resourceId = resourceIdParam ? Number(resourceIdParam) : null;

    const conditions = resourceId ? eq(equipmentItems.resourceId, resourceId) : undefined;

    const items = await db
      .select()
      .from(equipmentItems)
      .where(conditions)
      .orderBy(asc(equipmentItems.name));

    let start: Date, end: Date;
    if (startParam && endParam) {
      start = new Date(startParam);
      end = new Date(endParam);
    } else {
      const now = new Date();
      start = now;
      end = new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Fetch overlapping bookings
    const overlappingBookings = await db
      .select({
        items: bookings.items,
      })
      .from(bookings)
      .where(
        or(
          and(
            inArray(bookings.status, ['CONFIRMED', 'PENDING']),
            lte(bookings.startAt, end),
            gte(bookings.endAt, start)
          ),
          eq(bookings.status, 'CHECKED_IN')
        )
      );

    const itemsWithAvailability = items.map((item: any) => {
      let reservedQuantity = 0;
      for (const booking of overlappingBookings) {
        const bookingItems = booking.items as any[] | null;
        if (bookingItems) {
          const bookedItem = bookingItems.find((i) => Number(i.itemId) === item.id);
          if (bookedItem) {
            reservedQuantity += Number(bookedItem.qty);
          }
        }
      }

      const availableNow = Math.max(0, item.qtyTotal - reservedQuantity);

      return {
        ...item,
        _id: item.id, // For frontend compatibility
        availableNow,
        physicalStock: item.qtyAvailable,
        checkedOutCount: item.qtyTotal - item.qtyAvailable,
        qtyReserved: item.qtyReserved || 0,
      };
    });

    return NextResponse.json({ items: itemsWithAvailability });
  } catch (error) {
    console.error('Equipment fetch error:', error);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);

    const body = await req.json();
    const validationResult = insertEquipmentItemSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed: ' + JSON.stringify(validationResult.error.flatten()));
    }

    const inserted = await db.insert(equipmentItems).values(validationResult.data).returning();
    const item = inserted[0];

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(['ADMIN']);

    const body = await req.json();
    const itemId = body.id || body.itemId;
    if (!itemId) throw new ValidationError('Item ID is required');

    const validationResult = insertEquipmentItemSchema.partial().safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed: ' + JSON.stringify(validationResult.error.flatten()));
    }

    const { name, qtyTotal, qtyAvailable, safety, restricted, author, isbn, imageUrl } = validationResult.data;

    const results = await db
      .select()
      .from(equipmentItems)
      .where(eq(equipmentItems.id, Number(itemId)))
      .limit(1);

    const item = results[0];
    if (!item) throw new NotFoundError('Item');

    if (qtyTotal !== undefined && qtyTotal < item.qtyTotal) {
      const allocatedQty = item.qtyTotal - item.qtyAvailable;
      if (qtyTotal < allocatedQty) {
        throw new ValidationError('Cannot reduce total quantity below currently allocated amount.');
      }
    }

    if (qtyAvailable !== undefined && qtyAvailable > (qtyTotal ?? item.qtyTotal)) {
      throw new ValidationError('qtyAvailable cannot exceed qtyTotal');
    }

    const updatedList = await db
      .update(equipmentItems)
      .set({
        ...(name !== undefined && { name }),
        ...(qtyTotal !== undefined && { qtyTotal }),
        ...(qtyAvailable !== undefined && { qtyAvailable }),
        ...(safety !== undefined && { safety }),
        ...(restricted !== undefined && { restricted }),
        ...(author !== undefined && { author }),
        ...(isbn !== undefined && { isbn }),
        ...(imageUrl !== undefined && { imageUrl }),
      })
      .where(eq(equipmentItems.id, Number(itemId)))
      .returning();

    return NextResponse.json({ item: updatedList[0] });
  } catch (error) {
    return handleApiError(error);
  }
}
