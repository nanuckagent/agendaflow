/**
 * Banner prompting the user to verify their email address
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MailWarning } from 'lucide-react';
import { apiClient } from '@/lib/api.js';
import { useAuthStore } from '@/stores/auth-store.js';

export function EmailVerificationBanner() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified !== false) {
    return null;
  }

  const resend = async () => {
    setSending(true);
    try {
      await apiClient.post('/v1/auth/resend-verification');
      setSent(true);
    } catch {
      // rate-limited or transient error; keep the button available
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex flex-wrap items-center gap-3 text-sm text-amber-800">
        <MailWarning size={18} className="shrink-0" />
        <span className="flex-1 min-w-48">
          {t('auth.verifyEmailBanner', { email: user.email })}
        </span>
        {sent ? (
          <span className="font-medium">{t('auth.verificationEmailSent')}</span>
        ) : (
          <button
            onClick={resend}
            disabled={sending}
            className="font-semibold underline hover:text-amber-900 disabled:opacity-60"
          >
            {sending ? t('auth.sending') : t('auth.resendVerification')}
          </button>
        )}
      </div>
    </div>
  );
}
