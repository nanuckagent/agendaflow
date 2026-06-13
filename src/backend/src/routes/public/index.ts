/**
 * Public booking discovery routes (no authentication)
 * Expose only the minimum needed for the public booking flow.
 */

import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { appointments, payments, workspaces } from '../../db/schema/index.js';
import { ProfessionalService } from '../../services/professional.service.js';
import { ServiceService } from '../../services/service.service.js';
import { AppointmentService } from '../../services/appointment.service.js';
import { ProductService } from '../../services/product.service.js';

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

// GET /v1/public/config - Feature flags for the frontend
publicDiscoveryRoutes.get('/public/config', (c) => {
  return c.json({
    googleOAuthEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
});

// GET /v1/public/workspaces/:slug - Resolve workspace by slug (public branding info only)
// logoUrl is served by a dedicated endpoint: base64 logos stored in the DB would
// bloat this payload to hundreds of KB per request.
publicDiscoveryRoutes.get('/public/workspaces/:slug', async (c) => {
  const { slug } = c.req.param();

  const workspace = await (c as any).db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    columns: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      currency: true,
      primaryColor: true,
      sidebarColor: true,
      accentColor: true,
      storeEnabled: true,
      whatsappNumber: true,
    },
    extras: {
      hasLogo: sql<boolean>`(logo_url is not null)`.as('has_logo'),
    },
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
      logoUrl: workspace.hasLogo ? `/v1/public/workspaces/${workspace.slug}/logo` : null,
      storeEnabled: workspace.storeEnabled,
      whatsappNumber: workspace.whatsappNumber,
    },
    200
  );
});

// GET /v1/public/workspaces/:slug/logo - Serve workspace logo (binary, cacheable)
publicDiscoveryRoutes.get('/public/workspaces/:slug/logo', async (c) => {
  const { slug } = c.req.param();

  const workspace = await (c as any).db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
    columns: { logoUrl: true },
  });

  if (!workspace?.logoUrl) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Logo not found',
      },
      404
    );
  }

  if (/^https?:\/\//.test(workspace.logoUrl)) {
    return c.redirect(workspace.logoUrl, 302);
  }

  const match = workspace.logoUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/s);
  if (!match) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Logo not found',
      },
      404
    );
  }

  const [, mime, payload] = match;
  const buffer = Buffer.from(payload, 'base64');

  c.header('Content-Type', mime);
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(buffer);
});

// GET /v1/public/availability - Available slots for a professional on a date
publicDiscoveryRoutes.get('/public/availability', async (c) => {
  const workspaceId = c.req.header('X-Workspace-Id');
  if (!workspaceId) return missingWorkspaceHeader(c);

  const professionalId = c.req.query('professionalId');
  const date = c.req.query('date');
  const serviceId = c.req.query('serviceId');

  if (!professionalId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'professionalId and date (yyyy-MM-dd) query parameters are required',
      },
      422
    );
  }

  const appointmentService = new AppointmentService((c as any).db);
  const slots = await appointmentService.calculateAvailability(
    workspaceId,
    professionalId,
    date,
    serviceId
  );

  return c.json({ date, slots }, 200);
});

// GET /v1/public/products - List active products (store module)
publicDiscoveryRoutes.get('/public/products', async (c) => {
  const workspaceId = c.req.header('X-Workspace-Id');
  if (!workspaceId) return missingWorkspaceHeader(c);

  const workspace = await (c as any).db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace?.storeEnabled) {
    return c.json({ data: [] }, 200);
  }

  const productService = new ProductService((c as any).db);
  const items = await productService.listProducts(workspaceId, { active: true });

  return c.json(
    {
      data: items.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceInCents: p.priceInCents,
        imageUrl: p.imageUrl,
      })),
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

// GET /v1/public/payments/:id/status - Poll payment status during PIX checkout
publicDiscoveryRoutes.get('/public/payments/:id/status', async (c) => {
  const { id } = c.req.param();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid payment id',
      },
      422
    );
  }

  const payment = await (c as any).db.query.payments.findFirst({
    where: eq(payments.id, id),
    columns: { id: true, status: true, appointmentId: true },
  });

  if (!payment) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Payment not found',
      },
      404
    );
  }

  let appointmentStatus: string | null = null;
  if (payment.appointmentId) {
    const appointment = await (c as any).db.query.appointments.findFirst({
      where: eq(appointments.id, payment.appointmentId),
      columns: { status: true },
    });
    appointmentStatus = appointment?.status ?? null;
  }

  return c.json({ status: payment.status, appointmentStatus }, 200);
});
