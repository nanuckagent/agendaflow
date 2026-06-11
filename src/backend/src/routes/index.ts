/**
 * API routes index
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../app.js';

export const apiRoutes = new Hono<{ Variables: RequestVariables }>();

// TODO: Add workspace routes
// apiRoutes.route('/workspaces', workspaceRoutes);

// TODO: Add appointment routes
// apiRoutes.route('/appointments', appointmentRoutes);

// TODO: Add professional routes
// apiRoutes.route('/professionals', professionalRoutes);

// TODO: Add service routes
// apiRoutes.route('/services', serviceRoutes);

// TODO: Add payment routes
// apiRoutes.route('/payments', paymentRoutes);

// Healthcheck endpoint
apiRoutes.get('/health', (c) => {
  return c.json({ status: 'ok' });
});
