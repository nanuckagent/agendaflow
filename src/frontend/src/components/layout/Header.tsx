/**
 * Header component with navigation and workspace switcher
 */

import { useAuth } from '@/hooks/useAuth.js';
import { useWorkspace } from '@/hooks/useWorkspace.js';
import { useNavigate } from '@tanstack/react-router';
import { Menu, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeWorkspaceId, workspaces, setActiveWorkspace, currentWorkspace } = useWorkspace();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Logo and menu toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-500 hover:text-gray-900 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-xl font-bold text-gray-900">AgendaFlow</h1>
          </div>
        </div>

        {/* Right side - Workspace switcher and user menu */}
        <div className="flex items-center gap-4">
          {/* Workspace switcher */}
          {workspaces.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Workspace menu"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {currentWorkspace?.name || 'Workspace'}
                  </p>
                </div>
                <ChevronDown size={18} className="text-gray-500" />
              </button>

              {showWorkspaceMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => {
                          setActiveWorkspace(workspace.id);
                          setShowWorkspaceMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          activeWorkspaceId === workspace.id
                            ? 'bg-blue-50 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {workspace.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="User menu"
            >
              <User size={20} className="text-gray-500" />
              <ChevronDown size={18} className="text-gray-500 hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  {user && (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigate({ to: '/settings' });
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 first:rounded-t-none last:rounded-b-none"
                >
                  <User size={16} />
                  {t('nav.profile')}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-200"
                >
                  <LogOut size={16} />
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
