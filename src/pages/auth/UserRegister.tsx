import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

const schema = z.object({
  name:             z.string().min(2, 'Name is required'),
  mobile:           z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
  password:         z.string().min(8, 'Min 8 characters'),
  confirm_password: z.string(),
  upa_ref_id:       z.string().optional(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});
type FormData = z.infer<typeof schema>;

export function UserRegister() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const { setAuth }   = useAuthStore();
  const [showPw, setShowPw]               = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [suggestStandalone, setSuggest]   = useState(false);
  const [standaloneChecked, setStandalone]= useState(false);
  // When checked → user wants to register WITHOUT a referral ID
  const [noReferral, setNoReferral]       = useState(false);
  const [apiMessage, setApiMessage]       = useState('');
  const [apiError, setApiError]           = useState('');

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { upa_ref_id: params.get('ref') ?? '' },
  });

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) setValue('upa_ref_id', ref);
  }, [params, setValue]);

  const onSubmit = async (data: FormData) => {
    setApiError('');
    try {
      const res = await authService.userRegister({
        name:           data.name,
        mobile:         data.mobile,
        password:       data.password,
        upa_ref_id:     noReferral ? undefined : (data.upa_ref_id || undefined),
        add_standalone: standaloneChecked || noReferral,
      });
      const payload = res.data;
      if (!payload.success && payload.suggest_standalone) {
        setSuggest(true);
        setApiMessage(payload.message ?? 'No vacant leg found.');
        return;
      }
      if (payload.success && payload.access && payload.refresh && payload.user) {
        setAuth(payload.user, payload.access, payload.refresh);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg = typeof errData === 'object' && errData
        ? Object.values(errData).flat().join(' ')
        : 'Registration failed.';
      setApiError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 flex flex-col items-center justify-start sm:justify-center">
      <div className="w-full max-w-md rounded-xl border bg-card p-5 sm:p-8 shadow-sm">
        <div className="mb-4 sm:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Create Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join the UPA network</p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {apiError}
          </div>
        )}

        {suggestStandalone && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700" role="alert">
            <p className="font-medium">{apiMessage}</p>
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={standaloneChecked}
                onChange={(e) => setStandalone(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span>Register me as a standalone user instead</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4" noValidate>
          <Input label="Full Name" type="text" placeholder="John Doe" error={errors.name?.message} fullWidth {...register('name')} />
          <Input label="Mobile Number" type="tel" placeholder="9876543210" error={errors.mobile?.message} fullWidth {...register('mobile')} />
          <Input
            label="Password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min 8 characters"
            error={errors.password?.message}
            fullWidth
            rightAddon={
              <button type="button" onClick={() => setShowPw((p) => !p)} className="text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.confirm_password?.message}
            fullWidth
            rightAddon={
              <button type="button" onClick={() => setShowConfirm((p) => !p)} className="text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            {...register('confirm_password')}
          />

          {/* Referral section */}
          <div className="space-y-2">
            {/* Checkbox to skip referral */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={noReferral}
                onChange={(e) => {
                  setNoReferral(e.target.checked);
                  if (e.target.checked) setValue('upa_ref_id', '');
                }}
                className="h-4 w-4 rounded border-gray-300 accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                I don't have a referral ID{' '}
                <span className="text-xs text-muted-foreground/70">(register as standalone)</span>
              </span>
            </label>

            {/* Referral ID input — disabled when checkbox is checked */}
            <Input
              label="Referral ID"
              type="text"
              placeholder={noReferral ? 'Not required' : 'UPA-XXXXXX'}
              fullWidth
              disabled={noReferral}
              {...register('upa_ref_id')}
            />
            {noReferral && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                You will be registered as a standalone user — not linked to any sponsor.
              </p>
            )}
          </div>

          <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-2">
            {isSubmitting
              ? <><Loader2 className="animate-spin" size={16} /> Creating account...</>
              : (standaloneChecked || noReferral) ? 'Register as Standalone' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 sm:mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
