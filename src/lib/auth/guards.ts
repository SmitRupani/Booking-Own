import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db/client';
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

/**
 * Ensures an authenticated Clerk user has a corresponding row in the database.
 * Auto-provisions the user if they belong to an allowed domain, and dynamically elevates ADMIN role.
 */
async function getOrProvisionClerkUser(clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>) {
  const db = getDb();
  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    redirect('/login');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = normalizedEmail.split('@')[1] || '';
  const allowedStudentDomain = (process.env.ALLOWED_STUDENT_DOMAIN || 'sst.scaler.com').toLowerCase();
  const allowedAdminDomain = (process.env.ALLOWED_ADMIN_DOMAIN || 'scaler.com').toLowerCase();
  const validDomains = [allowedStudentDomain, allowedAdminDomain, 'sst.scaler.com', 'scaler.com'];

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isExplicitAdmin = adminEmails.includes(normalizedEmail);
  const isAdminDomain = emailDomain === allowedAdminDomain || emailDomain === 'scaler.com';
  const targetRole: UserRole = isExplicitAdmin || isAdminDomain ? 'ADMIN' : 'STUDENT';

  // 1. Check if user already exists
  const existing = await db
    .select({
      id: users.id,
      role: users.role,
      suspendedUntil: users.suspendedUntil,
      penaltyPoints: users.penaltyPoints,
      blocked: users.blocked,
      email: users.email,
      name: users.name,
      clerkId: users.clerkId,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  let dbUser = existing[0];

  // 2. If user does not exist in DB, auto-provision
  if (!dbUser) {
    const isDev = process.env.NODE_ENV !== 'production';
    const isAllowedDomain = validDomains.includes(emailDomain);

    if (!isAllowedDomain && !isDev) {
      redirect('/login?error=invalid_domain');
    }

    const displayName =
      clerkUser.fullName ||
      (clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null) ||
      normalizedEmail.split('@')[0];

    const [newUser] = await db
      .insert(users)
      .values({
        name: displayName,
        email: normalizedEmail,
        role: targetRole,
        penaltyPoints: 0,
        clerkId: clerkUser.id,
      })
      .returning({
        id: users.id,
        role: users.role,
        suspendedUntil: users.suspendedUntil,
        penaltyPoints: users.penaltyPoints,
        blocked: users.blocked,
        email: users.email,
        name: users.name,
        clerkId: users.clerkId,
      });

    dbUser = newUser;
  } else {
    // 3. Sync role strictly based on ADMIN_EMAILS and domain
    const shouldUpdateRole = dbUser.role !== targetRole && dbUser.role !== 'GUARD';
    const shouldUpdateClerkId = !dbUser.clerkId && !!clerkUser.id;

    if (shouldUpdateRole || shouldUpdateClerkId) {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...(shouldUpdateRole ? { role: targetRole } : {}),
          ...(shouldUpdateClerkId ? { clerkId: clerkUser.id } : {}),
        })
        .where(eq(users.id, dbUser.id))
        .returning({
          id: users.id,
          role: users.role,
          suspendedUntil: users.suspendedUntil,
          penaltyPoints: users.penaltyPoints,
          blocked: users.blocked,
          email: users.email,
          name: users.name,
          clerkId: users.clerkId,
        });

      dbUser = updatedUser;
    }
  }

  return dbUser;
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  // ── 1. Try Clerk auth first ──────────────────────────────────────────────
  let clerkUser = null;
  try {
    clerkUser = await currentUser();
  } catch {
    // ignore
  }

  if (clerkUser) {
    const dbUser = await getOrProvisionClerkUser(clerkUser);

    if (dbUser.blocked) {
      redirect('/blocked');
    }

    if (dbUser.suspendedUntil && dbUser.suspendedUntil > new Date()) {
      redirect('/user/penalties');
    }

    if (allowedRoles && !allowedRoles.includes(dbUser.role as UserRole)) {
      if (dbUser.role === 'STUDENT') {
        redirect('/user/dashboard');
      } else if (dbUser.role === 'GUARD') {
        redirect('/guard/scanner');
      } else {
        redirect('/admin/dashboard');
      }
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

  // ── 2. Fall back to guard session cookie ────────────────────────────────
  const guardAccessKey = process.env.GUARD_ACCESS_KEY;
  if (guardAccessKey) {
    try {
      const cookieStore = await cookies();
      const guardSession = cookieStore.get('guard_session')?.value;

      if (guardSession) {
        const sessionPayload = verifyGuardSessionCookie(guardSession, guardAccessKey);
        if (sessionPayload && (!allowedRoles || allowedRoles.includes(sessionPayload.role as UserRole))) {
          const db = getDb();
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

          if (dbUser && !dbUser.blocked && dbUser.role === 'GUARD') {
            return {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role as UserRole,
              penaltyPoints: dbUser.penaltyPoints,
              suspendedUntil: dbUser.suspendedUntil,
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // If completely unauthenticated, redirect smoothly to login
  redirect('/login');
}

export async function getSession() {
  try {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const dbUser = await getOrProvisionClerkUser(clerkUser);
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

    const db = getDb();
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
