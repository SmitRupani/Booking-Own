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
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return '/login';
    }

    const db = getDb();
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user = existingUser;

    if (!user) {
      const validDomains = ['sst.scaler.com', 'scaler.com'];
      const emailDomain = email.split('@')[1];

      if (validDomains.includes(emailDomain)) {
        const [newUser] = await db
          .insert(users)
          .values({
            name: clerkUser.fullName || clerkUser.firstName || email.split('@')[0],
            email,
            role: 'STUDENT',
            penaltyPoints: 0,
            clerkId: clerkUser.id,
          })
          .returning();
        user = newUser;
      } else {
        return '/login?error=invalid_domain';
      }
    } else if (!user.clerkId && clerkUser.id) {
      const [updated] = await db
        .update(users)
        .set({ clerkId: clerkUser.id })
        .where(eq(users.id, user.id))
        .returning();
      user = updated;
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
