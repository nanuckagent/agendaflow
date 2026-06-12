/**
 * Professional routes
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import {
  professionalSchema,
  professionalServicesSchema,
  scheduleSchema,
  safeParse,
} from '../../lib/validation.js';
import { ProfessionalService } from '../../services/professional.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export const professionalRoutes = new Hono<{ Variables: RequestVariables }>();

// GET /v1/professionals - List workspace professionals
professionalRoutes.get('/professionals', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const professionalService = new ProfessionalService((c as any).db);
  const data = await professionalService.listProfessionalsWithServices(workspaceId);

  return c.json({ data }, 200);
});

// POST /v1/professionals - Create professional
professionalRoutes.post('/professionals', async (c) => {
  const logger = c.get('logger');
  const { userId, workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(professionalSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const professionalService = new ProfessionalService((c as any).db);
  const professional = await professionalService.createProfessional(workspaceId, {
    ...data!,
    // default to the authenticated user when no explicit user is given
    userId: (body.userId as string | undefined) ?? userId,
  });

  logger.info({ professionalId: professional.id, workspaceId }, 'Professional created');

  return c.json(professional, 201);
});

// GET /v1/professionals/:id - Get professional
professionalRoutes.get('/professionals/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const professionalService = new ProfessionalService((c as any).db);
  const professional = await professionalService.getProfessional(
    c.req.param('id'),
    workspaceId
  );

  if (!professional) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Professional not found',
      },
      404
    );
  }

  return c.json(professional, 200);
});

// PATCH /v1/professionals/:id - Update professional
professionalRoutes.patch('/professionals/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(professionalSchema.partial(), body);

  if (error) {
    return c.json(error, 422);
  }

  const professionalService = new ProfessionalService((c as any).db);
  const professional = await professionalService.updateProfessional(
    c.req.param('id'),
    workspaceId,
    data!
  );

  return c.json(professional, 200);
});

// PUT /v1/professionals/:id/services - Replace linked services
professionalRoutes.put('/professionals/:id/services', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(professionalServicesSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const professionalService = new ProfessionalService((c as any).db);
  const serviceIds = await professionalService.setProfessionalServices(
    c.req.param('id'),
    workspaceId,
    data!.serviceIds
  );

  return c.json({ serviceIds }, 200);
});

// GET /v1/professionals/:id/schedule - Get weekly schedule
professionalRoutes.get('/professionals/:id/schedule', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const professionalService = new ProfessionalService((c as any).db);
  const entries = await professionalService.getSchedule(c.req.param('id'), workspaceId);

  return c.json({ entries }, 200);
});

// PUT /v1/professionals/:id/schedule - Replace weekly schedule
professionalRoutes.put('/professionals/:id/schedule', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(scheduleSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const professionalService = new ProfessionalService((c as any).db);
  const entries = await professionalService.setSchedule(
    c.req.param('id'),
    workspaceId,
    data!.entries
  );

  return c.json({ entries }, 200);
});

// DELETE /v1/professionals/:id - Deactivate professional
professionalRoutes.delete('/professionals/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const professionalService = new ProfessionalService((c as any).db);
  await professionalService.deleteProfessional(c.req.param('id'), workspaceId);

  return c.json({ message: 'Professional deleted' }, 200);
});
