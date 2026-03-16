import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { ApiError } from '@services/index';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (!form.email) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email.';
    if (!form.password) next.password = 'Password is required.';
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length) return setErrors(validation);

    setIsLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]> | { non_field_errors?: string[] } | null;
        if (data && 'non_field_errors' in data && data.non_field_errors) {
          setErrors({ general: data.non_field_errors[0] });
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label="Email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            fullWidth
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            fullWidth
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth isLoading={isLoading} size="lg" className="mt-2">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
