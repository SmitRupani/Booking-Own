import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/admin/login(.*)",
  "/blocked(.*)",
  "/sso-callback(.*)",
  "/api/auth/(.*)",
  "/api/approve/(.*)",
  "/api/cron",
  "/api/group-bookings/expire",
  "/api/policies/client",
  "/api/resources(.*)",
  "/api/availability(.*)",
  "/api/isbn/(.*)",
  "/api/admin/equipment(.*)",
  "/approval-result(.*)",
  "/dev-test(.*)",
  "/",
]);

// Routes that guards (with a valid guard_session cookie) can access
const isGuardRoute = createRouteMatcher([
  "/guard(.*)",
  "/api/guard(.*)",
  "/api/user/me",
  "/api/qr(.*)",
  "/api/scanner(.*)",
]);

function base64UrlToUint8Array(input: string): Uint8Array<ArrayBuffer> {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(input: string): T {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  return JSON.parse(atob(padded)) as T;
}

async function verifyGuardToken(token: string, key: string): Promise<boolean> {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return false;

    const payloadB64 = token.substring(0, dotIndex);
    const sig = token.substring(dotIndex + 1);

    const enc = new TextEncoder();
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      "raw",
      enc.encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const sigBytes = base64UrlToUint8Array(sig);

    const isValid = await globalThis.crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      sigBytes,
      enc.encode(payloadB64),
    );

    if (!isValid) return false;

    const payload = decodeBase64UrlJson<{ exp?: number; role?: string }>(
      payloadB64,
    );

    return (
      typeof payload.exp === "number" &&
      payload.exp > Date.now() &&
      payload.role === "GUARD"
    );
  } catch {
    return false;
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();
  const path = request.nextUrl.pathname;
  const isLoginRoute = path === "/login" || path.startsWith("/admin/login");

  // Guard cookie is checked to redirect already logged-in guards away from /login
  if (isLoginRoute) {
    const guardAccessKey = process.env.GUARD_ACCESS_KEY;
    const guardSession = request.cookies.get("guard_session")?.value;

    if (guardAccessKey && guardSession) {
      const isValidGuard = await verifyGuardToken(guardSession, guardAccessKey);
      if (isValidGuard) {
        return NextResponse.redirect(new URL("/guard/scanner", request.url));
      }
    }

    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // For guard-specific routes, verify guard_session cookie
  const isUserMeRoute = path === "/api/user/me";
  if (isGuardRoute(request)) {
    if (isUserMeRoute && userId) {
      return NextResponse.next();
    }

    const guardAccessKey = process.env.GUARD_ACCESS_KEY;
    const guardSession = request.cookies.get("guard_session")?.value;

    if (guardAccessKey && guardSession) {
      const isValidGuard = await verifyGuardToken(guardSession, guardAccessKey);
      if (isValidGuard) {
        return NextResponse.next();
      }
    }

    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect to login if not authenticated via Clerk or Guard
  if (!userId) {
    const guardAccessKey = process.env.GUARD_ACCESS_KEY;
    const guardSession = request.cookies.get("guard_session")?.value;

    if (guardAccessKey && guardSession) {
      const isValidGuard = await verifyGuardToken(guardSession, guardAccessKey);
      if (isValidGuard) {
        if (path.startsWith("/api/")) {
          return NextResponse.next();
        }
        if (!path.startsWith("/guard")) {
          return NextResponse.redirect(new URL("/guard/scanner", request.url));
        }
        return NextResponse.next();
      }
    }

    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$).*)",
  ],
};
