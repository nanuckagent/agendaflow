/**
 * OAuth callback route - handles Google OAuth redirect
 */

import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store.js';
import { useWorkspaceStore } from '@/stores/workspace-store.js';

interface SearchParams {
  code?: string;
  state?: string;
  error?: string;
}

export const Route = createFileRoute('/oauth/callback')({
  validateSearch: (search: Record<string, any>): SearchParams => ({
    code: search.code as string | undefined,
    state: search.state as string | undefined,
    error: search.error as string | undefined,
  }),
  component: OAuthCallback,
});

function OAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code, error } = useSearch({ from: '/oauth/callback' });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { setUser, setToken } = useAuthStore();
  const { setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    // Handle OAuth errors
    if (error) {
      setErrorMessage(t('auth.oauthError', { error }));
      setTimeout(() => {
        navigate({ to: '/' });
      }, 3000);
      return;
    }

    // Handle successful callback with code
    if (!code) {
      setErrorMessage(t('auth.noAuthCode'));
      setTimeout(() => {
        navigate({ to: '/' });
      }, 3000);
      return;
    }

    // Exchange code for token
    const exchangeCode = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/v1/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || t('auth.oauthExchangeFailed'));
        }

        const data = await response.json();

        // Store token and user info
        if (data.token && data.user) {
          setToken(data.token);
          setUser(data.user);

          // Store workspaces if provided
          if (data.workspaces && Array.isArray(data.workspaces)) {
            setWorkspaces(data.workspaces);
            if (data.workspaces.length > 0) {
              setActiveWorkspace(data.workspaces[0].id);
            }
          }

          // Redirect to dashboard or onboarding
          if (data.workspaces && data.workspaces.length > 0) {
            navigate({ to: '/dashboard' });
          } else {
            navigate({ to: '/onboarding' });
          }
        } else {
          throw new Error(t('auth.invalidServerResponse'));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t('auth.authFailed');
        setErrorMessage(message);
        setTimeout(() => {
          navigate({ to: '/' });
        }, 3000);
      }
    };

    exchangeCode();
  }, [code, error, navigate, setUser, setToken, setWorkspaces, setActiveWorkspace]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {errorMessage ? (
          <div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">{t('auth.authErrorTitle')}</h1>
            <p className="text-red-700 mb-4">{errorMessage}</p>
            <p className="text-gray-600 text-sm">{t('auth.redirectingHome')}</p>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('auth.authenticating')}</h1>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600 mt-4">{t('auth.authenticatingWait')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
