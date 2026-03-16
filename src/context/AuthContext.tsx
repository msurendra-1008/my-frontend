import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi, tokenStorage } from '@services/index';
import type { User, AuthContextValue, LoginPayload, RegisterPayload, LegacyAuthResponse } from '@/types/auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        tokenStorage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    // authApi uses legacy endpoint returning {message, user, tokens}
    const res = (await authApi.login(payload)) as unknown as LegacyAuthResponse;
    tokenStorage.setTokens(res.tokens.access, res.tokens.refresh);
    setUser(res.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    // authApi uses legacy endpoint returning {message, user, tokens}
    const res = (await authApi.register(payload)) as unknown as LegacyAuthResponse;
    tokenStorage.setTokens(res.tokens.access, res.tokens.refresh);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // proceed regardless
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
