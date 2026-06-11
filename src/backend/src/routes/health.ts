/**
 * Health check endpoints
 *
 * GET /healthz — Liveness probe (always returns 200 if server is up)
 * GET /readyz — Readiness probe (checks database and redis connectivity)
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../app.js';

export const healthRoutes = new Hono<{ Variables: RequestVariables }>();

healthRoutes.get('/healthz', (c) => {
  return c.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    200
  );
});

healthRoutes.get('/readyz', async (c) => {
  try {
    const db = (c as any).db;
    const redis = (c as any).redis;

    // Check database connectivity
    if (db) {
      try {
        await db.query.users.findFirst();
      } catch (dbError) {
        throw new Error(`Database check failed: ${dbError}`);
      }
    }

    // Check Redis connectivity
    if (redis) {
      try {
        await redis.ping();
      } catch (redisError) {
        throw new Error(`Redis check failed: ${redisError}`);
      }
    }

    return c.json(
      {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      },
      200
    );
  } catch (error) {
    const logger = c.get('logger');
    logger.error(error, 'Readiness check failed');

    return c.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      503
    );
  }
});
