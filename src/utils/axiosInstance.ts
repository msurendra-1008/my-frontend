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

// Request interceptor: always read token from localStorage (not closed-over variable)
// so that tokens rotated by another tab are picked up automatically.
axiosInstance.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: auto-refresh on 401 with two-tab safety
let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function drainQueue(token: string) {
  queue.forEach(({ resolve }) => resolve(token));
  queue = [];
}

function rejectQueue(err: unknown) {
  queue.forEach(({ reject }) => reject(err));
  queue = [];
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Wait for the in-flight refresh and then retry with the new token
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const refresh = tokenStorage.getRefresh();
      if (!refresh) throw new Error('No refresh token');

      const { data } = await axios.post(`${BASE_URL}/api/v1/auth/token/refresh/`, { refresh });
      const newAccess: string = data.access;
      const newRefresh: string = data.refresh ?? refresh;

      tokenStorage.setTokens(newAccess, newRefresh);

      // Sync in-memory authStore without creating a circular import:
      // authStore reads from localStorage on next render; we also broadcast
      // a storage event so other same-origin tabs can pick up the new tokens.
      try {
        window.dispatchEvent(new StorageEvent('storage', {
          key: TOKEN_KEYS.access,
          newValue: newAccess,
          storageArea: localStorage,
        }));
      } catch { /* non-critical */ }

      drainQueue(newAccess);
      isRefreshing = false;

      original.headers.Authorization = `Bearer ${newAccess}`;
      return axiosInstance(original);
    } catch (refreshError) {
      // Before giving up, check if another tab already refreshed concurrently.
      // If localStorage has a DIFFERENT access token than what triggered the 401,
      // that tab succeeded — retry with the fresh token instead of logging out.
      const freshAccess = tokenStorage.getAccess();
      const failedToken = (original.headers.Authorization as string | undefined)
        ?.replace('Bearer ', '');

      if (freshAccess && freshAccess !== failedToken) {
        drainQueue(freshAccess);
        isRefreshing = false;
        original.headers.Authorization = `Bearer ${freshAccess}`;
        return axiosInstance(original);
      }

      rejectQueue(refreshError);
      isRefreshing = false;
      tokenStorage.clearTokens();

      const role = tokenStorage.getRole();
      window.location.href = role === 'upa_user' ? '/login' : '/admin/login';
      return Promise.reject(error);
    }
  },
);

export default axiosInstance;
