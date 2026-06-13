/**
 * Google OAuth routes
 * Handles OAuth consent screen redirect and code exchange
 */

import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { OAuth2Client } from 'google-auth-library';
import { eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { users, workspaces } from '../../db/schema/index.js';
import { hashEmail } from '../../lib/crypto.js';
import { AuthService } from '../../services/auth.service.js';
import { WorkspaceService } from '../../services/workspace.service.js';
import { env } from '../../env.js';

export const googleOAuthRoutes = new Hono<{ Variables: RequestVariables }>();

function oauthClient(): OAuth2Client | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  const redirectUri =
    env.GOOGLE_CALLBACK_URL || `${env.FRONTEND_URL || env.API_URL}/oauth/callback`;
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);
}

const notConfiguredResponse = {
  type: 'https://agendaflow.local/errors/config-error',
  title: 'Configuration Error',
  status: 503,
  detail: 'Google OAuth is not configured',
} as const;

// GET /v1/auth/google - Redirect to Google consent screen
googleOAuthRoutes.get('/google', (c) => {
  const client = oauthClient();

  if (!client) {
    return c.json(notConfiguredResponse, 503);
  }

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });

  return c.redirect(authUrl);
});

// POST /v1/auth/google/callback - Exchange code, login or create account
googleOAuthRoutes.post('/google/callback', async (c) => {
  const logger = c.get('logger');
  const body = await c.req.json().catch(() => ({}));
  const code = (body as { code?: string }).code;

  if (!code || typeof code !== 'string') {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/oauth-error',
        title: 'OAuth Error',
        status: 422,
        detail: 'No authorization code provided',
      },
      422
    );
  }

  const client = oauthClient();

  if (!client) {
    return c.json(notConfiguredResponse, 503);
  }

  const db = (c as any).db;

  try {
    const { tokens: googleTokens } = await client.getToken(code);

    if (!googleTokens.id_token) {
      throw new Error('No ID token returned by Google');
    }

    const ticket = await client.verifyIdToken({
      idToken: googleTokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new Error('Google ID token missing sub/email');
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const emailHash = hashEmail(email);
    const firstName = payload.given_name || email.split('@')[0];
    const lastName = payload.family_name || null;

    // 1. Existing Google-linked user → login
    let user = await db.query.users.findFirst({
      where: eq(users.googleId, googleId),
    });

    let workspace: any = null;
    let created = false;

    if (!user) {
      // 2. Existing email/password user → link Google account
      const byEmail = await db.query.users.findFirst({
        where: eq(users.emailHash, emailHash),
      });

      if (byEmail) {
        const [updated] = await db
          .update(users)
          .set({
            googleId,
            googleEmail: email,
            emailVerified: true,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, byEmail.id))
          .returning();
        user = updated;
        logger.info({ userId: user.id }, 'Google account linked to existing user');
      } else {
        // 3. New user → create workspace + admin (Google email is pre-verified)
        const workspaceService = new WorkspaceService(db);
        const personName = [firstName, lastName].filter(Boolean).join(' ');
        const slug = await workspaceService.generateUniqueSlug(personName || email.split('@')[0]);
        const adminUserId = crypto.randomUUID();

        const result = await db.transaction(async (tx: typeof db) => {
          const [ws] = await tx
            .insert(workspaces)
            .values({
              slug,
              name: personName || slug,
              ownerUserId: adminUserId,
            })
            .returning();

          const [createdUser] = await tx
            .insert(users)
            .values({
              id: adminUserId,
              email,
              emailHash,
              googleId,
              googleEmail: email,
              firstName,
              lastName,
              workspaceId: ws.id,
              role: 'admin',
              emailVerified: true,
              emailVerifiedAt: new Date(),
              lastLoginAt: new Date(),
            })
            .returning();

          return { ws, createdUser };
        });

        workspace = result.ws;
        user = result.createdUser;
        created = true;
        logger.info({ userId: user.id, workspaceId: workspace.id, slug }, 'User registered via Google');
      }
    }

    if (!user.active) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/auth-error',
          title: 'Authentication Error',
          status: 401,
          detail: 'Account is disabled',
        },
        401
      );
    }

    if (!created) {
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    }

    if (!workspace) {
      workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, user.workspaceId),
        columns: { id: true, slug: true, name: true },
      });
    }

    const authService = new AuthService(
      db,
      (c as any).redis,
      process.env.JWT_SECRET || '',
      process.env.JWT_EXPIRES_IN || '15m',
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    const tokens = await authService.generateTokens(
      user.id,
      user.workspaceId,
      user.email,
      user.role
    );

    setCookie(c, 'accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: tokens.expiresIn,
      path: '/',
    });

    setCookie(c, 'refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    logger.info({ userId: user.id, created }, 'User logged in via Google');

    return c.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          workspaceId: user.workspaceId,
          role: user.role,
          emailVerified: true,
        },
        workspace: workspace
          ? { id: workspace.id, slug: workspace.slug, name: workspace.name }
          : null,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      created ? 201 : 200
    );
  } catch (error) {
    logger.error(error, 'OAuth callback error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/oauth-error',
        title: 'OAuth Error',
        status: 400,
        detail: 'OAuth callback failed',
      },
      400
    );
  }
});
