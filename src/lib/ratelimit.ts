import { NextRequest, NextResponse } from 'next/server';

interface LimitStore {
  count: number;
  reset: number;
}

const stores = new Map<string, LimitStore>();

// Clean up stale memory entries periodically (every 10 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, store] of stores.entries()) {
      if (now > store.reset) {
        stores.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Higher-order function to wrap API handlers with a lightweight in-memory rate limiter.
 */
export function withRateLimit(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  limit: number = 20,
  windowMs: number = 60000
) {
  return async (req: NextRequest, ...args: any[]) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.nextUrl.pathname}`;
    let store = stores.get(key);

    if (!store || now > store.reset) {
      store = { count: 0, reset: now + windowMs };
    }

    store.count += 1;
    stores.set(key, store);

    if (store.count > limit) {
      const response = NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        { status: 429 }
      );
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', store.reset.toString());
      response.headers.set('Retry-After', Math.ceil((store.reset - now) / 1000).toString());
      return response;
    }

    const res = await handler(req, ...args);
    
    res.headers.set('X-RateLimit-Limit', limit.toString());
    res.headers.set('X-RateLimit-Remaining', Math.max(0, limit - store.count).toString());
    res.headers.set('X-RateLimit-Reset', store.reset.toString());

    return res;
  };
}
