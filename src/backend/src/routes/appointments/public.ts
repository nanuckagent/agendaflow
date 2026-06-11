/**
 * Public appointment booking routes
 * These routes are accessible without authentication
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { appointmentSchema, safeParse } from '../../lib/validation.js';
import { AppointmentService } from '../../services/appointment.service.js';

export const publicAppointmentRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/appointments/book - Public appointment booking
publicAppointmentRoutes.post('/appointments/book', async (c) => {
  const logger = c.get('logger');
  const workspaceId = c.req.header('X-Workspace-Id');

  if (!workspaceId) {
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

  const body = await c.req.json();

  // Validate input
  const { data, error } = await safeParse(appointmentSchema, body);

  if (error) {
    return c.json(error, 422);
  }

  try {
    const appointmentService = new AppointmentService((c as any).db);

    const appointment = await appointmentService.bookAppointment(workspaceId, {
      clientName: data!.clientName,
      clientPhone: data!.clientPhone,
      clientEmail: data!.clientEmail,
      professionalId: data!.professionalId,
      serviceId: data!.serviceId,
      appointmentDate: data!.appointmentDate,
      appointmentTime: data!.appointmentTime,
      notes: data!.notes,
    });

    logger.info({ appointmentId: appointment.id, workspaceId }, 'Appointment booked');

    // TODO: Send confirmation email
    // TODO: Queue SMS notification

    return c.json(
      {
        id: appointment.id,
        code: appointment.code,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
      },
      201
    );
  } catch (error) {
    logger.error(error, 'Appointment booking error');

    const message = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        type: 'https://agendaflow.local/errors/booking-error',
        title: 'Booking Error',
        status: 400,
        detail: message,
      },
      400
    );
  }
});

// GET /v1/appointments/:code - Get appointment by public code
publicAppointmentRoutes.get('/appointments/:code', async (c) => {
  const { code } = c.req.param();
  const workspaceId = c.req.header('X-Workspace-Id');
  const logger = c.get('logger');

  if (!workspaceId) {
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

  try {
    const appointment = await (c as any).db.query.appointments.findFirst({
      where: (appointments: any) =>
        appointments.code === code && appointments.workspaceId === workspaceId,
    });

    if (!appointment) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Appointment not found',
        },
        404
      );
    }

    return c.json(
      {
        id: appointment.id,
        code: appointment.code,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        durationMinutes: appointment.durationMinutes,
        clientName: appointment.clientName,
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Error fetching appointment');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/server-error',
        title: 'Server Error',
        status: 500,
        detail: 'Failed to fetch appointment',
      },
      500
    );
  }
});

// POST /v1/appointments/:code/cancel - Cancel appointment with token
publicAppointmentRoutes.post('/appointments/:code/cancel', async (c) => {
  const { code } = c.req.param();
  const workspaceId = c.req.header('X-Workspace-Id');
  const logger = c.get('logger');

  const { cancellationToken } = (await c.req.json()) as { cancellationToken?: string };

  if (!workspaceId) {
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

  try {
    const appointment = await (c as any).db.query.appointments.findFirst({
      where: (appointments: any) =>
        appointments.code === code && appointments.workspaceId === workspaceId,
    });

    if (!appointment) {
      return c.json(
        {
          type: 'https://agendaflow.local/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Appointment not found',
        },
        404
      );
    }

    const appointmentService = new AppointmentService((c as any).db);

    const updated = await appointmentService.cancelAppointment(
      appointment.id,
      workspaceId,
      cancellationToken
    );

    logger.info({ appointmentId: appointment.id }, 'Appointment cancelled');

    // TODO: Send cancellation email

    return c.json({ status: updated.status }, 200);
  } catch (error) {
    logger.error(error, 'Appointment cancellation error');

    const message = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        type: 'https://agendaflow.local/errors/cancellation-error',
        title: 'Cancellation Error',
        status: 400,
        detail: message,
      },
      400
    );
  }
});
