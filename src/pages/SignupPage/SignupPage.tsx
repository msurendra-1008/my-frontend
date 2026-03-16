import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { ApiError } from '@services/index';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
}

type FormErrors = Partial<Record<keyof FormState | 'general', string>>;

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!form.first_name.trim()) next.first_name = 'First name is required.';
    if (!form.last_name.trim()) next.last_name = 'Last name is required.';
    if (!form.email) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email.';
    if (!form.password) next.password = 'Password is required.';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (!form.password_confirm) next.password_confirm = 'Please confirm your password.';
    else if (form.password !== form.password_confirm) next.password_confirm = 'Passwords do not match.';
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length) return setErrors(validation);

    setIsLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]> | null;
        if (data && typeof data === 'object') {
          const fieldErrors: FormErrors = {};
          for (const [key, msgs] of Object.entries(data)) {
            if (key in form) {
              fieldErrors[key as keyof FormState] = Array.isArray(msgs) ? msgs[0] : String(msgs);
            }
          }
          if (Object.keys(fieldErrors).length) {
            setErrors(fieldErrors);
          } else {
            setErrors({ general: err.message });
          }
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your journey today</p>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              type="text"
              name="first_name"
              placeholder="John"
              value={form.first_name}
              onChange={handleChange}
              error={errors.first_name}
              fullWidth
              autoComplete="given-name"
            />
            <Input
              label="Last name"
              type="text"
              name="last_name"
              placeholder="Doe"
              value={form.last_name}
              onChange={handleChange}
              error={errors.last_name}
              fullWidth
              autoComplete="family-name"
            />
          </div>

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
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            fullWidth
            autoComplete="new-password"
          />

          <Input
            label="Confirm password"
            type="password"
            name="password_confirm"
            placeholder="••••••••"
            value={form.password_confirm}
            onChange={handleChange}
            error={errors.password_confirm}
            fullWidth
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth isLoading={isLoading} size="lg" className="mt-2">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
