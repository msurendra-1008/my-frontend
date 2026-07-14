import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';
import { tokenStorage } from '@/utils/axiosInstance';
import type { User, AuthContextValue, LoginPayload, RegisterPayload } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, clearAuth, loadFromStorage, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      // Hydrate store from localStorage first (synchronous)
      loadFromStorage();

      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate token against server and refresh user data
        const res = await authService.getMe();
        updateUser(res.data);
      } catch {
        // Refresh also failed — wipe everything and force re-login
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Not used by the main login pages (they call authService + authStore.setAuth directly)
  // but kept so legacy consumers of useAuth().login/register don't hard-crash.
  const login = useCallback(async (_payload: LoginPayload) => {
    throw new Error('Use authService.userLogin() + authStore.setAuth() for login.');
  }, []);

  const register = useCallback(async (_payload: RegisterPayload) => {
    throw new Error('Use authService.userRegister() + authStore.setAuth() for register.');
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await authService.logout(refresh);
    } catch {
      // proceed regardless of server error
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const contextUpdateUser = useCallback((u: User) => {
    updateUser(u);
  }, [updateUser]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout, updateUser: contextUpdateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
