/**
 * Service routes (business services like haircut, massage, etc.)
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { serviceSchema, safeParse } from '../../lib/validation.js';
import { ServiceService } from '../../services/service.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export const serviceRoutes = new Hono<{ Variables: RequestVariables }>();

// GET /v1/services - List workspace services
serviceRoutes.get('/services', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const serviceService = new ServiceService((c as any).db);
  const data = await serviceService.listServices(workspaceId);

  return c.json({ data }, 200);
});

// POST /v1/services - Create service
serviceRoutes.post('/services', async (c) => {
  const logger = c.get('logger');
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(serviceSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  const serviceService = new ServiceService((c as any).db);
  const service = await serviceService.createService(workspaceId, data!);

  logger.info({ serviceId: service.id, workspaceId }, 'Service created');

  return c.json(service, 201);
});

// GET /v1/services/:id - Get service
serviceRoutes.get('/services/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const serviceService = new ServiceService((c as any).db);
  const service = await serviceService.getService(c.req.param('id'), workspaceId);

  if (!service) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Service not found',
      },
      404
    );
  }

  return c.json(service, 200);
});

// PATCH /v1/services/:id - Update service
serviceRoutes.patch('/services/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const body = await c.req.json();
  const { data, error } = await safeParse(serviceSchema.partial(), body);

  if (error) {
    return c.json(error, 422);
  }

  const serviceService = new ServiceService((c as any).db);
  const service = await serviceService.updateService(c.req.param('id'), workspaceId, data!);

  return c.json(service, 200);
});

// DELETE /v1/services/:id - Deactivate service
serviceRoutes.delete('/services/:id', async (c) => {
  const { workspaceId } = await requireAuth(c);

  const serviceService = new ServiceService((c as any).db);
  await serviceService.deleteService(c.req.param('id'), workspaceId);

  return c.json({ message: 'Service deleted' }, 200);
});
