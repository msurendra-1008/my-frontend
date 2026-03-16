import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

const schema = z.object({
  mobile:   z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export function UserLogin() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const [showPw, setShowPw]     = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user?.role === 'upa_user') navigate('/dashboard', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authService.userLogin(data);
      setAuth(res.data.user, res.data.access, res.data.refresh);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { non_field_errors?: string[] } } };
      const msg = errObj?.response?.data?.non_field_errors?.[0] ?? 'Invalid credentials.';
      setApiError(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your mobile number</p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Mobile Number" type="tel" placeholder="9876543210" error={errors.mobile?.message} fullWidth {...register('mobile')} />
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
          <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Signing in...</> : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New user?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}
