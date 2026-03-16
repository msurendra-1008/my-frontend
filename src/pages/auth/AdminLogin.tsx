import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '@context/ThemeContext';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

const schema = z.object({
  identifier: z.string().min(3, 'Required'),
  password:   z.string().min(6, 'Min 6 characters'),
});
type FormData = z.infer<typeof schema>;

export function AdminLogin() {
  const navigate  = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [showPw, setShowPw]   = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'upa_user') navigate('/admin/dashboard', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authService.adminLogin(data);
      setAuth(res.data.user, res.data.access, res.data.refresh);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { non_field_errors?: string[]; detail?: string } } };
      const msg = errObj?.response?.data?.non_field_errors?.[0]
        ?? errObj?.response?.data?.detail
        ?? 'Invalid credentials.';
      setApiError(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Theme toggle — top-right corner */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your admin account</p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email or Mobile Number"
            type="text"
            placeholder="admin@example.com or 9876543210"
            error={errors.identifier?.message}
            fullWidth
            {...register('identifier')}
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              fullWidth
              rightAddon={
                <button type="button" onClick={() => setShowPw((p) => !p)} className="text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register('password')}
            />
          </div>

          <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Signing in...</> : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
