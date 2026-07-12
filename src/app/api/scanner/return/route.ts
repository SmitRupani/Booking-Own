import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError, ValidationError } from '@/lib/errors';
import { processReturn } from '@/lib/returns';

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAuth(['GUARD', 'ADMIN']);

    const { bookingId, condition } = await req.json();

    if (!bookingId) {
      throw new ValidationError('Booking ID required');
    }

    const { booking, penaltyApplied } = await processReturn({
      bookingId: Number(bookingId),
      condition,
      notes: undefined,
      returnedBy: String(guard.id),
    });

    const itemType = 'Equipment';
    return NextResponse.json({
      success: true,
      booking,
      penaltyApplied,
      message: penaltyApplied
        ? `${itemType} returned with penalty applied`
        : `${itemType} returned successfully`,
    });
  } catch (error) {
    console.error('Return error:', error);
    return handleApiError(error);
  }
}
