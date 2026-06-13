/**
 * Email verification routes + current user endpoint
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { users } from '../../db/schema/index.js';
import { safeParse, verifyEmailSchema } from '../../lib/validation.js';
import { requireAuth } from '../../middlewares/auth.js';
import { sendVerificationEmail } from './register.js';

export const emailVerificationRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/auth/verify-email - Confirm email with token
emailVerificationRoutes.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { data, error } = await safeParse(verifyEmailSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  try {
    const userId = await (c as any).redis.getdel(`verifyemail:${data!.token}`);

    if (!userId) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Invalid or expired verification token',
        },
        401
      );
    }

    await (c as any).db
      .update(users)
      .set({ emailVerified: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    logger.info({ userId }, 'Email verified');

    return c.json({ message: 'Email verified successfully' }, 200);
  } catch (err) {
    logger.error(err, 'Email verification error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during email verification',
      },
      500
    );
  }
});

// POST /v1/auth/resend-verification - Resend verification email (authenticated)
emailVerificationRoutes.post('/resend-verification', async (c) => {
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);

    const user = await (c as any).db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'User not found',
        },
        401
      );
    }

    if (user.emailVerified) {
      return c.json({ message: 'Email already verified' }, 200);
    }

    await sendVerificationEmail((c as any).redis, user.id, user.email);

    logger.info({ userId }, 'Verification email re-enqueued');

    return c.json({ message: 'Verification email sent' }, 200);
  } catch (err: any) {
    if (err?.status === 401) {
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

    logger.error(err, 'Resend verification error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred while resending verification email',
      },
      500
    );
  }
});

// GET /v1/auth/me - Current authenticated user
emailVerificationRoutes.get('/me', async (c) => {
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);

    const user = await (c as any).db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        workspaceId: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'User not found',
        },
        401
      );
    }

    return c.json({ user }, 200);
  } catch (err: any) {
    if (err?.status === 401) {
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

    logger.error(err, 'Get current user error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred while fetching the current user',
      },
      500
    );
  }
});
