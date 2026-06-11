/**
 * React Query hooks for services
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api.js';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  category?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  category?: string;
  active?: boolean;
}

// Fetch services list
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: () => apiClient.get<{ data: Service[] }>('/v1/services'),
    select: (data) => data.data,
  });
}

// Fetch single service
export function useService(serviceId: string) {
  return useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => apiClient.get<Service>(`/v1/services/${serviceId}`),
    enabled: !!serviceId,
  });
}

// Create service
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequest) =>
      apiClient.post<Service>('/v1/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// Update service
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateServiceRequest;
    }) => apiClient.patch<Service>(`/v1/services/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['service', data.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

// Delete service
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) => apiClient.delete(`/v1/services/${serviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
