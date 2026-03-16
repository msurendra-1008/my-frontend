import axios from 'axios';
import type { UserRole } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const TOKEN_KEYS = { access: 'access_token', refresh: 'refresh_token' } as const;

export const tokenStorage = {
  getAccess:   () => localStorage.getItem(TOKEN_KEYS.access),
  getRefresh:  () => localStorage.getItem(TOKEN_KEYS.refresh),
  setTokens:   (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEYS.access, access);
    localStorage.setItem(TOKEN_KEYS.refresh, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_role');
  },
  getRole: () => localStorage.getItem('auth_role') as UserRole | null,
  setRole: (role: string) => localStorage.setItem('auth_role', role),
};

const axiosInstance = axios.create({ baseURL: BASE_URL });

// Request interceptor: attach JWT
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: auto-refresh on 401
let isRefreshing = false;
let queue: Array<(token: string) => void> = [];

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refresh = tokenStorage.getRefresh();
          if (!refresh) throw new Error('No refresh token');
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/token/refresh/`, { refresh });
          tokenStorage.setTokens(data.access, data.refresh ?? refresh);
          queue.forEach((cb) => cb(data.access));
          queue = [];
          isRefreshing = false;
          original.headers.Authorization = `Bearer ${data.access}`;
          return axiosInstance(original);
        } catch {
          queue = [];
          isRefreshing = false;
          tokenStorage.clearTokens();
          const role = tokenStorage.getRole();
          window.location.href = role === 'upa_user' ? '/login' : '/admin/login';
          return Promise.reject(error);
        }
      }
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(axiosInstance(original));
        });
      });
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
