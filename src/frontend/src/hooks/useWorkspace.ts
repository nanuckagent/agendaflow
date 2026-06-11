/**
 * Workspace context hook
 */

import { useWorkspaceStore } from '@/stores/workspace-store.js';
import { useWorkspaces, useWorkspace as fetchWorkspace } from '@/queries/workspaces.js';
import { applyWorkspaceTheme } from '@/lib/colors.js';
import { useEffect } from 'react';

export function useWorkspace() {
  const {
    activeWorkspaceId,
    workspaces,
    branding,
    setActiveWorkspace,
    setWorkspaces,
    updateBranding,
    addWorkspace,
  } = useWorkspaceStore();

  const { data: fetchedWorkspaces } = useWorkspaces();
  const { data: workspaceDetails } = fetchWorkspace(activeWorkspaceId || '');

  // Load workspaces from API
  useEffect(() => {
    if (fetchedWorkspaces) {
      setWorkspaces(fetchedWorkspaces);
      // Set first workspace as active if none selected
      if (!activeWorkspaceId && fetchedWorkspaces.length > 0) {
        setActiveWorkspace(fetchedWorkspaces[0].id);
      }
    }
  }, [fetchedWorkspaces, activeWorkspaceId, setWorkspaces, setActiveWorkspace]);

  // Apply theme when branding changes
  useEffect(() => {
    if (branding) {
      applyWorkspaceTheme({
        primaryColor: branding.primaryColor || '#3b5bdb',
        sidebarColor: branding.sidebarColor || '#1a2d7a',
        accentColor: branding.accentColor || '#0066cc',
      });
    }
  }, [branding]);

  // Update branding when workspace details change
  useEffect(() => {
    if (workspaceDetails?.logoUrl || workspaceDetails?.primaryColor) {
      updateBranding({
        primaryColor: workspaceDetails.primaryColor || '#3b5bdb',
        sidebarColor: workspaceDetails.sidebarColor || '#1a2d7a',
        accentColor: workspaceDetails.accentColor || '#0066cc',
        logoUrl: workspaceDetails.logoUrl,
      });
    }
  }, [workspaceDetails, updateBranding]);

  return {
    activeWorkspaceId,
    workspaces,
    branding,
    currentWorkspace: activeWorkspaceId
      ? workspaces.find((w) => w.id === activeWorkspaceId)
      : null,
    setActiveWorkspace,
    setWorkspaces,
    updateBranding,
    addWorkspace,
  };
}
