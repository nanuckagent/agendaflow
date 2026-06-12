/**
 * Sidebar navigation component
 */

import { useNavigate, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  Briefcase,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth.js';
import { useWorkspace } from '@/queries/workspaces.js';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: workspace } = useWorkspace((user as any)?.workspaceId || '');

  const navItems: NavItem[] = [
    {
      label: t('nav.dashboard'),
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: t('nav.appointments'),
      href: '/dashboard/appointments',
      icon: <Calendar size={20} />,
    },
    {
      label: t('nav.professionals'),
      href: '/dashboard/professionals',
      icon: <Users size={20} />,
    },
    {
      label: t('nav.services'),
      href: '/dashboard/services',
      icon: <Briefcase size={20} />,
    },
    ...(workspace?.storeEnabled
      ? [
          {
            label: t('nav.products'),
            href: '/dashboard/products',
            icon: <ShoppingBag size={20} />,
          },
        ]
      : []),
    {
      label: t('nav.settings'),
      href: '/dashboard/settings',
      icon: <Settings size={20} />,
    },
  ];

  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  const handleNavigate = (href: string) => {
    navigate({ to: href as any });
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-gray-900 text-white shadow-lg transform transition-transform duration-300 z-40 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-screen flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold">{t('common.menu')}</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-800 rounded-lg lg:hidden"
              aria-label={t('common.close')}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <button
                    onClick={() => handleNavigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            {user && (
              <div className="px-4 py-3 rounded-lg bg-gray-800">
                <p className="text-sm text-gray-300">{t('common.loggedInAs')}</p>
                <p className="text-sm font-medium text-white truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
