/**
 * Hono application factory
 * Sets up middleware, error handling, and route registration
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from './db/index.js';
import type Redis from 'ioredis';
import type { Logger } from 'pino';
import { env } from './env.js';
import { apiRoutes } from './routes/index.js';
import { healthRoutes } from './routes/health.js';
import { createAuthMiddleware } from './middlewares/auth.js';

export interface AppContext {
  db: Database;
  redis: Redis;
  env: typeof env;
  logger: Logger;
}

export interface RequestVariables {
  userId?: string;
  workspaceId?: string;
  user?: {
    id: string;
    email: string;
    workspaceId: string;
  };
  logger: Logger;
}

export function createApp(context: AppContext): Hono<{ Variables: RequestVariables }> {
  const app = new Hono<{ Variables: RequestVariables }>();

  // CORS middleware
  app.use(
    cors({
      origin: env.FRONTEND_URL || '*',
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
      exposeHeaders: ['X-Total-Count', 'X-Page-Count'],
    })
  );

  // Request context middleware
  app.use(async (c, next) => {
    const requestLogger = context.logger.child({
      requestId: crypto.randomUUID(),
      method: c.req.method,
      path: c.req.path,
    });

    c.set('logger', requestLogger);

    // Make services available in route handlers via context
    (c as any).db = context.db;
    (c as any).redis = context.redis;
    (c as any).env = context.env;

    await next();
  });

  // Health check routes (no auth required)
  app.route('/healthz', healthRoutes);
  app.route('/readyz', healthRoutes);

  // Auth middleware for v1 routes
  const authMiddleware = createAuthMiddleware(context.db, context.redis);

  // Public API routes (before auth middleware)
  app.post('/v1/auth/google', async (c) => {
    return c.json({ message: 'Google OAuth endpoint' });
  });
  app.get('/v1/auth/google/callback', async (c) => {
    return c.json({ message: 'Google OAuth callback' });
  });
  app.post('/v1/auth/login', async (c) => {
    return c.json({ message: 'Login endpoint' });
  });

  // Protected API routes (apply auth middleware)
  app.use('/v1/*', authMiddleware);
  app.route('/v1', apiRoutes);

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Route ${c.req.path} not found`,
      },
      404
    );
  });

  // Global error handler
  app.onError((err, c) => {
    const logger = c.get('logger') || context.logger;

    if (err instanceof Error) {
      if ('status' in err) {
        const statusCode = (err as any).status || 500;
        logger.error({ error: err.message, stack: err.stack }, 'Request error');

        return c.json(
          {
            type: 'https://agendaflow.local/errors/request-error',
            title: 'Request Error',
            status: statusCode,
            detail: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
          },
          statusCode
        );
      }

      logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
    }

    return c.json(
      {
        type: 'https://agendaflow.local/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.toString(),
      },
      500
    );
  });

  return app;
}
