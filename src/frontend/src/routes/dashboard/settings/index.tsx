/**
 * Workspace settings page
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useWorkspace } from '@/hooks/useWorkspace.js';
import { useUpdateBranding } from '@/queries/workspaces.js';
import { BrandingPreview } from '@/components/workspace/BrandingPreview.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/')({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { activeWorkspaceId, branding } = useWorkspace();
  const { mutate: updateBranding, isPending } = useUpdateBranding();

  const [colors, setColors] = useState({
    primaryColor: '#3b5bdb',
    sidebarColor: '#1a2d7a',
    accentColor: '#0066cc',
  });

  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (branding) {
      setColors({
        primaryColor: branding.primaryColor || '#3b5bdb',
        sidebarColor: branding.sidebarColor || '#1a2d7a',
        accentColor: branding.accentColor || '#0066cc',
      });
      setLogoUrl(branding.logoUrl);
    }
  }, [branding]);

  if (!isLoggedIn || !activeWorkspaceId) {
    return null;
  }

  const handleSave = () => {
    setSuccess(false);
    updateBranding(
      {
        workspaceId: activeWorkspaceId,
        data: {
          primaryColor: colors.primaryColor,
          sidebarColor: colors.sidebarColor,
          accentColor: colors.accentColor,
          logoUrl,
        },
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">{t('settings.subtitle')}</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <AlertCircle className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">{t('settings.updated')}</h3>
            <p className="text-green-700 text-sm">{t('settings.brandingUpdated')}</p>
          </div>
        </div>
      )}

      {/* Branding tab */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.workspaceBranding')}</h2>

        <BrandingPreview
          primaryColor={colors.primaryColor}
          sidebarColor={colors.sidebarColor}
          accentColor={colors.accentColor}
          logoUrl={logoUrl}
          onPrimaryChange={(color) =>
            setColors({ ...colors, primaryColor: color })
          }
          onSidebarChange={(color) =>
            setColors({ ...colors, sidebarColor: color })
          }
          onAccentChange={(color) =>
            setColors({ ...colors, accentColor: color })
          }
          onLogoChange={setLogoUrl}
        />

        <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={() => navigate({ to: '/dashboard' })}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('common.saving') : t('common.saveChanges')}
          </button>
        </div>
      </div>

      {/* Members section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.teamMembers')}</h2>

        <div className="space-y-4 pb-6 border-b border-gray-200 mb-6">
          <div>
            <label className="label-base">{t('settings.inviteTeamMember')}</label>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder={t('settings.memberEmailPlaceholder')}
                className="input-base flex-1"
              />
              <button className="btn-primary">{t('settings.invite')}</button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">{t('settings.currentMembers')}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{t('settings.you')}</p>
                <p className="text-sm text-gray-600">{t('settings.owner')}</p>
              </div>
              <span className="text-sm font-medium text-gray-600">{t('settings.owner')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace info */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('settings.workspaceInfo')}</h2>

        <div className="space-y-4">
          <div>
            <label className="label-base">{t('settings.workspaceId')}</label>
            <input
              type="text"
              value={activeWorkspaceId}
              disabled
              className="input-base w-full bg-gray-50 text-gray-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-base">{t('settings.timezone')}</label>
              <select className="input-base w-full">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>

            <div>
              <label className="label-base">{t('settings.currency')}</label>
              <select className="input-base w-full">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>BRL</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card border-red-200 bg-red-50">
        <h2 className="text-xl font-semibold text-red-900 mb-4">{t('settings.dangerZone')}</h2>
        <p className="text-red-700 mb-4">
          {t('settings.dangerZoneWarning')}
        </p>
        <button className="text-red-600 border border-red-300 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors">
          {t('settings.deleteWorkspace')}
        </button>
      </div>
    </div>
  );
}
