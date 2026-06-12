/**
 * Public booking discovery routes (no authentication)
 * Expose only the minimum needed for the public booking flow.
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { workspaces } from '../../db/schema/index.js';
import { ProfessionalService } from '../../services/professional.service.js';
import { ServiceService } from '../../services/service.service.js';

export const publicDiscoveryRoutes = new Hono<{ Variables: RequestVariables }>();

function missingWorkspaceHeader(c: any) {
  return c.json(
    {
      type: 'https://agendaflow.local/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'X-Workspace-Id header is required',
    },
    422
  );
}

// GET /v1/public/workspaces/:slug - Resolve workspace by slug (public branding info only)
publicDiscoveryRoutes.get('/public/workspaces/:slug', async (c) => {
  const { slug } = c.req.param();

  const workspace = await (c as any).db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  if (!workspace) {
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
    },
    200
  );
});

// GET /v1/public/professionals - List active professionals for a workspace
publicDiscoveryRoutes.get('/public/professionals', async (c) => {
  const workspaceId = c.req.header('X-Workspace-Id');
  if (!workspaceId) return missingWorkspaceHeader(c);

  const professionalService = new ProfessionalService((c as any).db);
  const professionals = await professionalService.listProfessionals(workspaceId, {
    active: true,
  });

  return c.json(
    {
      data: professionals.map((p) => ({
        id: p.id,
        name: p.name,
        specialty: p.specialty,
        bio: p.bio,
        photoUrl: p.photoUrl,
      })),
    },
    200
  );
});

// GET /v1/public/services - List active services for a workspace
publicDiscoveryRoutes.get('/public/services', async (c) => {
  const workspaceId = c.req.header('X-Workspace-Id');
  if (!workspaceId) return missingWorkspaceHeader(c);

  const professionalId = c.req.query('professionalId');

  const serviceService = new ServiceService((c as any).db);
  const services = professionalId
    ? await serviceService.listServicesForProfessional(workspaceId, professionalId)
    : await serviceService.listServices(workspaceId, { active: true });

  return c.json(
    {
      data: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        priceInCents: s.priceInCents,
      })),
    },
    200
  );
});
