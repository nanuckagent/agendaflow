/**
 * JWT authentication middleware
 * Extracts and verifies tokens from Authorization header or httpOnly cookies
 */

import { jwtVerify, errors } from 'jose';
import type { Database } from '../db/index.js';
import type Redis from 'ioredis';
import type { Context, MiddlewareHandler } from 'hono';
import type { RequestVariables } from '../app.js';

interface JWTPayload {
  userId: string;
  workspaceId: string;
  email: string;
  iat: number;
  exp: number;
}

export function createAuthMiddleware(
  db: Database,
  redis: Redis
): MiddlewareHandler<{ Variables: RequestVariables }> {
  return async (c: Context<{ Variables: RequestVariables }>, next) => {
    const authHeader = c.req.header('Authorization');
    const cookieToken = c.req.cookie('accessToken');

    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    // Check if route requires authentication
    if (!token) {
      // Some routes don't require auth, let them pass
      c.set('userId', undefined);
      c.set('workspaceId', undefined);
      await next();
      return;
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
      const verified = await jwtVerify(token, secret);

      const payload = verified.payload as JWTPayload;

      c.set('userId', payload.userId);
      c.set('workspaceId', payload.workspaceId);
      c.set('user', {
        id: payload.userId,
        email: payload.email,
        workspaceId: payload.workspaceId,
      });

      await next();
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        return c.json(
          {
            type: 'https://agendaflow.local/errors/token-expired',
            title: 'Token Expired',
            status: 401,
            detail: 'JWT token has expired',
          },
          401
        );
      }

      if (error instanceof errors.JWTInvalid) {
        return c.json(
          {
            type: 'https://agendaflow.local/errors/invalid-token',
            title: 'Invalid Token',
            status: 401,
            detail: 'JWT token is invalid',
          },
          401
        );
      }

      return c.json(
        {
          type: 'https://agendaflow.local/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required',
        },
        401
      );
    }
  };
}

export async function requireAuth(c: Context<{ Variables: RequestVariables }>) {
  const userId = c.get('userId');
  const workspaceId = c.get('workspaceId');

  if (!userId || !workspaceId) {
    throw {
      status: 401,
      message: 'Authentication required',
    };
  }

  return { userId, workspaceId };
}
