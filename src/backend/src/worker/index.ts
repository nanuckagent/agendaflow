/**
 * Background job worker
 * Processes jobs from BullMQ queue for SMS, emails, webhooks, etc.
 */

import { Queue, Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Logger } from 'pino';
import { and, eq, lt } from 'drizzle-orm';
import { createDb } from '../db/index.js';
import { appointments } from '../db/schema/index.js';
import { createRedis } from '../lib/redis.js';
import { env } from '../env.js';

const PENDING_PAYMENT_TIMEOUT_MINUTES = 40;

function createMailTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  const port = Number(env.SMTP_PORT || '587');
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function startWorker(logger: Logger) {
  logger.info('Starting background worker...');

  try {
    const db = await createDb();
    const redis = await createRedis();

    const mailTransporter = createMailTransporter();
    if (mailTransporter) {
      logger.info({ host: env.SMTP_HOST }, 'SMTP configured - emails will be sent');
    } else {
      logger.warn('SMTP not configured - emails will be logged only');
    }

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

        const { to, subject, text, html } = job.data as {
          to: string;
          subject: string;
          text: string;
          html?: string;
        };

        if (!mailTransporter) {
          logger.info({ to, subject, text }, 'SMTP not configured - email logged only');
          return { success: true, delivered: false };
        }

        await mailTransporter.sendMail({
          from: env.MAIL_FROM || env.SMTP_USER,
          to,
          subject,
          text,
          html,
        });

        logger.info({ to, subject }, 'Email sent');
        return { success: true, delivered: true };
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

    // Maintenance: cancel appointments stuck in pending_payment to free their slots
    const maintenanceQueue = new Queue('maintenance-queue', { connection: redis as any });
    await maintenanceQueue.add(
      'expire-pending-payments',
      {},
      {
        repeat: { every: 10 * 60 * 1000 },
        jobId: 'expire-pending-payments',
        removeOnComplete: 10,
        removeOnFail: 50,
      }
    );

    const maintenanceWorker = new Worker(
      'maintenance-queue',
      async () => {
        const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

        const expired = await db
          .update(appointments)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(
            and(eq(appointments.status, 'pending_payment'), lt(appointments.createdAt, cutoff))
          )
          .returning({ id: appointments.id });

        if (expired.length > 0) {
          logger.info({ count: expired.length }, 'Expired pending_payment appointments cancelled');
        }

        return { cancelled: expired.length };
      },
      { connection: redis as any }
    );

    maintenanceWorker.on('failed', (job, error) => {
      logger.error({ jobId: job?.id, error: error.message }, 'Maintenance job failed');
    });

    logger.info('Worker ready - listening for jobs');

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    logger.error(error, 'Failed to start worker');
    process.exit(1);
  }
}
