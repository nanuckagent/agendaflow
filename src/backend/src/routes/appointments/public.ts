/**
 * Public appointment booking routes
 * These routes are accessible without authentication
 */

import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import type { RequestVariables } from '../../app.js';
import { appointments, services, workspaces } from '../../db/schema/index.js';
import { appointmentSchema, safeParse } from '../../lib/validation.js';
import { AppointmentService } from '../../services/appointment.service.js';
import { PaymentService } from '../../services/payment.service.js';

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
    const db = (c as any).db;
    const appointmentService = new AppointmentService(db);

    let appointment = await appointmentService.bookAppointment(workspaceId, {
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

    // PIX upfront payment when the tenant enabled online payments
    let paymentInfo: {
      id: string;
      qrCode: string | null;
      qrCodeBase64: string | null;
      amountInCents: number;
    } | null = null;

    try {
      const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, workspaceId),
        columns: { id: true, onlinePaymentsEnabled: true, mercadopagoAccessTokenEnc: true },
      });

      const service = await db.query.services.findFirst({
        where: and(eq(services.id, data!.serviceId), eq(services.workspaceId, workspaceId)),
        columns: { name: true, priceInCents: true },
      });

      if (
        workspace?.onlinePaymentsEnabled &&
        workspace.mercadopagoAccessTokenEnc &&
        service &&
        service.priceInCents > 0
      ) {
        const paymentService = new PaymentService(db);
        const payment = await paymentService.createPixPayment(
          workspace as { id: string; mercadopagoAccessTokenEnc: string },
          appointment,
          service,
          data!.clientEmail
        );

        const [updated] = await db
          .update(appointments)
          .set({ status: 'pending_payment', updatedAt: new Date() })
          .where(and(eq(appointments.id, appointment.id), eq(appointments.workspaceId, workspaceId)))
          .returning();
        appointment = updated;

        const metadata = (payment.metadata ?? {}) as Record<string, any>;
        paymentInfo = {
          id: payment.id,
          qrCode: metadata.qrCode ?? null,
          qrCodeBase64: metadata.qrCodeBase64 ?? null,
          amountInCents: payment.amountInCents,
        };

        logger.info({ appointmentId: appointment.id, paymentId: payment.id }, 'PIX payment created');
      }
    } catch (paymentError) {
      // Degrade gracefully: booking stays valid as a regular pending appointment
      logger.error(paymentError, 'PIX payment creation failed - booking kept as pending');
    }

    return c.json(
      {
        id: appointment.id,
        code: appointment.code,
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        payment: paymentInfo,
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
