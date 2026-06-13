/**
 * MercadoPago webhook route.
 * The webhook body is never trusted: the payment is re-fetched from the
 * MP API with the tenant's token before any state change.
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';
import { PaymentService } from '../../services/payment.service.js';

export const mercadopagoRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/payments/mercadopago/webhook?workspaceId= - MercadoPago notification
mercadopagoRoutes.post('/mercadopago/webhook', async (c) => {
  const logger = c.get('logger');

  try {
    const workspaceId = c.req.query('workspaceId');
    const body = await c.req.json().catch(() => ({} as any));

    // MP sends the payment id either as data.id (webhooks) or ?id= (IPN)
    const externalId = String(body?.data?.id || c.req.query('id') || '');

    if (!workspaceId || !externalId || externalId === 'undefined') {
      logger.warn({ workspaceId, externalId }, 'MercadoPago webhook missing identifiers');
      return c.json({ received: true }, 200);
    }

    const paymentService = new PaymentService((c as any).db);
    const result = await paymentService.processMercadopagoNotification(workspaceId, externalId);

    logger.info({ workspaceId, externalId, result }, 'MercadoPago webhook processed');

    return c.json({ received: true }, 200);
  } catch (error) {
    logger.error(error, 'MercadoPago webhook error');
    // Always 200: MP retries on non-2xx, and we never want to leak state
    return c.json({ received: true }, 200);
  }
});
