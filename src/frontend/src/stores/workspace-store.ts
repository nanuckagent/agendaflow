/**
 * Workspace state store (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkspaceBranding {
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoUrl?: string;
}

interface Workspace {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  branding?: WorkspaceBranding;
}

interface WorkspaceState {
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  branding: WorkspaceBranding | null;
  setActiveWorkspace: (workspaceId: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  updateBranding: (branding: WorkspaceBranding) => void;
  addWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      workspaces: [],
      branding: null,

      setActiveWorkspace: (workspaceId) => {
        set((state) => {
          const workspace = state.workspaces.find((w) => w.id === workspaceId);
          return {
            activeWorkspaceId: workspaceId,
            branding: workspace?.branding || null,
          };
        });
      },

      setWorkspaces: (workspaces) => {
        set({ workspaces });
      },

      updateBranding: (branding) => {
        set({ branding });
      },

      addWorkspace: (workspace) => {
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        }));
      },
    }),
    {
      name: 'workspace-store',
    }
  )
);
