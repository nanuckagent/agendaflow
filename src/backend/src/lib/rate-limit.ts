/**
 * Fixed-window rate limiting backed by Redis (fail-open if Redis is down)
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import type Redis from 'ioredis';

interface RateLimitOptions {
  prefix: string;
  limit: number;
  windowSec: number;
}

function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return c.req.header('x-real-ip') || 'unknown';
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const redis = (c as any).redis as Redis | undefined;
    if (!redis) {
      await next();
      return;
    }

    const key = `rl:${opts.prefix}:${clientIp(c)}`;

    let count: number;
    let ttl: number;
    try {
      count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, opts.windowSec);
      }
      ttl = count > opts.limit ? await redis.ttl(key) : 0;
    } catch {
      await next();
      return;
    }

    if (count > opts.limit) {
      const retryAfter = ttl > 0 ? ttl : opts.windowSec;
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          type: 'https://agendaflow.local/errors/rate-limit',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Rate limit exceeded. Try again later.',
        },
        429
      );
    }

    await next();
  };
}
