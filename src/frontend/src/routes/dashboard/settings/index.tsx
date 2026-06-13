/**
 * Workspace settings page
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth.js';
import { useWorkspace } from '@/hooks/useWorkspace.js';
import { useUpdateBranding, useWorkspace as useWorkspaceQuery } from '@/queries/workspaces.js';
import { BrandingPreview } from '@/components/workspace/BrandingPreview.js';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api.js';

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
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [currency, setCurrency] = useState('BRL');
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(false);
  const [mpToken, setMpToken] = useState('');
  const [mpSaving, setMpSaving] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: workspaceData } = useWorkspaceQuery(activeWorkspaceId || '');

  useEffect(() => {
    if (workspaceData) {
      setTimezone(workspaceData.timezone || 'America/Sao_Paulo');
      setCurrency(workspaceData.currency || 'BRL');
      setStoreEnabled(!!workspaceData.storeEnabled);
      setWhatsappNumber(workspaceData.whatsappNumber || '');
      setOnlinePaymentsEnabled(!!workspaceData.onlinePaymentsEnabled);
    }
  }, [workspaceData]);

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
          timezone,
          currency,
          storeEnabled,
          whatsappNumber: whatsappNumber.trim() || undefined,
          onlinePaymentsEnabled,
        } as any,
      },
      {
        onSuccess: () => {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
      }
    );
  };

  const handleSaveMpToken = async () => {
    setMpSaving(true);
    setMpError(null);
    try {
      await apiClient.put(`/v1/workspaces/${activeWorkspaceId}/mercadopago-token`, {
        accessToken: mpToken.trim(),
      });
      setMpToken('');
      await queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    } catch {
      setMpError(t('settings.mpTokenError'));
    } finally {
      setMpSaving(false);
    }
  };

  const handleRemoveMpToken = async () => {
    setMpSaving(true);
    setMpError(null);
    try {
      await apiClient.delete(`/v1/workspaces/${activeWorkspaceId}/mercadopago-token`);
      setOnlinePaymentsEnabled(false);
      await queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    } catch {
      setMpError(t('settings.mpTokenError'));
    } finally {
      setMpSaving(false);
    }
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
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input-base w-full"
              >
                <option value="America/Sao_Paulo">America/Sao_Paulo (Brasília)</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="America/Cuiaba">America/Cuiaba</option>
                <option value="America/Fortaleza">America/Fortaleza</option>
                <option value="America/Rio_Branco">America/Rio_Branco</option>
                <option value="America/Noronha">America/Noronha</option>
              </select>
            </div>

            <div>
              <label className="label-base">{t('settings.currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-base w-full"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Store module */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('settings.storeTitle')}</h2>
        <p className="text-gray-600 text-sm mb-6">{t('settings.storeDescription')}</p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={storeEnabled}
              onChange={(e) => setStoreEnabled(e.target.checked)}
              className="rounded border-gray-300 h-5 w-5"
            />
            <span className="font-medium text-gray-900">{t('settings.storeEnable')}</span>
          </label>

          <div>
            <label className="label-base">{t('settings.whatsappNumber')}</label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="(11) 99999-9999"
              className="input-base w-full md:w-1/2"
            />
            <p className="text-sm text-gray-500 mt-1">{t('settings.whatsappHint')}</p>
          </div>

          {storeEnabled && workspaceData?.slug && (
            <p className="text-sm text-gray-600">
              {t('settings.storeUrl')}{' '}
              <span className="font-mono text-blue-700">
                {window.location.origin}/b/{workspaceData.slug}/loja
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('common.saving') : t('common.saveChanges')}
          </button>
        </div>
      </div>

      {/* Payments module */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('settings.paymentsTitle')}</h2>
        <p className="text-gray-600 text-sm mb-6">{t('settings.paymentsDescription')}</p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={onlinePaymentsEnabled}
              onChange={(e) => setOnlinePaymentsEnabled(e.target.checked)}
              className="rounded border-gray-300 h-5 w-5"
            />
            <span className="font-medium text-gray-900">{t('settings.paymentsEnable')}</span>
          </label>

          {workspaceData?.mercadopagoConfigured ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <p className="font-medium text-green-900">{t('settings.mpTokenConfigured')}</p>
                <p className="text-sm text-green-700 font-mono">APP_USR-••••••••••••••••</p>
              </div>
              <button
                onClick={handleRemoveMpToken}
                disabled={mpSaving}
                className="text-red-600 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {t('settings.mpTokenRemove')}
              </button>
            </div>
          ) : (
            <div>
              <label className="label-base">{t('settings.mpTokenLabel')}</label>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={mpToken}
                  onChange={(e) => setMpToken(e.target.value)}
                  placeholder="APP_USR-..."
                  autoComplete="off"
                  className="input-base flex-1"
                />
                <button
                  onClick={handleSaveMpToken}
                  disabled={mpSaving || mpToken.trim().length < 10}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {mpSaving ? t('common.saving') : t('common.save')}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{t('settings.mpTokenHint')}</p>
            </div>
          )}

          {mpError && <p className="text-sm text-red-600">{mpError}</p>}

          {onlinePaymentsEnabled && !workspaceData?.mercadopagoConfigured && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              {t('settings.paymentsNeedToken')}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? t('common.saving') : t('common.saveChanges')}
          </button>
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
