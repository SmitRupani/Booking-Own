import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    const user = await requireAuth();
    
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      penaltyPoints: user.penaltyPoints,
      suspendedUntil: user.suspendedUntil,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
