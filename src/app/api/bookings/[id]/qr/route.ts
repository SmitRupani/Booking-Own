import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { bookings, qrTokens } from '@/lib/db/schema';
import { eq, and, or, lt } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import { generateQRToken, generateQRCodeImage } from '@/lib/qr';
import { POLICIES } from '@/lib/policies-constants';
import {
  handleApiError,
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const bookingId = Number(id);

    if (isNaN(bookingId)) {
      throw new ValidationError('Invalid booking ID');
    }

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      // Check ownership
      if (booking.userId !== user.id && user.role !== 'ADMIN') {
        throw new AuthorizationError('You do not have permission to view QR for this booking');
      }

      // Check if booking is confirmed
      if (booking.status === 'PENDING' && booking.approval !== 'APPROVED') {
        throw new ValidationError('Booking is pending admin approval');
      }

      if (!['CONFIRMED', 'PENDING', 'CHECKED_IN'].includes(booking.status)) {
        throw new ValidationError(
          `Cannot generate QR code. Booking status is ${booking.status}`
        );
      }

      const now = new Date();
      const expiryMinutes = POLICIES.QR_EQUIPMENT_PICKUP_WINDOW || 30;
      const token = generateQRToken(booking.id, user.id, expiryMinutes);
      const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

      // Invalidate previous unused active tokens
      await tx
        .delete(qrTokens)
        .where(
          and(
            eq(qrTokens.bookingId, booking.id),
            or(eq(qrTokens.used, true), lt(qrTokens.expiresAt, now))
          )
        );

      await tx.insert(qrTokens).values({
        bookingId: booking.id,
        userId: user.id,
        token,
        expiresAt,
        used: false,
      });

      await tx
        .update(bookings)
        .set({ qrIssued: true })
        .where(eq(bookings.id, booking.id));

      return {
        token,
        expiresAt,
      };
    });

    const qrImage = await generateQRCodeImage(result.token);

    return NextResponse.json(
      {
        token: result.token,
        qrImage,
        expiresAt: result.expiresAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('QR generation error:', error);
    return handleApiError(error);
  }
}
