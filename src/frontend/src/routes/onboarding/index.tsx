/**
 * Workspace onboarding route
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateWorkspace } from '@/queries/workspaces.js';
import { useWorkspaceStore } from '@/stores/workspace-store.js';
import { BrandingPreview } from '@/components/workspace/BrandingPreview.js';
import { useAuth } from '@/hooks/useAuth.js';
import { AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const { mutate: createWorkspace, isPending, error } = useCreateWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    primaryColor: '#3b5bdb',
    sidebarColor: '#1a2d7a',
    accentColor: '#0066cc',
    timezone: 'UTC',
    currency: 'USD',
  });

  // Redirect if not logged in
  if (!isLoggedIn) {
    navigate({ to: '/' });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert(t('onboarding.enterName'));
      return;
    }

    createWorkspace(
      {
        name: formData.name,
        primaryColor: formData.primaryColor,
        sidebarColor: formData.sidebarColor,
        accentColor: formData.accentColor,
        timezone: formData.timezone,
        currency: formData.currency,
      },
      {
        onSuccess: (workspace) => {
          addWorkspace({
            id: workspace.id,
            slug: workspace.slug,
            name: workspace.name,
            timezone: workspace.timezone,
            currency: workspace.currency,
          });
          setActiveWorkspace(workspace.id);
          navigate({ to: '/dashboard' });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('onboarding.title')}</h1>
          <p className="text-gray-600 mt-2">
            {t('onboarding.subtitle')}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">{t('onboarding.errorCreating')}</h3>
              <p className="text-red-700 text-sm">
                {error instanceof Error ? error.message : t('onboarding.genericError')}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('settings.workspaceInfo')}</h2>

            <div className="space-y-4">
              <div>
                <label className="label-base">{t('onboarding.workspaceName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('onboarding.namePlaceholder')}
                  className="input-base w-full"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-base">{t('settings.timezone')}</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="input-base w-full"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                  </select>
                </div>

                <div>
                  <label className="label-base">{t('settings.currency')}</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="input-base w-full"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="BRL">BRL</option>
                    <option value="JPY">JPY</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('onboarding.brandingColors')}</h2>

            <BrandingPreview
              primaryColor={formData.primaryColor}
              sidebarColor={formData.sidebarColor}
              accentColor={formData.accentColor}
              onPrimaryChange={(color) =>
                setFormData({ ...formData, primaryColor: color })
              }
              onSidebarChange={(color) =>
                setFormData({ ...formData, sidebarColor: color })
              }
              onAccentChange={(color) =>
                setFormData({ ...formData, accentColor: color })
              }
            />
          </div>

          {/* Submit button */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate({ to: '/' })}
              className="btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending || !formData.name.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? t('onboarding.creating') : t('onboarding.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
