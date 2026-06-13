/**
 * Password reset routes (forgot + reset)
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { users } from '../../db/schema/index.js';
import { forgotPasswordSchema, resetPasswordSchema, safeParse } from '../../lib/validation.js';
import { generateToken, hashEmail } from '../../lib/crypto.js';
import { enqueueEmail } from '../../lib/queue.js';
import { passwordResetEmail } from '../../lib/email-templates.js';
import { AuthService } from '../../services/auth.service.js';
import { env } from '../../env.js';

export const passwordResetRoutes = new Hono<{ Variables: RequestVariables }>();

const RESET_TOKEN_TTL_SECONDS = 30 * 60;

// POST /v1/auth/forgot-password - Request a password reset link
// Always returns 200 to avoid email enumeration
passwordResetRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { data, error } = await safeParse(forgotPasswordSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const okResponse = {
    message: 'If the email exists, a reset link has been sent',
  };

  try {
    const emailHash = hashEmail(data!.email);
    const user = await (c as any).db.query.users.findFirst({
      where: eq(users.emailHash, emailHash),
      columns: { id: true, email: true, active: true },
    });

    if (!user || !user.active) {
      logger.info('Password reset requested for unknown email');
      return c.json(okResponse, 200);
    }

    const token = generateToken(32);
    await (c as any).redis.set(`pwreset:${token}`, user.id, 'EX', RESET_TOKEN_TTL_SECONDS);

    const frontendUrl = env.FRONTEND_URL || env.API_URL;
    const link = `${frontendUrl}/reset-password?token=${token}`;
    const email = passwordResetEmail(link);

    await enqueueEmail((c as any).redis, {
      to: user.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    logger.info({ userId: user.id }, 'Password reset email enqueued');

    return c.json(okResponse, 200);
  } catch (err) {
    logger.error(err, 'Forgot password error');
    // Still return 200 to avoid leaking state
    return c.json(okResponse, 200);
  }
});

// POST /v1/auth/reset-password - Set a new password with a valid token
passwordResetRoutes.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { data, error } = await safeParse(resetPasswordSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  try {
    // Single-use: atomically consume the token
    const userId = await (c as any).redis.getdel(`pwreset:${data!.token}`);

    if (!userId) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Invalid or expired reset token',
        },
        401
      );
    }

    const authService = new AuthService(
      (c as any).db,
      (c as any).redis,
      process.env.JWT_SECRET || ''
    );

    const passwordHash = await authService.hashPassword(data!.password);

    await (c as any).db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await authService.revokeAllUserTokens(userId);

    logger.info({ userId }, 'Password reset completed - all sessions revoked');

    return c.json({ message: 'Password updated successfully' }, 200);
  } catch (err) {
    logger.error(err, 'Reset password error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during password reset',
      },
      500
    );
  }
});
