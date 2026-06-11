/**
 * Background job worker
 * Processes jobs from BullMQ queue for SMS, emails, webhooks, etc.
 */

import { Worker } from 'bullmq';
import type { Logger } from 'pino';
import { createDb } from '../db/index.js';
import { createRedis } from '../lib/redis.js';

export async function startWorker(logger: Logger) {
  logger.info('Starting background worker...');

  try {
    const db = await createDb();
    const redis = await createRedis();

    // SMS job worker
    const smsWorker = new Worker(
      'sms-queue',
      async (job) => {
        logger.info({ jobId: job.id }, 'Processing SMS job');

        const { to, message } = job.data as { to: string; message: string };

        // TODO: Send SMS via Twilio
        logger.info({ to }, 'SMS sent');

        return { success: true };
      },
      { connection: redis as any }
    );

    // Email job worker
    const emailWorker = new Worker(
      'email-queue',
      async (job) => {
        logger.info({ jobId: job.id }, 'Processing email job');

        const { to, subject, body } = job.data as { to: string; subject: string; body: string };

        // TODO: Send email via SMTP
        logger.info({ to, subject }, 'Email sent');

        return { success: true };
      },
      { connection: redis as any }
    );

    // Payment webhook job worker
    const webhookWorker = new Worker(
      'webhook-queue',
      async (job) => {
        logger.info({ jobId: job.id }, 'Processing webhook job');

        const { url, payload } = job.data as { url: string; payload: any };

        // TODO: Send webhook request
        logger.info({ url }, 'Webhook sent');

        return { success: true };
      },
      { connection: redis as any }
    );

    smsWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'SMS job failed');
    });

    emailWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Email job failed');
    });

    webhookWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Webhook job failed');
    });

    logger.info('Worker ready - listening for jobs');

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    logger.error(error, 'Failed to start worker');
    process.exit(1);
  }
}
