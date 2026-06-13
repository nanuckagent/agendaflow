import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header.js';
import { Sidebar } from '@/components/layout/Sidebar.js';
import { EmailVerificationBanner } from '@/components/layout/EmailVerificationBanner.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { apiClient } from '@/lib/api.js';
import { useWorkspace } from '@/queries/workspaces.js';
import { applyWorkspaceTheme } from '@/lib/colors.js';
import '@/i18n/index.js';

export const Route = createRootRoute({
  component: RootLayout,
});

const PUBLIC_PREFIXES = [
  '/booking',
  '/b/',
  '/oauth',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { token, user, setUser } = useAuthStore();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isPublicPage =
    location.pathname === '/' ||
    PUBLIC_PREFIXES.some((p) => location.pathname === p || location.pathname.startsWith(p));

  // Apply tenant branding colors on dashboard pages
  const { data: themeWorkspace } = useWorkspace(
    (!isPublicPage && (user as any)?.workspaceId) || ''
  );
  useEffect(() => {
    if (themeWorkspace) {
      applyWorkspaceTheme({
        primaryColor: themeWorkspace.primaryColor || '#3b5bdb',
        sidebarColor: themeWorkspace.sidebarColor || '#1a2d7a',
        accentColor: themeWorkspace.accentColor || '#0066cc',
      });
    }
  }, [themeWorkspace]);

  // Re-hydrate user (emailVerified, workspaceId) from the API on dashboard pages
  useEffect(() => {
    if (isPublicPage || !token) return;

    apiClient
      .get<{ user: { id: string; email: string; firstName: string | null; lastName: string | null; workspaceId: string; emailVerified: boolean } }>(
        '/v1/auth/me'
      )
      .then(({ user: me }) => {
        setUser({
          id: me.id,
          email: me.email,
          name: [me.firstName, me.lastName].filter(Boolean).join(' '),
          workspaceId: me.workspaceId,
          emailVerified: me.emailVerified,
          createdAt: '',
          updatedAt: '',
        });
      })
      .catch(() => {
        // 401 already handled by apiClient (logout + redirect)
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublicPage, token]);

  if (isPublicPage) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        {user?.emailVerified === false && <EmailVerificationBanner />}

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
