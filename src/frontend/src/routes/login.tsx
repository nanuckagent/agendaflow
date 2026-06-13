/**
 * Email/password login route
 */

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { useWorkspaceStore } from '@/stores/workspace-store.js';
import { ArrowRight } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton.js';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { setUser, setToken } = useAuthStore();
  const { setActiveWorkspace } = useWorkspaceStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      navigate({ to: '/dashboard' });
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/v1/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || t('auth.invalidCredentials'));
        return;
      }

      setToken(data.accessToken);
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: [data.user.firstName, data.user.lastName].filter(Boolean).join(' '),
        workspaceId: data.user.workspaceId,
        emailVerified: data.user.emailVerified,
        createdAt: '',
        updatedAt: '',
      });
      setActiveWorkspace(data.user.workspaceId);

      navigate({ to: '/dashboard' });
    } catch {
      setError(t('auth.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AgendaFlow</h1>
          <p className="text-gray-600 mt-2">{t('auth.signInToAccount')}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? t('auth.signingIn') : t('auth.login')}
            {!loading && <ArrowRight size={20} />}
          </button>

          <GoogleAuthButton mode="login" />

          <p className="text-sm text-gray-600 text-center">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              {t('auth.signup')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
