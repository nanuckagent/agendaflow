/**
 * Email verification route (consumes ?token=)
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store.js';

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
});

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailPage() {
  const { t } = useTranslation();
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;

    fetch(`${import.meta.env.VITE_API_URL || ''}/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          setStatus('success');
          const { user, setUser } = useAuthStore.getState();
          if (user) {
            setUser({ ...user, emailVerified: true });
          }
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AgendaFlow</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          {status === 'verifying' && (
            <>
              <Loader2 size={40} className="text-blue-600 mx-auto animate-spin" />
              <p className="text-gray-600">{t('auth.verifyingEmail')}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 size={40} className="text-green-600 mx-auto" />
              <p className="text-gray-900 font-semibold">{t('auth.emailVerifiedTitle')}</p>
              <p className="text-sm text-gray-600">{t('auth.emailVerifiedDesc')}</p>
              <Link
                to="/dashboard"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('auth.goToDashboard')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={40} className="text-red-600 mx-auto" />
              <p className="text-gray-900 font-semibold">{t('auth.emailVerifyFailedTitle')}</p>
              <p className="text-sm text-gray-600">{t('auth.emailVerifyFailedDesc')}</p>
              <Link to="/login" className="text-blue-600 font-medium hover:underline text-sm">
                {t('auth.backToLogin')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
