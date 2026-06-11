/**
 * React Query hooks for professionals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api.js';

export interface Professional {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty: string;
  bio?: string;
  photoUrl?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfessionalRequest {
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  bio?: string;
}

export interface UpdateProfessionalRequest {
  name?: string;
  specialty?: string;
  email?: string;
  phone?: string;
  bio?: string;
  active?: boolean;
}

// Fetch professionals list
export function useProfessionals() {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: () => apiClient.get<{ data: Professional[] }>('/v1/professionals'),
    select: (data) => data.data,
  });
}

// Fetch single professional
export function useProfessional(professionalId: string) {
  return useQuery({
    queryKey: ['professional', professionalId],
    queryFn: () => apiClient.get<Professional>(`/v1/professionals/${professionalId}`),
    enabled: !!professionalId,
  });
}

// Create professional
export function useCreateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProfessionalRequest) =>
      apiClient.post<Professional>('/v1/professionals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}

// Update professional
export function useUpdateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProfessionalRequest;
    }) => apiClient.patch<Professional>(`/v1/professionals/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['professional', data.id] });
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}

// Deactivate professional
export function useDeactivateProfessional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) =>
      apiClient.patch(`/v1/professionals/${professionalId}`, { active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });
}
