import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function timingSafeCompare(a: string, b: string): boolean {
  const key = 'timing-safe-guard-comparison';
  const hashA = crypto.createHmac('sha256', key).update(a).digest();
  const hashB = crypto.createHmac('sha256', key).update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(req: NextRequest) {
  try {
    const { accessKey } = await req.json();

    const guardAccessKey = process.env.GUARD_ACCESS_KEY;

    if (!guardAccessKey) {
      console.error('[Auth] GUARD_ACCESS_KEY not configured');
      return NextResponse.json({ valid: false }, { status: 500 });
    }

    if (!accessKey || typeof accessKey !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const isValid = timingSafeCompare(accessKey, guardAccessKey);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('[Auth] validate-guard-key error:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
