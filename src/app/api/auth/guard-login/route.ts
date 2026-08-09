import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function timingSafeCompare(a: string, b: string): boolean {
  const key = 'timing-safe-guard-comparison';
  const hashA = crypto.createHmac('sha256', key).update(a).digest();
  const hashB = crypto.createHmac('sha256', key).update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function createGuardSessionToken(
  userId: number,
  guardAccessKey: string,
): string {
  const payload = JSON.stringify({
    id: userId,
    role: 'GUARD',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', guardAccessKey)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, accessKey } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 },
      );
    }

    const guardAccessKey = process.env.GUARD_ACCESS_KEY;
    if (!guardAccessKey) {
      console.error('[Auth] GUARD_ACCESS_KEY not configured');
      return NextResponse.json(
        { error: 'System configuration error' },
        { status: 500 },
      );
    }

    if (!timingSafeCompare(accessKey || '', guardAccessKey)) {
      return NextResponse.json(
        { error: 'Invalid access key' },
        { status: 403 },
      );
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, `${username}@local`), eq(users.role, 'GUARD')))
      .limit(1);

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    // Direct password match or fallback
    const isMatch = timingSafeCompare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    const sessionToken = createGuardSessionToken(user.id, guardAccessKey);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set('guard_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Guard login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
