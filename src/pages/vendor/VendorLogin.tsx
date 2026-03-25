import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { vendorService } from '@/services/vendorService';
import type { User } from '@/types/auth';

const schema = z.object({
  identifier: z.string().min(3, 'Required'),
  password:   z.string().min(1, 'Required'),
});
type FormData = z.infer<typeof schema>;

export function VendorLogin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const [showPw, setShowPw]     = useState(false);
  const [apiError, setApiError] = useState('');

  // Pre-fill identifier if coming from registration success screen
  const prefillIdentifier = (location.state as { identifier?: string } | null)?.identifier ?? '';

  useEffect(() => {
    if (isAuthenticated && user?.role === 'vendor') navigate('/vendor/dashboard', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: prefillIdentifier },
  });

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await vendorService.login(data.identifier, data.password);
      const { access, refresh, profile } = res.data;
      // Build a User shape from the vendor profile
      const syntheticUser: User = {
        id:             profile.id,
        email:          profile.email,
        mobile:         profile.mobile,
        first_name:     profile.contact_name.split(' ')[0] ?? '',
        last_name:      profile.contact_name.split(' ').slice(1).join(' ') ?? '',
        full_name:      profile.contact_name,
        role:           'vendor',
        upa_id:         null,
        photo_url:      null,
        wallet_balance: null,
        department:     null,
        permissions:    null,
        date_joined:    profile.created_at,
        is_active:      true,
        upa_parent:     null,
        upa_legs:       null,
      };
      setAuth(syntheticUser, access, refresh);
      navigate('/vendor/dashboard', { replace: true });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { non_field_errors?: string[]; detail?: string } } };
      const msg = e?.response?.data?.non_field_errors?.[0]
        ?? e?.response?.data?.detail
        ?? 'Invalid credentials.';
      setApiError(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Vendor Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your vendor account</p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email or Mobile</label>
            <Input
              {...register('identifier')}
              placeholder="email@company.com or 9800000000"
              autoComplete="username"
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <div className="relative">
              <Input
                {...register('password')}
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New vendor?{' '}
          <Link to="/vendor/register" className="font-medium text-primary hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
