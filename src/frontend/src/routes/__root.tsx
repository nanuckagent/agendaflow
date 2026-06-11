import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header.js';
import { Sidebar } from '@/components/layout/Sidebar.js';
import '@/i18n/index.js';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Check if we're on a public page (booking, oauth, etc)
  const isPublicPage = ['/booking', '/oauth', '/'].includes(location.pathname) || location.pathname.startsWith('/booking');

  if (isPublicPage) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
