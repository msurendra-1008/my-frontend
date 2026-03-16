import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** localStorage key for a given user (or global fallback when logged out). */
const themeKey = (userId?: string) => userId ? `theme_user_${userId}` : 'theme';

const validTheme = (v: string | null): v is Theme => v === 'light' || v === 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Subscribe to the logged-in user id from the auth store.
  const userId = useAuthStore((s) => s.user?.id);

  const [theme, setTheme] = useState<Theme>(() => {
    // On first render loadFromStorage() hasn't run yet, so we read
    // auth_user directly from localStorage to get the right user key.
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const user = JSON.parse(raw) as { id?: string };
        if (user?.id) {
          const saved = localStorage.getItem(themeKey(user.id));
          if (validTheme(saved)) return saved;
        }
      }
    } catch { /* ignore */ }
    // Fallback: global key (shared/logged-out state)
    const global = localStorage.getItem('theme');
    return validTheme(global) ? global : 'dark';
  });

  // When the logged-in user changes (login / logout / switch account),
  // load that user's saved preference.
  useEffect(() => {
    const saved = localStorage.getItem(themeKey(userId));
    setTheme(validTheme(saved) ? saved : 'dark');
  }, [userId]);

  // Apply the class to <html> and persist under the current user's key.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(themeKey(userId), theme);
  }, [theme, userId]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
