/**
 * BullMQ queue producers
 */

import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let emailQueue: Queue | null = null;

function getEmailQueue(redis: Redis): Queue {
  if (!emailQueue) {
    emailQueue = new Queue('email-queue', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return emailQueue;
}

export async function enqueueEmail(redis: Redis, data: EmailJobData): Promise<void> {
  await getEmailQueue(redis).add('send-email', data);
}
