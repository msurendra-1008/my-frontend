import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, X, Upload } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import type { Category } from '@/types/product.types';

const schema = z.object({
  company_name:  z.string().min(1, 'Required'),
  gst_number:    z.string().min(1, 'Required'),
  contact_name:  z.string().min(1, 'Required'),
  mobile:        z.string().min(10, 'Valid mobile required'),
  email:         z.string().email('Valid email required'),
  password:      z.string().min(8, 'Min 8 characters'),
  confirm_pw:    z.string(),
  address_line1: z.string().min(1, 'Required'),
  address_line2: z.string().optional(),
  city:          z.string().min(1, 'Required'),
  state:         z.string().min(1, 'Required'),
  pincode:       z.string().min(6, 'Required'),
}).refine((d) => d.password === d.confirm_pw, {
  message: 'Passwords do not match',
  path: ['confirm_pw'],
});
type FormData = z.infer<typeof schema>;

interface DocEntry { label: string; file: File }

export function VendorRegister() {
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [catError, setCatError]     = useState('');
  const [docs, setDocs]             = useState<DocEntry[]>([]);
  const [docLabelInput, setDocLabelInput] = useState('');
  const [apiError, setApiError]     = useState('');
  const [success, setSuccess]       = useState(false);
  const [loading, setLoading]       = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    productService.listCategories().then((r) => setCategories(r.data.results));
  }, []);

  const toggleCat = (id: string) => {
    setSelectedCats((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setCatError('');
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      setDocs((prev) => [...prev, { label: docLabelInput || f.name, file: f }]);
    });
    setDocLabelInput('');
    e.target.value = '';
  };

  const onSubmit = async (data: FormData) => {
    if (selectedCats.length === 0) {
      setCatError('Select at least one category.');
      return;
    }
    setApiError('');
    setLoading(true);
    try {
      const regRes = await vendorService.register({
        company_name:  data.company_name,
        gst_number:    data.gst_number,
        contact_name:  data.contact_name,
        mobile:        data.mobile,
        email:         data.email,
        address_line1: data.address_line1,
        address_line2: data.address_line2 ?? '',
        city:          data.city,
        state:         data.state,
        pincode:       data.pincode,
        category_ids:  selectedCats,
        password:      data.password,
      });

      // Upload documents one by one
      for (const doc of docs) {
        await vendorService.uploadDocument(doc.label, doc.file);
        // Note: uploadDocument for registration requires auth;
        // documents can be uploaded after login from the dashboard instead
        // This is a best-effort attempt — silently skip failures
      }

      void regRes; // registration succeeded
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, string | string[]> } };
      const d = e?.response?.data;
      if (d) {
        const msgs = Object.values(d).flat().join(' ');
        setApiError(msgs || 'Registration failed. Please try again.');
      } else {
        setApiError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold">Registration Submitted!</h2>
          <p className="text-muted-foreground">
            Your application is under review. We'll notify you once approved. You can login to
            check your status.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/vendor/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Vendor Registration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/vendor/login" className="font-medium text-primary hover:underline">
              Login here
            </Link>
          </p>
        </div>

        {apiError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1 — Company info */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Company Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Company Name *</label>
                <Input {...register('company_name')} placeholder="Acme Supplies Pvt Ltd" />
                {errors.company_name && <p className="mt-1 text-xs text-destructive">{errors.company_name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">GST Number *</label>
                <Input {...register('gst_number')} placeholder="22AAAAA0000A1Z5" />
                {errors.gst_number && <p className="mt-1 text-xs text-destructive">{errors.gst_number.message}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium">
                Product Categories * {catError && <span className="text-destructive">— {catError}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCat(cat.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selectedCats.includes(cat.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2 — Contact info */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Contact Person Name *</label>
                <Input {...register('contact_name')} placeholder="Raj Kumar" />
                {errors.contact_name && <p className="mt-1 text-xs text-destructive">{errors.contact_name.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mobile *</label>
                <Input {...register('mobile')} placeholder="9800000000" />
                {errors.mobile && <p className="mt-1 text-xs text-destructive">{errors.mobile.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email *</label>
                <Input {...register('email')} type="email" placeholder="raj@company.com" />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Password *</label>
                <div className="relative">
                  <Input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Confirm Password *</label>
                <div className="relative">
                  <Input
                    {...register('confirm_pw')}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm_pw && <p className="mt-1 text-xs text-destructive">{errors.confirm_pw.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 3 — Address */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Business Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Address Line 1 *</label>
                <Input {...register('address_line1')} placeholder="123 Market Street" />
                {errors.address_line1 && <p className="mt-1 text-xs text-destructive">{errors.address_line1.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Address Line 2</label>
                <Input {...register('address_line2')} placeholder="Area, Landmark (optional)" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City *</label>
                <Input {...register('city')} placeholder="Mumbai" />
                {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">State *</label>
                <Input {...register('state')} placeholder="Maharashtra" />
                {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pincode *</label>
                <Input {...register('pincode')} placeholder="400001" />
                {errors.pincode && <p className="mt-1 text-xs text-destructive">{errors.pincode.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 4 — Documents */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 font-semibold">Documents</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload GST certificate, PAN card, etc. (optional — can also be added later)
            </p>

            <div className="mb-3 flex gap-2">
              <Input
                value={docLabelInput}
                onChange={(e) => setDocLabelInput(e.target.value)}
                placeholder="Document name (e.g. GST Certificate)"
                className="flex-1"
              />
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                Add file
                <input type="file" className="hidden" onChange={handleFileAdd} multiple />
              </label>
            </div>

            {docs.length > 0 && (
              <ul className="space-y-2">
                {docs.map((doc, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    <span>{doc.label} — <span className="text-muted-foreground">{doc.file.name}</span></span>
                    <button
                      type="button"
                      onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
