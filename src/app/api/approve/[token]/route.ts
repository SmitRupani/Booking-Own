import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { bookings, approvalTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/guards';
import { NotFoundError, ValidationError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'approve';

  try {
    const session = await getSession();
    const approvedBy = session?.user?.id;

    await db.transaction(async (tx: any) => {
      const approvalTokenList = await tx
        .select()
        .from(approvalTokens)
        .where(eq(approvalTokens.token, token))
        .limit(1);

      const approvalToken = approvalTokenList[0];

      if (!approvalToken) throw new NotFoundError('Invalid or expired token');
      if (approvalToken.expiresAt < new Date()) throw new ValidationError('Token expired');
      if (action !== approvalToken.action) {
        throw new ValidationError(`Token action mismatch. Expected ${approvalToken.action}`);
      }

      const bookingList = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, approvalToken.bookingId))
        .limit(1);

      const booking = bookingList[0];
      if (!booking) throw new NotFoundError('Booking');

      const now = new Date();
      if (action === 'approve' && new Date(booking.startAt).getTime() - now.getTime() < 60_000) {
        throw new ValidationError('Token expired: booking is about to start');
      }

      if (booking.approval !== 'PENDING') {
        throw new ValidationError(`Booking is already ${booking.approval.toLowerCase()}`);
      }

      await tx
        .update(bookings)
        .set(
          action === 'reject'
            ? { approval: 'REJECTED', status: 'CANCELLED' }
            : {
                approval: 'APPROVED',
                status: 'CONFIRMED',
                approvedBy: approvedBy ? String(approvedBy) : null,
                approvedAt: new Date(),
              }
        )
        .where(eq(bookings.id, booking.id));

      await tx.delete(approvalTokens).where(eq(approvalTokens.bookingId, booking.id));
    });

    return new NextResponse(
      `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0b0f19; color: #ffffff;">
          <h1 style="color: ${action === 'reject' ? '#ef4444' : '#10b981'}">
            Booking ${action === 'reject' ? 'Rejected' : 'Approved'}
          </h1>
          <p style="color: #94a3b8;">The booking has been successfully processed.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const isValidationError = error instanceof ValidationError || error instanceof NotFoundError;
    const escapeHtml = (str: string): string =>
      str.replace(
        /[&<>"']/g,
        (c) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
      );

    return new NextResponse(
      `
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0b0f19; color: #ffffff;">
          <h1 style="color: #ef4444">${isValidationError ? 'Request Failed' : 'Error'}</h1>
          <p style="color: #e2e8f0;">${escapeHtml(rawMessage)}</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            If you believe this is a mistake, please contact the administrator.
          </p>
        </body>
      </html>
    `,
      {
        status: isValidationError ? 400 : 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
