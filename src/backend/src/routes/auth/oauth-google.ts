/**
 * Google OAuth routes
 * Handles OAuth consent screen redirect and callback
 */

import { Hono } from 'hono';
import { OAuth2Client } from 'google-auth-library';
import type { RequestVariables } from '../../app.js';

export const googleOAuthRoutes = new Hono<{ Variables: RequestVariables }>();

// GET /v1/auth/google - Redirect to Google consent screen
googleOAuthRoutes.get('/google', (c) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/v1/auth/google/callback';

  if (!clientId) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/config-error',
        title: 'Configuration Error',
        status: 500,
        detail: 'Google OAuth is not configured',
      },
      500
    );
  }

  const oauth2Client = new OAuth2Client(clientId, process.env.GOOGLE_CLIENT_SECRET, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });

  return c.redirect(authUrl);
});

// GET /v1/auth/google/callback - Exchange code for tokens
googleOAuthRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    return c.json(
      {
        type: 'https://agendaflow.local/errors/oauth-error',
        title: 'OAuth Error',
        status: 400,
        detail: 'No authorization code provided',
      },
      400
    );
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/v1/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // TODO: Verify ID token and extract user info
    // TODO: Find or create user in database
    // TODO: Find or create workspace
    // TODO: Generate JWT tokens
    // TODO: Set httpOnly cookies
    // TODO: Redirect to frontend with success

    return c.json(
      {
        message: 'OAuth callback received',
        code,
      },
      200
    );
  } catch (error) {
    const logger = c.get('logger');
    logger.error(error, 'OAuth callback error');

    return c.json(
      {
        type: 'https://agendaflow.local/errors/oauth-error',
        title: 'OAuth Error',
        status: 400,
        detail: error instanceof Error ? error.message : 'OAuth callback failed',
      },
      400
    );
  }
});
