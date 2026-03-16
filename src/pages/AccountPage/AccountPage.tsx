import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@context/AuthContext';
import { authApi } from '@services/index';
import { ApiError } from '@services/api';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
}

type FieldErrors = Partial<Record<keyof FormState | 'general', string>>;

export function AccountPage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState<FormState>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
    setSuccessMsg('');
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!form.first_name.trim()) next.first_name = 'First name is required.';
    if (!form.last_name.trim()) next.last_name = 'Last name is required.';
    if (!form.email) next.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email.';
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length) return setErrors(validation);

    setIsSaving(true);
    setSuccessMsg('');
    try {
      const updated = await authApi.updateMe(form);
      updateUser(updated);
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]> | null;
        if (data && typeof data === 'object') {
          const fieldErrors: FieldErrors = {};
          for (const [key, msgs] of Object.entries(data)) {
            if (key in form) fieldErrors[key as keyof FormState] = Array.isArray(msgs) ? msgs[0] : String(msgs);
          }
          setErrors(Object.keys(fieldErrors).length ? fieldErrors : { general: err.message });
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const joined = user?.created_at
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(user.created_at))
    : '—';

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email[0].toUpperCase()
    : '?';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal information</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: avatar + meta */}
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
              {initials}
            </div>
            <p className="mt-3 font-semibold text-foreground">{user?.full_name || '—'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium text-foreground">{joined}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account ID</span>
                <span className="font-medium text-foreground">#{user?.id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: edit form */}
        <section className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Personal Information</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update your name and email address</p>

            {errors.general && (
              <div className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {errors.general}
              </div>
            )}
            {successMsg && (
              <div className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" role="status">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  type="text"
                  name="first_name"
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
                  value={form.last_name}
                  onChange={handleChange}
                  error={errors.last_name}
                  fullWidth
                  autoComplete="family-name"
                />
              </div>

              <Input
                label="Email address"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                fullWidth
                autoComplete="email"
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isSaving} size="md">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
