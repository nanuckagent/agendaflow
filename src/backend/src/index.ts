/**
 * AgendaFlow Backend Entry Point
 *
 * Handles APP_ROLE logic:
 *   - api: HTTP API server (Hono)
 *   - worker: Background job processor (BullMQ)
 */

import { serve } from '@hono/node-server';
import { env } from './env.js';
import { createApp } from './app.js';
import { createDb } from './db/index.js';
import { createRedis } from './lib/redis.js';
import { startWorker } from './worker/index.js';
import pino from 'pino';

const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.LOG_FORMAT === 'pretty'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

async function startApi() {
  logger.info('Starting API server...');

  try {
    const db = await createDb();
    const redis = await createRedis();

    const app = createApp({ db, redis, env, logger });

    const port = parseInt(env.PORT || '8000', 10);
    logger.info(`API server listening on http://127.0.0.1:${port}`);

    serve(
      {
        fetch: app.fetch,
        port,
        hostname: '127.0.0.1',
      },
      (info) => {
        logger.info(`Server started on ${info.address}:${info.port}`);
      }
    );
  } catch (error) {
    logger.error(error, 'Failed to start API server');
    process.exit(1);
  }
}

async function main() {
  const role = env.APP_ROLE || 'api';

  try {
    if (role === 'worker') {
      await startWorker(logger);
    } else {
      await startApi();
    }
  } catch (error) {
    logger.error(error, 'Fatal error');
    process.exit(1);
  }
}

main();
