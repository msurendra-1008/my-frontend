import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import type { VendorProduct, VendorProductVariant, VendorProductWriteData, VariantType } from '@/types/vendor.types';
import type { Category } from '@/types/product.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const VARIANT_TYPES: { value: VariantType; label: string }[] = [
  { value: 'size',   label: 'Size' },
  { value: 'colour', label: 'Colour' },
  { value: 'weight', label: 'Weight' },
  { value: 'other',  label: 'Other' },
];

type VariantDraft = Omit<VendorProductVariant, 'id'> & { _key: string };

function emptyVariant(): VariantDraft {
  return { _key: Math.random().toString(36).slice(2), name: '', variant_type: 'other', sku: '', mrp: '0', is_active: true };
}

// ── Category Combobox ─────────────────────────────────────────────────────────

function CategoryCombobox({
  value,
  onChange,
}: {
  value: { id?: string; name: string } | null;
  onChange: (v: { id?: string; name: string } | null) => void;
}) {
  const [search, setSearch]     = useState('');
  const [open, setOpen]         = useState(false);
  const [options, setOptions]   = useState<Category[]>([]);
  const [loading, setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await productService.listCategories({ search: q });
      setOptions(res.data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchCategories(search);
  }, [open, search, fetchCategories]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayValue = value?.name ?? '';

  return (
    <div ref={ref} className="relative">
      <Input
        value={open ? search : displayValue}
        placeholder="Search or type new category…"
        onFocus={() => { setOpen(true); setSearch(''); }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          )}
          {!loading && options.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => { onChange({ id: cat.id, name: cat.name }); setOpen(false); }}
            >
              {cat.name}
            </button>
          ))}
          {!loading && search.trim() && !options.some((c) => c.name.toLowerCase() === search.trim().toLowerCase()) && (
            <button
              type="button"
              className="block w-full border-t px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
              onClick={() => { onChange({ name: search.trim() }); setOpen(false); }}
            >
              + Create "{search.trim()}"
            </button>
          )}
          {!loading && options.length === 0 && !search.trim() && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No categories. Type to create one.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Sheet ────────────────────────────────────────────────────────────────

export function AddVendorProductSheet({
  product,
  onClose,
  onSaved,
}: {
  product?: VendorProduct | null;
  onClose:  () => void;
  onSaved:  () => void;
}) {
  const isEdit = !!product;

  const [name, setName]               = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [category, setCategory]       = useState<{ id?: string; name: string } | null>(
    product?.category ? { id: product.category.id, name: product.category.name } : null
  );
  const [sku, setSku]                 = useState(product?.sku ?? '');
  const [barcode, setBarcode]         = useState(product?.barcode ?? '');
  const [monthlyCap, setMonthlyCap]   = useState<string>(product?.monthly_capacity?.toString() ?? '');
  const [yearlyCap, setYearlyCap]     = useState<string>(product?.yearly_capacity?.toString() ?? '');
  const [variants, setVariants]       = useState<VariantDraft[]>(() =>
    product?.variants.length
      ? product.variants.map((v) => ({ ...v, _key: v.id }))
      : [emptyVariant()]
  );
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const addVariant = () => setVariants((v) => [...v, emptyVariant()]);
  const removeVariant = (key: string) => setVariants((v) => v.filter((x) => x._key !== key));
  const updateVariant = (key: string, field: keyof VariantDraft, val: string | boolean) =>
    setVariants((v) => v.map((x) => x._key === key ? { ...x, [field]: val } : x));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Product name is required.'); return; }
    if (!sku.trim())  { setError('SKU is required.'); return; }
    if (variants.length === 0) { setError('At least one variant is required.'); return; }
    for (const v of variants) {
      if (!v.name.trim() || !v.sku.trim() || !v.mrp) {
        setError('All variant fields (name, SKU, MRP) are required.'); return;
      }
    }

    setSaving(true);
    try {
      const data: VendorProductWriteData = {
        name: name.trim(),
        description: description.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        monthly_capacity: monthlyCap ? Number(monthlyCap) : null,
        yearly_capacity:  yearlyCap  ? Number(yearlyCap)  : null,
        variants: variants.map(({ _key: _k, ...rest }) => rest),
        ...(category?.id   ? { category_id:   category.id }   : {}),
        ...(category?.name && !category?.id ? { category_name: category.name } : {}),
      };

      let saved: VendorProduct;
      if (isEdit && product) {
        const res = await vendorService.updateProduct(product.id, data);
        saved = res.data;
      } else {
        const res = await vendorService.createProduct(data);
        saved = res.data;
      }

      // Upload any queued images
      for (const file of pendingImages) {
        try {
          await vendorService.uploadProductImage(saved.id, file, { is_primary: pendingImages.indexOf(file) === 0 });
        } catch { /* non-fatal */ }
      }

      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const data = e?.response?.data;
      if (data && typeof data === 'object') {
        const msg = Object.values(data).flat().join(' ');
        setError(msg || 'Something went wrong.');
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  };

  const isReEdit = isEdit && (product.status === 'approved' || product.status === 'rejected');

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-2xl flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Product' : 'Submit New Product'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Re-review banner */}
            {isReEdit && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Editing this product will reset its status to <strong>Pending Review</strong>.
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Basic info */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Product Info</h3>
              <div>
                <label className="mb-1 block text-sm font-medium">Product Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium Cotton Fabric" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your product…"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <CategoryCombobox value={category} onChange={setCategory} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">SKU *</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="FABRIC-001" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Barcode</label>
                  <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Monthly Capacity</label>
                  <Input type="number" value={monthlyCap} onChange={(e) => setMonthlyCap(e.target.value)} placeholder="Units/month" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Yearly Capacity</label>
                  <Input type="number" value={yearlyCap} onChange={(e) => setYearlyCap(e.target.value)} placeholder="Units/year" />
                </div>
              </div>
            </section>

            {/* Variants */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Variants *</h3>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Add Variant
                </button>
              </div>
              {variants.map((v, idx) => (
                <div key={v._key} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Variant {idx + 1}</span>
                    {variants.length > 1 && (
                      <button type="button" onClick={() => removeVariant(v._key)} className="text-destructive hover:text-destructive/70">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs">Name *</label>
                      <Input
                        value={v.name}
                        onChange={(e) => updateVariant(v._key, 'name', e.target.value)}
                        placeholder="e.g. White 1m"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs">Type</label>
                      <select
                        value={v.variant_type}
                        onChange={(e) => updateVariant(v._key, 'variant_type', e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        {VARIANT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs">SKU *</label>
                      <Input
                        value={v.sku}
                        onChange={(e) => updateVariant(v._key, 'sku', e.target.value)}
                        placeholder="FABRIC-001-W"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs">MRP (₹) *</label>
                      <Input
                        type="number"
                        value={v.mrp}
                        onChange={(e) => updateVariant(v._key, 'mrp', e.target.value)}
                        placeholder="250"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={v.is_active}
                      onChange={(e) => updateVariant(v._key, 'is_active', e.target.checked)}
                    />
                    Active
                  </label>
                </div>
              ))}
            </section>

            {/* Images */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Product Images {isEdit ? '(add more)' : '(optional)'}
              </h3>
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {pendingImages.map((f, i) => (
                    <div key={i} className="group relative">
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingImages((imgs) => imgs.filter((_, j) => j !== i))}
                        className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 group-hover:flex"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPendingImages((prev) => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Plus className="mr-1 h-4 w-4" /> Add Images
              </Button>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Submit Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
