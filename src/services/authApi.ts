import { api, tokenStorage } from './api';
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth';

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<AuthResponse, RegisterPayload>('/api/auth/register/', payload, { skipAuth: true }),

  login: (payload: LoginPayload) =>
    api.post<AuthResponse, LoginPayload>('/api/auth/login/', payload, { skipAuth: true }),

  logout: (refreshToken: string) =>
    api.post<{ message: string }>('/api/auth/logout/', { refresh: refreshToken }),

  me: () => api.get<AuthResponse['user']>('/api/me/'),

  updateMe: (data: Partial<{ first_name: string; last_name: string; email: string }>) =>
    api.patch<AuthResponse['user']>('/api/me/', data),
};

export { tokenStorage };
