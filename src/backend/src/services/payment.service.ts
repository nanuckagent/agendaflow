/**
 * Payment service
 * Handles per-tenant MercadoPago PIX payments and webhook processing
 */

import { eq, and } from 'drizzle-orm';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import type { Database } from '../db/index.js';
import { appointments, payments, workspaces } from '../db/schema/index.js';
import { decryptPII } from '../lib/crypto.js';
import { env } from '../env.js';

export function mercadopagoTokenKey(workspaceId: string): string {
  return `${env.JWT_SECRET}:${workspaceId}`;
}

interface CreatePaymentInput {
  appointmentId?: string;
  externalId: string;
  status: string;
  amountInCents: number;
  currency?: string;
  paymentMethod?: string;
  clientEmail?: string;
  metadata?: Record<string, any>;
}

interface UpdatePaymentInput {
  status?: string;
  metadata?: Record<string, any>;
}

interface PixWorkspace {
  id: string;
  mercadopagoAccessTokenEnc: string;
}

interface PixAppointment {
  id: string;
  code: string | null;
}

interface PixService {
  name: string;
  priceInCents: number;
}

export class PaymentService {
  constructor(private db: Database) {}

  /**
   * Create a new payment record
   */
  async createPayment(workspaceId: string, input: CreatePaymentInput) {
    const result = await this.db
      .insert(payments)
      .values({
        workspaceId,
        appointmentId: input.appointmentId,
        externalId: input.externalId,
        status: input.status,
        amountInCents: input.amountInCents,
        currency: input.currency || 'BRL',
        paymentMethod: input.paymentMethod,
        clientEmail: input.clientEmail,
        metadata: input.metadata,
      })
      .returning();

    return result[0];
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string, workspaceId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: and(eq(payments.id, paymentId), eq(payments.workspaceId, workspaceId)),
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  /**
   * Get payment by external ID (from payment processor)
   */
  async getPaymentByExternalId(externalId: string, workspaceId: string) {
    return this.db.query.payments.findFirst({
      where: and(eq(payments.externalId, externalId), eq(payments.workspaceId, workspaceId)),
    });
  }

  /**
   * List payments for workspace
   */
  async listPayments(workspaceId: string, filters?: { appointmentId?: string; status?: string }) {
    return this.db.query.payments.findMany({
      where: and(
        eq(payments.workspaceId, workspaceId),
        filters?.appointmentId ? eq(payments.appointmentId, filters.appointmentId) : undefined,
        filters?.status ? eq(payments.status, filters.status) : undefined
      ),
    });
  }

  /**
   * Update payment
   */
  async updatePayment(paymentId: string, workspaceId: string, input: UpdatePaymentInput) {
    const result = await this.db
      .update(payments)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(payments.id, paymentId), eq(payments.workspaceId, workspaceId)))
      .returning();

    return result[0];
  }

  /**
   * Create a PIX payment at MercadoPago using the tenant's own access token
   */
  async createPixPayment(
    workspace: PixWorkspace,
    appointment: PixAppointment,
    service: PixService,
    clientEmail: string
  ) {
    const accessToken = decryptPII(
      workspace.mercadopagoAccessTokenEnc,
      mercadopagoTokenKey(workspace.id)
    );

    const client = new MercadoPagoConfig({ accessToken });
    const mpPayment = new Payment(client);

    const result = await mpPayment.create({
      body: {
        transaction_amount: Math.round(service.priceInCents) / 100,
        description: `${service.name} — ${appointment.code ?? appointment.id.slice(0, 8)}`,
        payment_method_id: 'pix',
        external_reference: appointment.id,
        notification_url: `${env.API_URL}/v1/payments/mercadopago/webhook?workspaceId=${workspace.id}`,
        payer: { email: clientEmail },
      },
    });

    const qrData = result.point_of_interaction?.transaction_data;

    return this.createPayment(workspace.id, {
      appointmentId: appointment.id,
      externalId: String(result.id),
      status: 'pending',
      amountInCents: service.priceInCents,
      paymentMethod: 'pix',
      clientEmail,
      metadata: {
        qrCode: qrData?.qr_code,
        qrCodeBase64: qrData?.qr_code_base64,
        ticketUrl: qrData?.ticket_url,
      },
    });
  }

  /**
   * Process a MercadoPago webhook notification.
   * Never trusts the webhook body: re-fetches the payment from the MP API
   * using the tenant's token. Idempotent — approved payments never regress.
   */
  async processMercadopagoNotification(workspaceId: string, externalId: string) {
    const workspace = await this.db.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
      columns: { id: true, mercadopagoAccessTokenEnc: true },
    });

    if (!workspace?.mercadopagoAccessTokenEnc) {
      return { handled: false, reason: 'workspace-not-configured' };
    }

    const record = await this.getPaymentByExternalId(externalId, workspaceId);

    if (!record) {
      return { handled: false, reason: 'payment-not-found' };
    }

    if (record.status === 'approved') {
      return { handled: true, reason: 'already-approved' };
    }

    const accessToken = decryptPII(
      workspace.mercadopagoAccessTokenEnc,
      mercadopagoTokenKey(workspace.id)
    );
    const client = new MercadoPagoConfig({ accessToken });
    const mpPayment = new Payment(client);

    // Source of truth: the MP API, not the webhook body
    const remote = await mpPayment.get({ id: externalId });
    const remoteStatus = remote.status;

    if (remoteStatus === 'approved') {
      await this.updatePayment(record.id, workspaceId, { status: 'approved' });

      if (record.appointmentId) {
        await this.db
          .update(appointments)
          .set({ status: 'confirmed', updatedAt: new Date() })
          .where(
            and(
              eq(appointments.id, record.appointmentId),
              eq(appointments.workspaceId, workspaceId)
            )
          );
      }

      return { handled: true, status: 'approved' };
    }

    if (remoteStatus === 'rejected' || remoteStatus === 'cancelled') {
      await this.updatePayment(record.id, workspaceId, { status: 'rejected' });

      // Free the slot if the appointment is still waiting on this payment
      if (record.appointmentId) {
        await this.db
          .update(appointments)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(
            and(
              eq(appointments.id, record.appointmentId),
              eq(appointments.workspaceId, workspaceId),
              eq(appointments.status, 'pending_payment')
            )
          );
      }

      return { handled: true, status: 'rejected' };
    }

    return { handled: true, status: remoteStatus ?? 'unknown' };
  }
}
