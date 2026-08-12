import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type GuardTokenPayload = {
  exp?: number;
  role?: string;
  iat?: number;
  id?: string | number;
};

function base64UrlToUint8Array(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function decodeBase64UrlJson<T>(input: string): T {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );

  return JSON.parse(atob(padded)) as T;
}

function isValidGuardSessionPayload(payload: GuardTokenPayload): boolean {
  return (
    typeof payload.role === 'string' &&
    payload.role === 'GUARD' &&
    typeof payload.exp === 'number' &&
    payload.exp > Date.now()
  );
}

async function hasValidGuardSession(): Promise<boolean> {
  const guardAccessKey = process.env.GUARD_ACCESS_KEY;
  if (!guardAccessKey) {
    return false;
  }

  const cookieStore = await cookies();
  const guardSession = cookieStore.get('guard_session')?.value;
  if (!guardSession) {
    return false;
  }

  try {
    const dotIndex = guardSession.lastIndexOf('.');
    if (dotIndex === -1) {
      return false;
    }

    const payloadB64 = guardSession.substring(0, dotIndex);
    const signature = guardSession.substring(dotIndex + 1);

    const enc = new TextEncoder();
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(guardAccessKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signatureBytes = base64UrlToUint8Array(signature);

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes,
      enc.encode(payloadB64),
    );

    if (!isValid) {
      return false;
    }

    const payload = decodeBase64UrlJson<GuardTokenPayload>(payloadB64);
    return isValidGuardSessionPayload(payload);
  } catch {
    return false;
  }
}

export async function resolveLandingPath(): Promise<string> {
  let clerkUser: Awaited<ReturnType<typeof currentUser>> | null = null;

  try {
    clerkUser = await currentUser();
  } catch {
    // Ignore Clerk session failures and try guard-session fallback.
  }

  if (clerkUser) {
    const email =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return '/login';
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
    const targetRole = isExplicitAdmin || isAdminDomain ? 'ADMIN' : 'STUDENT';

    const db = getDb();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    let user = existingUser;

    if (!user) {
      const isDev = process.env.NODE_ENV !== 'production';
      const isAllowedDomain = validDomains.includes(emailDomain);

      if (!isAllowedDomain && !isDev) {
        return '/login?error=invalid_domain';
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
        .returning();
      user = newUser;
    } else {
      const shouldUpdateRole = user.role !== targetRole && user.role !== 'GUARD';
      const shouldUpdateClerkId = !user.clerkId && !!clerkUser.id;

      if (shouldUpdateRole || shouldUpdateClerkId) {
        const [updated] = await db
          .update(users)
          .set({
            ...(shouldUpdateRole ? { role: targetRole } : {}),
            ...(shouldUpdateClerkId ? { clerkId: clerkUser.id } : {}),
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }
    }

    if (user.role === 'GUARD') {
      return '/guard/scanner';
    }

    if (user.role === 'ADMIN') {
      return '/admin/dashboard';
    }

    return '/user/dashboard';
  }

  if (await hasValidGuardSession()) {
    return '/guard/scanner';
  }

  return '/login';
}
