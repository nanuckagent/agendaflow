/**
 * React Query hooks for appointments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api.js';

export interface Appointment {
  id: string;
  code: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  professionalId: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  professionalId: string;
  serviceId: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string;
}

export interface AppointmentFilters {
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
  status?: string;
}

// Fetch appointments list with filters
export function useAppointments(filters?: AppointmentFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.append('dateTo', filters.dateTo);
  if (filters?.professionalId) queryParams.append('professionalId', filters.professionalId);
  if (filters?.status) queryParams.append('status', filters.status);

  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => apiClient.get<{ data: Appointment[] }>(`/v1/appointments?${queryParams}`),
    select: (data) => data.data,
  });
}

// Fetch single appointment by code (public)
export function useAppointmentByCode(code: string, workspaceId: string) {
  return useQuery({
    queryKey: ['appointment', code],
    queryFn: () =>
      apiClient.get<Appointment>(`/v1/appointments/${code}`, {
        'X-Workspace-Id': workspaceId,
      }),
    enabled: !!code,
  });
}

// Create appointment
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentRequest) =>
      apiClient.post<{ id: string; code: string; status: string }>('/v1/appointments/book', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Cancel appointment
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      cancellationToken,
    }: {
      appointmentId: string;
      cancellationToken?: string;
    }) =>
      apiClient.post(`/v1/appointments/${appointmentId}/cancel`, {
        cancellationToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Update appointment
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateAppointmentRequest>;
    }) => apiClient.patch(`/v1/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

// Get available slots for professional/service/date (HH:mm list)
export function useAvailability(professionalId: string, serviceId: string, date: string) {
  return useQuery({
    queryKey: ['availability', professionalId, serviceId, date],
    queryFn: () =>
      apiClient.get<{ date: string; slots: string[] }>(
        `/v1/public/availability?professionalId=${professionalId}&serviceId=${serviceId}&date=${date}`
      ),
    enabled: !!professionalId && !!date,
    select: (data) => data.slots,
  });
}
