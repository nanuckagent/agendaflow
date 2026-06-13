/**
 * React Query hooks for workspaces
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api.js';

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  logoUrl?: string;
  storeEnabled?: boolean;
  whatsappNumber?: string;
  onlinePaymentsEnabled?: boolean;
  mercadopagoConfigured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  timezone?: string;
  currency?: string;
}

export interface UpdateBrandingRequest {
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  logoUrl?: string;
  storeEnabled?: boolean;
  whatsappNumber?: string;
  onlinePaymentsEnabled?: boolean;
}

// Fetch user's workspaces
export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiClient.get<{ data: Workspace[] }>('/v1/user/workspaces'),
    select: (data) => data.data,
  });
}

// Fetch single workspace details
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => apiClient.get<Workspace>(`/v1/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
  });
}

// Create workspace
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceRequest) =>
      apiClient.post<Workspace>('/v1/workspaces', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Update workspace branding
export function useUpdateBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UpdateBrandingRequest }) =>
      apiClient.patch<Workspace>(`/v1/workspaces/${workspaceId}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', data.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

// Upload workspace logo
export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(`/v1/workspaces/${workspaceId}/logo`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Workspace-Id': workspaceId,
        },
      });
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });
}
