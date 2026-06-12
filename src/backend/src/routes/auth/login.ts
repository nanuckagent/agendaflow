/**
 * Email/password login routes
 */

import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { users } from '../../db/schema/index.js';
import { loginSchema, safeParse } from '../../lib/validation.js';
import { AuthService } from '../../services/auth.service.js';

export const loginRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/auth/login - Login with email and password
loginRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  // Validate input
  const { data, error } = await safeParse(loginSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  try {
    // Find user
    const user = await (c as any).db.query.users.findFirst({
      where: eq(users.email, data!.email),
    });

    if (!user || !user.passwordHash) {
      logger.warn({ email: data!.email }, 'Login failed - user not found');
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Invalid email or password',
        },
        401
      );
    }

    // Verify password
    const authService = new AuthService(
      (c as any).db,
      (c as any).redis,
      process.env.JWT_SECRET || '',
      process.env.JWT_EXPIRES_IN || '15m',
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    const passwordValid = await authService.verifyPassword(data!.password, user.passwordHash);

    if (!passwordValid) {
      logger.warn({ email: data!.email }, 'Login failed - invalid password');
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Invalid email or password',
        },
        401
      );
    }

    await (c as any).db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = await authService.generateTokens(
      user.id,
      user.workspaceId,
      user.email,
      user.role
    );

    // Set httpOnly cookies
    setCookie(c,'accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    setCookie(c,'refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    logger.info({ userId: user.id }, 'User logged in');

    return c.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          workspaceId: user.workspaceId,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Login error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during login',
      },
      500
    );
  }
});

// POST /v1/auth/refresh - Refresh access token
loginRoutes.post('/refresh', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { refreshToken } = body as { refreshToken?: string };

  if (!refreshToken) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Refresh token is required',
      },
      422
    );
  }

  try {
    const authService = new AuthService(
      (c as any).db,
      (c as any).redis,
      process.env.JWT_SECRET || '',
      process.env.JWT_EXPIRES_IN || '15m',
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    const tokenData = await authService.verifyRefreshToken(refreshToken);

    if (!tokenData) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Invalid or expired refresh token',
        },
        401
      );
    }

    // Get user info
    const user = await (c as any).db.query.users.findFirst({
      where: eq(users.id, tokenData.userId),
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

    // Generate new tokens
    const tokens = await authService.generateTokens(
      user.id,
      user.workspaceId,
      user.email,
      user.role
    );

    // Rotate refresh token
    const newRefreshToken = await authService.rotateRefreshToken(refreshToken, user.id);

    // Set new cookies
    setCookie(c,'accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    setCookie(c,'refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    logger.info({ userId: user.id }, 'Token refreshed');

    return c.json(
      {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Token refresh error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during token refresh',
      },
      500
    );
  }
});

// POST /v1/auth/logout - Logout (revoke tokens)
loginRoutes.post('/logout', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { refreshToken } = body as { refreshToken?: string };

  try {
    if (refreshToken) {
      const authService = new AuthService(
        (c as any).db,
        (c as any).redis,
        process.env.JWT_SECRET || ''
      );

      await authService.revokeRefreshToken(refreshToken);
    }

    // Clear cookies
    setCookie(c,'accessToken', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });

    setCookie(c,'refreshToken', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });

    logger.info('User logged out');

    return c.json({ message: 'Logged out successfully' }, 200);
  } catch (error) {
    logger.error(error, 'Logout error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during logout',
      },
      500
    );
  }
});
