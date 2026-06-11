/**
 * Payment service
 * Handles payment processing and webhook handling
 */

import { eq, and } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { payments } from '../db/schema/index.js';

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
   * Handle MercadoPago webhook
   */
  async handleMercadopagoWebhook(data: any) {
    // TODO: Verify webhook signature
    // TODO: Parse payment data
    // TODO: Update payment status
    // TODO: Trigger appointment confirmation if payment approved

    return data;
  }
}
