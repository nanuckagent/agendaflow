/**
 * Admin appointment management routes
 * These routes require authentication and workspace access
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { appointmentSchema, safeParse } from '../../lib/validation.js';
import { AppointmentService } from '../../services/appointment.service.js';
import { requireAuth } from '../../middlewares/auth.js';

export const adminAppointmentRoutes = new Hono<{ Variables: RequestVariables }>();

// GET /v1/appointments - List appointments
adminAppointmentRoutes.get('/appointments', async (c) => {
  const logger = c.get('logger');

  try {
    const { userId, workspaceId } = await requireAuth(c);

    const appointmentService = new AppointmentService((c as any).db);
    const appointments = await appointmentService.listAppointments(workspaceId, {
      limit: 50,
      offset: 0,
    });

    logger.info({ workspaceId, count: appointments.length }, 'Appointments listed');

    return c.json({ data: appointments }, 200);
  } catch (error) {
    logger.error(error, 'Error listing appointments');

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
        detail: 'Failed to list appointments',
      },
      500
    );
  }
});

// GET /v1/appointments/:id - Get appointment details
adminAppointmentRoutes.get('/appointments/:id', async (c) => {
  const { id } = c.req.param();
  const logger = c.get('logger');

  try {
    const { workspaceId } = await requireAuth(c);

    const appointment = await (c as any).db.query.appointments.findFirst({
      where: (appointments: any) => appointments.id === id && appointments.workspaceId === workspaceId,
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

    return c.json(appointment, 200);
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

// PATCH /v1/appointments/:id/confirm - Confirm appointment
adminAppointmentRoutes.patch('/appointments/:id/confirm', async (c) => {
  const { id } = c.req.param();
  const logger = c.get('logger');

  try {
    const { workspaceId } = await requireAuth(c);

    const appointmentService = new AppointmentService((c as any).db);
    const appointment = await appointmentService.confirmAppointment(id, workspaceId);

    logger.info({ appointmentId: id }, 'Appointment confirmed');

    // TODO: Send confirmation email
    // TODO: Queue SMS notification

    return c.json({ status: appointment.status }, 200);
  } catch (error) {
    logger.error(error, 'Error confirming appointment');

    const message = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        type: 'https://agendaflow.local/errors/request-error',
        title: 'Request Error',
        status: 400,
        detail: message,
      },
      400
    );
  }
});

// PATCH /v1/appointments/:id/cancel - Cancel appointment
adminAppointmentRoutes.patch('/appointments/:id/cancel', async (c) => {
  const { id } = c.req.param();
  const logger = c.get('logger');

  try {
    const { workspaceId } = await requireAuth(c);

    const appointmentService = new AppointmentService((c as any).db);
    const appointment = await appointmentService.cancelAppointment(id, workspaceId);

    logger.info({ appointmentId: id }, 'Appointment cancelled');

    // TODO: Send cancellation email
    // TODO: Queue SMS notification

    return c.json({ status: appointment.status }, 200);
  } catch (error) {
    logger.error(error, 'Error cancelling appointment');

    const message = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        type: 'https://agendaflow.local/errors/request-error',
        title: 'Request Error',
        status: 400,
        detail: message,
      },
      400
    );
  }
});

// GET /v1/appointments/slots/:professionalId - Get available slots
adminAppointmentRoutes.get('/appointments/slots/:professionalId', async (c) => {
  const { professionalId } = c.req.param();
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const logger = c.get('logger');

  if (!startDate || !endDate) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'startDate and endDate query parameters are required',
      },
      422
    );
  }

  try {
    const { workspaceId } = await requireAuth(c);

    const appointmentService = new AppointmentService((c as any).db);
    const slots = await appointmentService.getAvailableSlots(
      workspaceId,
      professionalId,
      new Date(startDate),
      new Date(endDate)
    );

    logger.info({ professionalId, startDate, endDate }, 'Available slots retrieved');

    return c.json({ slots }, 200);
  } catch (error) {
    logger.error(error, 'Error fetching available slots');

    const message = error instanceof Error ? error.message : 'Unknown error';

    return c.json(
      {
        type: 'https://agendaflow.local/errors/request-error',
        title: 'Request Error',
        status: 400,
        detail: message,
      },
      400
    );
  }
});
