import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { equipmentItems, resources } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const { isbn } = await req.json();

    if (!isbn) {
      throw new ValidationError('ISBN is required');
    }

    const normalizedIsbn = isbn.replace(/[-\s]/g, '');

    const bookList = await db
      .select()
      .from(equipmentItems)
      .where(eq(equipmentItems.isbn, normalizedIsbn))
      .limit(1);

    const book = bookList[0];
    if (!book) {
      throw new NotFoundError('Book with this ISBN not found in library');
    }

    const resourceList = await db
      .select()
      .from(resources)
      .where(eq(resources.id, book.resourceId))
      .limit(1);

    const resource = resourceList[0];
    if (!resource || resource.type !== 'LIBRARY') {
      throw new NotFoundError('Book resource not found');
    }

    return NextResponse.json({
      book: {
        id: book.id,
        _id: book.id, // Compatibility
        name: book.name,
        author: book.author,
        isbn: book.isbn,
        imageUrl: book.imageUrl,
        qtyTotal: book.qtyTotal,
        qtyAvailable: book.qtyAvailable,
        resourceId: book.resourceId,
        resourceName: resource.name,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
