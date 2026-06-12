/**
 * Self-service registration: creates workspace + admin user with auto-login
 */

import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { eq, or, sql } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { users, workspaces } from '../../db/schema/index.js';
import { registerSchema, safeParse } from '../../lib/validation.js';
import { hashEmail } from '../../lib/crypto.js';
import { AuthService } from '../../services/auth.service.js';
import { WorkspaceService } from '../../services/workspace.service.js';

export const registerRoutes = new Hono<{ Variables: RequestVariables }>();

const conflictResponse = {
  type: 'https://agendaflow.local/errors/conflict',
  title: 'Conflict',
  status: 409,
  detail: 'Email already registered',
};

// POST /v1/auth/register - Create account + workspace
registerRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const logger = c.get('logger');

  const { data, error } = await safeParse(registerSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const db = (c as any).db;

  try {
    const emailHash = hashEmail(data!.email);

    const existing = await db.query.users.findFirst({
      where: or(
        eq(sql`lower(${users.email})`, data!.email),
        eq(users.emailHash, emailHash)
      ),
      columns: { id: true },
    });

    if (existing) {
      logger.warn({ email: data!.email }, 'Registration failed - email already in use');
      return c.json(conflictResponse, 409);
    }

    const workspaceService = new WorkspaceService(db);
    const slug = await workspaceService.generateUniqueSlug(data!.businessName);

    const authService = new AuthService(
      db,
      (c as any).redis,
      process.env.JWT_SECRET || '',
      process.env.JWT_EXPIRES_IN || '15m',
      process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    );

    const passwordHash = await authService.hashPassword(data!.password);

    const nameParts = data!.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || null;

    const adminUserId = crypto.randomUUID();

    const { workspace, user } = await db.transaction(async (tx: typeof db) => {
      const [ws] = await tx
        .insert(workspaces)
        .values({
          slug,
          name: data!.businessName,
          ownerUserId: adminUserId,
        })
        .returning();

      const [createdUser] = await tx
        .insert(users)
        .values({
          id: adminUserId,
          email: data!.email,
          emailHash,
          passwordHash,
          firstName,
          lastName,
          workspaceId: ws.id,
          role: 'admin',
          lastLoginAt: new Date(),
        })
        .returning();

      return { workspace: ws, user: createdUser };
    });

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

    logger.info({ userId: user.id, workspaceId: workspace.id, slug }, 'User registered');

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
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      201
    );
  } catch (err: any) {
    // Unique violation (race on email/slug)
    if (err?.code === '23505' || err?.cause?.code === '23505') {
      return c.json(conflictResponse, 409);
    }

    logger.error(err, 'Registration error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'An error occurred during registration',
      },
      500
    );
  }
});
