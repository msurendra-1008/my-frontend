import { create } from 'zustand';
import { tokenStorage } from '@/utils/axiosInstance';
import type { User } from '@/types/auth';

interface AuthState {
  user:             User | null;
  accessToken:      string | null;
  refreshToken:     string | null;
  isAuthenticated:  boolean;
  setAuth:          (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth:        () => void;
  loadFromStorage:  () => void;
  updateUser:       (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:            null,
  accessToken:     null,
  refreshToken:    null,
  isAuthenticated: false,

  setAuth: (user, accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    tokenStorage.setRole(user.role);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  clearAuth: () => {
    tokenStorage.clearTokens();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const access  = tokenStorage.getAccess();
    const refresh = tokenStorage.getRefresh();
    const raw     = localStorage.getItem('auth_user');
    if (access && raw) {
      try {
        const user = JSON.parse(raw) as User;
        set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true });
      } catch {
        tokenStorage.clearTokens();
      }
    }
  },

  updateUser: (partial) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...partial };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));
