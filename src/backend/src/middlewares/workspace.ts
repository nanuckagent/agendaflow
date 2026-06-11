/**
 * Workspace isolation middleware
 * Ensures user can only access their own workspace data
 */

import type { Context, MiddlewareHandler } from 'hono';
import type { RequestVariables } from '../app.js';

export const workspaceMiddleware: MiddlewareHandler<{ Variables: RequestVariables }> = async (
  c: Context<{ Variables: RequestVariables }>,
  next
) => {
  // Get workspace ID from header or JWT
  const headerWorkspaceId = c.req.header('X-Workspace-Id');
  const contextWorkspaceId = c.get('workspaceId');

  const workspaceId = headerWorkspaceId || contextWorkspaceId;

  if (!workspaceId) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/workspace-required',
        title: 'Workspace Required',
        status: 400,
        detail: 'X-Workspace-Id header or workspace in token is required',
      },
      400
    );
  }

  // Verify user has access to workspace
  const contextWorkspace = c.get('workspaceId');
  if (contextWorkspace && contextWorkspace !== workspaceId) {
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

  c.set('workspaceId', workspaceId);
  await next();
};
