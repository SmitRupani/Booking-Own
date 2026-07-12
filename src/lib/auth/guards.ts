import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthenticationError, AuthorizationError } from '@/lib/errors';
import crypto from 'crypto';

export type UserRole = 'STUDENT' | 'ADMIN' | 'GUARD';

function timingSafeCompare(a: string, b: string): boolean {
  const key = 'timing-safe-guard-session-verify';
  const hashA = crypto.createHmac('sha256', key).update(a).digest();
  const hashB = crypto.createHmac('sha256', key).update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyGuardSessionCookie(
  token: string,
  guardAccessKey: string
): { id: number; role: string } | null {
  try {
    const dotIndex = token.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payloadB64 = token.substring(0, dotIndex);
    const sig = token.substring(dotIndex + 1);

    const expectedSig = crypto
      .createHmac('sha256', guardAccessKey)
      .update(payloadB64)
      .digest('base64url');

    if (!timingSafeCompare(sig, expectedSig)) return null;

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    if (!payload.exp || payload.exp < Date.now()) return null;
    if (payload.role !== 'GUARD') return null;

    return { id: Number(payload.id), role: payload.role };
  } catch {
    return null;
  }
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  // ── 1. Try Clerk auth first ──────────────────────────────────────────────
  try {
    const clerkUser = await currentUser();

    if (clerkUser) {
      const email = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress;

      if (!email) throw new AuthenticationError('No email found');

      const results = await db
        .select({
          id: users.id,
          role: users.role,
          suspendedUntil: users.suspendedUntil,
          penaltyPoints: users.penaltyPoints,
          blocked: users.blocked,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const dbUser = results[0];

      if (!dbUser) {
        throw new AuthenticationError(
          'User not found. Please contact administrator.'
        );
      }

      if (dbUser.blocked) {
        throw new AuthorizationError(
          'Your account has been permanently blocked due to repeated policy violations. Please contact support.'
        );
      }

      if (dbUser.suspendedUntil && dbUser.suspendedUntil > new Date()) {
        const suspendedUntil = new Date(
          dbUser.suspendedUntil
        ).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        throw new AuthorizationError(
          `Your account is suspended until ${suspendedUntil} as you have reached the penalty point threshold.`
        );
      }

      if (allowedRoles && !allowedRoles.includes(dbUser.role as UserRole)) {
        throw new AuthorizationError();
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as UserRole,
        penaltyPoints: dbUser.penaltyPoints,
        suspendedUntil: dbUser.suspendedUntil,
      };
    }
  } catch (err) {
    if (
      err instanceof AuthorizationError ||
      err instanceof AuthenticationError
    ) {
      throw err;
    }
  }

  // ── 2. Fall back to guard session cookie ────────────────────────────────
  const guardAccessKey = process.env.GUARD_ACCESS_KEY;
  if (!guardAccessKey) throw new AuthenticationError();

  const cookieStore = await cookies();
  const guardSession = cookieStore.get('guard_session')?.value;

  if (!guardSession) throw new AuthenticationError();

  const sessionPayload = verifyGuardSessionCookie(guardSession, guardAccessKey);
  if (!sessionPayload) throw new AuthenticationError();

  if (allowedRoles && !allowedRoles.includes(sessionPayload.role as UserRole)) {
    throw new AuthorizationError();
  }

  const results = await db
    .select({
      id: users.id,
      role: users.role,
      suspendedUntil: users.suspendedUntil,
      penaltyPoints: users.penaltyPoints,
      blocked: users.blocked,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, sessionPayload.id))
    .limit(1);

  const dbUser = results[0];

  if (!dbUser) throw new AuthenticationError('Guard user not found');
  if (dbUser.blocked) throw new AuthorizationError('Account is blocked');
  if (dbUser.role !== 'GUARD') throw new AuthorizationError();

  if (allowedRoles && !allowedRoles.includes(dbUser.role as UserRole)) {
    throw new AuthorizationError();
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role as UserRole,
    penaltyPoints: dbUser.penaltyPoints,
    suspendedUntil: dbUser.suspendedUntil,
  };
}

export async function getSession() {
  try {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const email = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress;
      if (!email) return null;

      const results = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const dbUser = results[0];
      if (!dbUser) return null;

      return {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role as UserRole,
        },
      };
    }
  } catch {
    // fall through
  }

  const guardAccessKey = process.env.GUARD_ACCESS_KEY;
  if (!guardAccessKey) return null;

  try {
    const cookieStore = await cookies();
    const guardSession = cookieStore.get('guard_session')?.value;
    if (!guardSession) return null;

    const sessionPayload = verifyGuardSessionCookie(
      guardSession,
      guardAccessKey
    );
    if (!sessionPayload) return null;

    const results = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, sessionPayload.id))
      .limit(1);

    const dbUser = results[0];
    if (!dbUser || dbUser.role !== 'GUARD') return null;

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role as UserRole,
      },
    };
  } catch {
    return null;
  }
}
