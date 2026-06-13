/**
 * API routes index
 */

import { Hono } from 'hono';
import type { RequestVariables } from '../app.js';
import { loginRoutes } from './auth/login.js';
import { registerRoutes } from './auth/register.js';
import { googleOAuthRoutes } from './auth/oauth-google.js';
import { passwordResetRoutes } from './auth/password-reset.js';
import { emailVerificationRoutes } from './auth/email-verification.js';
import { rateLimit } from '../lib/rate-limit.js';
import { workspaceRoutes } from './workspaces/index.js';
import { adminAppointmentRoutes } from './appointments/admin.js';
import { publicAppointmentRoutes } from './appointments/public.js';
import { publicDiscoveryRoutes } from './public/index.js';
import { professionalRoutes } from './professionals/index.js';
import { serviceRoutes } from './services/index.js';
import { productRoutes } from './products/index.js';
import { mercadopagoRoutes } from './payment/mercadopago.js';

export const apiRoutes = new Hono<{ Variables: RequestVariables }>();

// Auth: /v1/auth/login, /v1/auth/register, /v1/auth/refresh, /v1/auth/logout, /v1/auth/google
apiRoutes.use('/auth/register', rateLimit({ prefix: 'register', limit: 5, windowSec: 900 }));
apiRoutes.use('/auth/login', rateLimit({ prefix: 'login', limit: 10, windowSec: 900 }));
apiRoutes.use('/auth/forgot-password', rateLimit({ prefix: 'forgotpw', limit: 5, windowSec: 900 }));
apiRoutes.use('/auth/reset-password', rateLimit({ prefix: 'resetpw', limit: 10, windowSec: 900 }));
apiRoutes.use('/auth/resend-verification', rateLimit({ prefix: 'resendverify', limit: 3, windowSec: 900 }));
apiRoutes.route('/auth', loginRoutes);
apiRoutes.route('/auth', registerRoutes);
apiRoutes.route('/auth', googleOAuthRoutes);
apiRoutes.route('/auth', passwordResetRoutes);
apiRoutes.route('/auth', emailVerificationRoutes);

// Workspaces: /v1/workspaces, /v1/user/workspaces
apiRoutes.route('/', workspaceRoutes);

// Appointments: /v1/appointments (admin) and /v1/appointments/book (public)
apiRoutes.route('/', adminAppointmentRoutes);
apiRoutes.route('/', publicAppointmentRoutes);

// Public booking discovery: /v1/public/workspaces/:slug, /v1/public/professionals, /v1/public/services
apiRoutes.route('/', publicDiscoveryRoutes);

// Professionals and services: /v1/professionals, /v1/services
apiRoutes.route('/', professionalRoutes);
apiRoutes.route('/', serviceRoutes);

// Products (store module): /v1/products
apiRoutes.route('/', productRoutes);

// Payments: /v1/payments/mercadopago/*
apiRoutes.use('/payments/mercadopago/webhook', rateLimit({ prefix: 'mpwebhook', limit: 60, windowSec: 60 }));
apiRoutes.route('/payments', mercadopagoRoutes);

// Healthcheck endpoint
apiRoutes.get('/health', (c) => {
  return c.json({ status: 'ok' });
});
