import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@context/AuthContext';
import { authApi } from '@services/index';
import { ApiError } from '@services/api';
import { Input } from '@components/ui/Input';
import { Button } from '@components/ui/Button';
import styles from './AccountPage.module.css';

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

  // Sync form if user changes (e.g. after page refresh)
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

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Profile</h1>
        <p className={styles.pageSub}>Manage your personal information</p>
      </div>

      <div className={styles.layout}>
        {/* Left: avatar + meta */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarCard}>
            <div className={styles.avatarCircle}>
              {user
                ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
                  user.email[0].toUpperCase()
                : '?'}
            </div>
            <p className={styles.avatarName}>{user?.full_name || '—'}</p>
            <p className={styles.avatarEmail}>{user?.email}</p>
          </div>

          <div className={styles.metaCard}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Member since</span>
              <span className={styles.metaValue}>{joined}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Account ID</span>
              <span className={styles.metaValue}>#{user?.id}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Status</span>
              <span className={styles.statusBadge}>Active</span>
            </div>
          </div>
        </aside>

        {/* Right: edit form */}
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            <h2 className={styles.cardTitle}>Personal Information</h2>
            <p className={styles.cardSub}>Update your name and email address</p>

            {errors.general && (
              <div className={styles.alertError} role="alert">{errors.general}</div>
            )}
            {successMsg && (
              <div className={styles.alertSuccess} role="status">{successMsg}</div>
            )}

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.row}>
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

              <div className={styles.formFooter}>
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
