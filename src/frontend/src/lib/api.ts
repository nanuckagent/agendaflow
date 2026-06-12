/**
 * API client with authentication and workspace support
 */

import { useAuthStore } from '@/stores/auth-store.js';
import { useWorkspaceStore } from '@/stores/workspace-store.js';

const API_URL = import.meta.env.VITE_API_URL || '/';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(additionalHeaders?: Record<string, string>) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };

    // Add JWT token if available
    const token = useAuthStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add workspace header if available (explicit per-call header takes precedence)
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    if (workspaceId && !headers['X-Workspace-Id']) {
      headers['X-Workspace-Id'] = workspaceId;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Logout on unauthorized
      useAuthStore.getState().logout();
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || response.statusText);
    }

    return response.json();
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(headers),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(headers),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(headers),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(headers),
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(headers),
    });
    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient(API_URL);

// Legacy function exports for backwards compatibility
export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiClient.get<T>(endpoint);
}

export async function apiPost<T>(endpoint: string, data: unknown): Promise<T> {
  return apiClient.post<T>(endpoint, data);
}

export async function apiPut<T>(endpoint: string, data: unknown): Promise<T> {
  return apiClient.put<T>(endpoint, data);
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiClient.delete<T>(endpoint);
}
