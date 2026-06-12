/**
 * Workspace routes
 * CRUD operations for workspace management
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { workspaceSchema, safeParse } from '../../lib/validation.js';
import { WorkspaceService } from '../../services/workspace.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export const workspaceRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/workspaces - Create new workspace
workspaceRoutes.post('/workspaces', async (c) => {
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);
    const body = await c.req.json();

    const { data, error } = await safeParse(workspaceSchema, body);

    if (error) {
      return c.json(error, 422);
    }

    const workspaceService = new WorkspaceService((c as any).db);
    const workspace = await workspaceService.createWorkspace(userId, data!);

    logger.info({ workspaceId: workspace.id, userId }, 'Workspace created');

    return c.json(
      {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        timezone: workspace.timezone,
        currency: workspace.currency,
      },
      201
    );
  } catch (error) {
    logger.error(error, 'Workspace creation error');

    if (error instanceof Error && error.message === 'Authentication required') {
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

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'Failed to create workspace',
      },
      500
    );
  }
});

// GET /v1/workspaces/:id - Get workspace details
workspaceRoutes.get('/workspaces/:id', async (c) => {
  const { id } = c.req.param();
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);

    const workspaceService = new WorkspaceService((c as any).db);
    const workspace = await workspaceService.getWorkspace(id, userId);

    return c.json(
      {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        timezone: workspace.timezone,
        currency: workspace.currency,
        primaryColor: workspace.primaryColor,
        sidebarColor: workspace.sidebarColor,
        accentColor: workspace.accentColor,
        logoUrl: workspace.logoUrl,
        storeEnabled: workspace.storeEnabled,
        whatsappNumber: workspace.whatsappNumber,
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Workspace fetch error');

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Workspace not found') {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Workspace not found',
        },
        404
      );
    }

    if (message === 'Unauthorized') {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You do not have access to this workspace',
        },
        403
      );
    }

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'Failed to fetch workspace',
      },
      500
    );
  }
});

// PATCH /v1/workspaces/:id - Update workspace branding
workspaceRoutes.patch('/workspaces/:id', async (c) => {
  const { id } = c.req.param();
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);
    const body = await c.req.json();

    const workspaceService = new WorkspaceService((c as any).db);

    // Verify user owns workspace
    const workspace = await workspaceService.getWorkspace(id, userId);

    // Whitelist updatable fields to avoid mass assignment
    const allowed = [
      'name',
      'timezone',
      'currency',
      'primaryColor',
      'sidebarColor',
      'accentColor',
      'logoUrl',
      'storeEnabled',
      'whatsappNumber',
    ] as const;
    const input = Object.fromEntries(
      Object.entries(body).filter(([key]) => (allowed as readonly string[]).includes(key))
    );

    const updated = await workspaceService.updateWorkspace(id, input);

    logger.info({ workspaceId: id }, 'Workspace updated');

    return c.json(
      {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        primaryColor: updated.primaryColor,
        sidebarColor: updated.sidebarColor,
        accentColor: updated.accentColor,
        logoUrl: updated.logoUrl,
        storeEnabled: updated.storeEnabled,
        whatsappNumber: updated.whatsappNumber,
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Workspace update error');

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Workspace not found') {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Workspace not found',
        },
        404
      );
    }

    if (message === 'Unauthorized') {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You do not have access to this workspace',
        },
        403
      );
    }

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'Failed to update workspace',
      },
      500
    );
  }
});

// GET /v1/user/workspaces - List user's workspaces
workspaceRoutes.get('/user/workspaces', async (c) => {
  const logger = c.get('logger');

  try {
    const { userId } = await requireAuth(c);

    const workspaceService = new WorkspaceService((c as any).db);
    const workspaces = await workspaceService.listUserWorkspaces(userId);

    logger.info({ userId, count: workspaces.length }, 'User workspaces listed');

    return c.json(
      {
        data: workspaces.map((w) => ({
          id: w.id,
          slug: w.slug,
          name: w.name,
          timezone: w.timezone,
          currency: w.currency,
        })),
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Error listing user workspaces');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'Failed to list workspaces',
      },
      500
    );
  }
});
