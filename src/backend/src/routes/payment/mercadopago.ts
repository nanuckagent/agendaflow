/**
 * MercadoPago payment routes
 * Handles payment processing and webhooks
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../../app.js';

export const mercadopagoRoutes = new Hono<{ Variables: RequestVariables }>();

// POST /v1/payments/mercadopago/webhook - MercadoPago webhook
mercadopagoRoutes.post('/mercadopago/webhook', async (c) => {
  const logger = c.get('logger');

  try {
    const body = await c.req.json();

    logger.info({ body }, 'MercadoPago webhook received');

    // TODO: Verify webhook signature
    // TODO: Update payment status in database
    // TODO: Update appointment status if payment approved
    // TODO: Send confirmation email

    return c.json({ received: true }, 200);
  } catch (error) {
    logger.error(error, 'MercadoPago webhook error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/webhook-error',
        title: 'Webhook Error',
        status: 500,
        detail: 'Failed to process webhook',
      },
      500
    );
  }
});

// POST /v1/payments/mercadopago/checkout - Create payment
mercadopagoRoutes.post('/mercadopago/checkout', async (c) => {
  const logger = c.get('logger');

  try {
    const { appointmentId, amount } = await c.req.json();

    // TODO: Create MercadoPago preference
    // TODO: Store pending payment in database
    // TODO: Return preference URL for client

    logger.info({ appointmentId, amount }, 'Payment checkout created');

    return c.json(
      {
        preferenceUrl: 'https://mercadopago.com.ar/checkout/...',
      },
      200
    );
  } catch (error) {
    logger.error(error, 'Payment checkout error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/payment-error',
        title: 'Payment Error',
        status: 500,
        detail: 'Failed to create payment',
      },
      500
    );
  }
});
