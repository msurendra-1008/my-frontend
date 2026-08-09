import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, Plus, Pencil, Trash2, Eye, EyeOff, Package, Sun, Moon } from 'lucide-react';
import { useTheme } from '@context/ThemeContext';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { cn } from '@utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import { commissionService } from '@/services/commissionService';
import { ProductCommissionModal } from '@/components/commissions/ProductCommissionModal';
import { useAuthStore } from '@/store/authStore';
import type {
  ProductListItem, Product, Category,
  UPADiscountSettings, ProductCreatePayload,
} from '@/types/product.types';
import type { ProductCommissionRule } from '@/types/commission.types';

// ── Helpers ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function useToast() {
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState(false);
  const show = (m: string, isErr = false) => {
    setMsg(m); setErr(isErr);
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, err, show };
}

// ── Product Form Sheet ────────────────────────────────────────────────────

interface ProductFormProps {
  categories:  Category[];
  product:     Product | null;  // null = create
  onClose:     () => void;
  onSaved:     () => void;
}

export function ProductFormSheet({ categories, product, onClose, onSaved }: ProductFormProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:         product?.name ?? '',
    description:  product?.description ?? '',
    sku:          product?.sku ?? '',
    barcode:      product?.barcode ?? '',
    category:     product?.category?.id ?? '',
    is_published: product?.is_published ?? false,
  });
  const [variants, setVariants] = useState(
    product?.variants.map((v) => ({
      id:             v.id,
      name:           v.name,
      variant_type:   v.variant_type,
      sku:            v.sku,
      stock_quantity: v.stock_quantity,
      is_active:      v.is_active,
      _new:           false,
    })) ?? [],
  );
  const [saving,  setSaving]  = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const parseApiError = (err: unknown): string => {
    const data = (err as { response?: { data?: unknown } })?.response?.data;
    if (!data) return 'Save failed. Please try again.';
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      if (typeof d.detail === 'string') return d.detail;
      return Object.entries(d)
        .map(([k, v]) => {
          const label = k === 'name' ? 'Product Name' : k === 'sku' ? 'SKU' : k === 'mrp' ? 'MRP' : k;
          const msg   = Array.isArray(v) ? v.join(', ') : String(v);
          return `${label}: ${msg}`;
        })
        .join(' · ');
    }
    return 'Save failed. Please try again.';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.show('Product Name is required.', true); return;
    }
    for (const v of variants) {
      const label = v.name || 'unnamed variant';
      if (!v.name.trim()) { toast.show(`Variant name is required (${label}).`, true); return; }
      if (!v.sku.trim())  { toast.show(`SKU is required for variant "${v.name}".`, true); return; }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:         form.name.trim(),
        description:  form.description,
        sku:          form.sku || null,
        barcode:      form.barcode,
        is_published: form.is_published,
      };
      if (form.category) payload.category = form.category;

      let slug: string;
      if (product) {
        await productService.updateProduct(product.slug, payload);
        slug = product.slug;
      } else {
        const r = await productService.createProduct(payload as unknown as ProductCreatePayload);
        slug = r.data.slug;
        if (!slug) throw new Error('Product created but slug missing — contact support.');
      }

      if (imgFile) {
        const fd = new FormData();
        fd.append('image', imgFile);
        fd.append('is_primary', 'true');
        await productService.uploadImage(slug, fd).catch(() => {});
      }

      for (const v of variants) {
        const vp = {
          name:           v.name,
          variant_type:   v.variant_type,
          sku:            v.sku,
          stock_quantity: v.stock_quantity,
          is_active:      v.is_active,
        };
        try {
          if (v._new) {
            await productService.addVariant(slug, vp);
          } else {
            await productService.updateVariant(slug, v.id, vp);
          }
        } catch (varErr: unknown) {
          throw new Error(`Variant "${v.name}": ${parseApiError(varErr)}`);
        }
      }

      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : parseApiError(err);
      toast.show(msg, true);
    } finally {
      setSaving(false);
    }
  };

  const addVariant = () => {
    setVariants((v) => [...v, {
      id: crypto.randomUUID(), name: '', variant_type: 'other' as const,
      sku: '', stock_quantity: 0, is_active: true, _new: true,
    }]);
  };

  const removeVariant = (idx: number) => setVariants((v) => v.filter((_, i) => i !== idx));

  const updateVariant = (i: number, patch: Record<string, unknown>) =>
    setVariants((arr) => arr.map((x, j) => j === i ? { ...x, ...patch } : x));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col rounded-2xl bg-card shadow-2xl border border-border/60">

          {/* Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{product ? 'Edit Product' : 'New Product'}</h2>
              <p className="text-xs text-muted-foreground">{product ? 'Update product details below' : 'Fill in the details to create a product'}</p>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">&times;</button>
          </div>

          <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">

              {/* ── Section: Basic Info ── */}
              <section className="space-y-4">
                <SectionHeader label="Basic Information" />
                <Field label="Product Name" required>
                  <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                    className="input-base" placeholder="e.g. Organic Green Tea" />
                </Field>
                <Field label="Description">
                  <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                    className="input-base resize-none" placeholder="Short product description…" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="SKU" hint="Optional">
                    <input value={form.sku} onChange={(e) => set('sku', e.target.value)}
                      className="input-base" placeholder="SKU-001" />
                  </Field>
                  <Field label="Barcode">
                    <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)}
                      className="input-base" placeholder="Optional" />
                  </Field>
                </div>
                <Field label="Category">
                  <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input-base">
                    <option value="">— No Category —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              </section>

              {/* ── Section: Image ── */}
              <section className="space-y-4">
                <SectionHeader label="Primary Image" />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 p-6 text-center transition-colors"
                >
                  {imgFile ? (
                    <p className="text-sm font-medium text-foreground">{imgFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-foreground">Click to upload image</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP supported</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setImgFile(e.target.files?.[0] ?? null)} />
              </section>

              {/* ── Section: Publish ── */}
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors">
                <input type="checkbox" checked={form.is_published}
                  onChange={(e) => set('is_published', e.target.checked)} className="h-4 w-4 rounded accent-primary" />
                <div>
                  <span className="text-sm font-medium text-foreground">Publish product</span>
                  <p className="text-xs text-muted-foreground">Make this product visible to customers</p>
                </div>
              </label>

              {/* ── Section: Variants ── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionHeader label="Variants" />
                  <button type="button" onClick={addVariant}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                    <Plus size={12} /> Add Variant
                  </button>
                </div>

                {variants.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border py-8 text-center">
                    <p className="text-sm text-muted-foreground">No variants added yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Add variants for different sizes, colours, or weights.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variants.map((v, i) => (
                      <div key={v.id} className="rounded-xl border border-border bg-muted/10 overflow-hidden">
                        {/* Variant header */}
                        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Variant {i + 1}{v.name ? ` — ${v.name}` : ''}
                          </span>
                          <button type="button" onClick={() => removeVariant(i)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                            Remove
                          </button>
                        </div>

                        {/* Variant fields */}
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Variant Name">
                              <input value={v.name} placeholder="e.g. 500g, Red, Large"
                                onChange={(e) => updateVariant(i, { name: e.target.value })}
                                className="input-base" />
                            </Field>
                            <Field label="Type">
                              <select value={v.variant_type}
                                onChange={(e) => updateVariant(i, { variant_type: e.target.value as 'size'|'colour'|'weight'|'other' })}
                                className="input-base">
                                <option value="size">Size</option>
                                <option value="colour">Colour</option>
                                <option value="weight">Weight</option>
                                <option value="other">Other</option>
                              </select>
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="SKU">
                              <input value={v.sku} placeholder="VAR-001"
                                onChange={(e) => updateVariant(i, { sku: e.target.value })}
                                className="input-base" />
                            </Field>
                            <Field label="Stock Qty">
                              <input type="number" value={v.stock_quantity} placeholder="0"
                                onChange={(e) => updateVariant(i, { stock_quantity: parseInt(e.target.value) || 0 })}
                                className="input-base" />
                            </Field>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input type="checkbox" checked={v.is_active}
                              onChange={(e) => updateVariant(i, { is_active: e.target.checked })}
                              className="h-3.5 w-3.5 rounded accent-primary" />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>

            <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur-sm px-4 pt-3 pb-4 rounded-b-2xl space-y-2">
              {toast.msg && (
                <p className={cn('text-xs rounded-lg px-3 py-2.5 border font-medium leading-snug', toast.err ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-400/40' : 'text-emerald-700 dark:text-emerald-400 bg-green-500/10 border-green-400/40')}>
                  {toast.msg}
                </p>
              )}
              <button type="submit" disabled={saving}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────────

interface CategoryFormModalProps {
  categories: Category[];
  onClose:    () => void;
  onSaved:    () => void;
}

function CategoryFormModal({ categories, onClose, onSaved }: CategoryFormModalProps) {
  const toast = useToast();
  const [name,   setName]   = useState('');
  const [parent, setParent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productService.createCategory({ name, depth: 0, parent: parent || null });
      onSaved();
      toast.show('Category created.');
    } catch { toast.show('Failed.', true); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border/60">
          <div className="flex h-14 items-center justify-between border-b px-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">New Category</h2>
              <p className="text-xs text-muted-foreground">Add a category to organise products</p>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">&times;</button>
          </div>
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <Field label="Category Name" required>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="input-base" placeholder="e.g. Beverages" autoFocus />
            </Field>
            <Field label="Parent Category" hint="Optional">
              <select value={parent} onChange={(e) => setParent(e.target.value)} className="input-base">
                <option value="">— Root (no parent) —</option>
                {categories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {toast.msg && (
              <p className={cn('text-xs rounded-xl px-4 py-3 border font-medium',
                toast.err ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-400/40' : 'text-emerald-700 dark:text-emerald-400 bg-green-500/10 border-green-400/40')}>
                {toast.msg}
              </p>
            )}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="rounded-xl border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? 'Creating…' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  isDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border/60 p-6">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60',
                isDanger
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {loading ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Category Edit Modal ───────────────────────────────────────────────────

function CategoryEditModal({
  category,
  categories,
  onClose,
  onSaved,
}: {
  category: Category;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name,   setName]   = useState(category.name);
  const [parent, setParent] = useState(category.parent_id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productService.updateCategory(category.slug, { name, parent: parent || null });
      onSaved();
    } catch { toast.show('Failed.', true); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border/60">
          <div className="flex h-14 items-center justify-between border-b px-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Edit Category</h2>
              <p className="text-xs text-muted-foreground">Update category details</p>
            </div>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">&times;</button>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <Field label="Category Name" required>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="input-base" placeholder="e.g. Beverages" autoFocus />
            </Field>
            <Field label="Parent Category" hint="Optional">
              <select value={parent} onChange={(e) => setParent(e.target.value)} className="input-base">
                <option value="">— Root (no parent) —</option>
                {categories.filter((c) => !c.parent_id && c.id !== category.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {toast.msg && (
              <p className={cn('text-xs rounded-xl px-4 py-3 border font-medium',
                toast.err ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-400/40' : 'text-emerald-700 dark:text-emerald-400 bg-green-500/10 border-green-400/40')}>
                {toast.msg}
              </p>
            )}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="rounded-xl border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Category Management ───────────────────────────────────────────────────

function CategoriesTab({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const toast = useToast();
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editTarget,   setEditTarget]   = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // ── Client-side filters ────────────────────────────────────────────────
  const [searchInput,  setSearchInput]  = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = categories.filter((c) => {
    if (searchInput && !c.name.toLowerCase().includes(searchInput.toLowerCase())) return false;
    if (typeFilter === 'parent' && c.parent_id)  return false;
    if (typeFilter === 'sub'    && !c.parent_id) return false;
    if (statusFilter === 'active'   && !c.is_active) return false;
    if (statusFilter === 'inactive' && c.is_active)  return false;
    return true;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.deleteCategory(deleteTarget.slug);
      onRefresh();
      toast.show('Deleted.');
    } catch { toast.show('Failed.', true); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <div className="space-y-3">

      {/* ── Filter toolbar ── */}
      <FilterToolbar
        searchPlaceholder="Search categories..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filters={[
          {
            id: 'type',
            placeholder: 'All types',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: 'Parent only',    value: 'parent' },
              { label: 'Subcategories',  value: 'sub' },
            ],
            width: 'w-[140px]',
          },
          {
            id: 'status',
            placeholder: 'All status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'Active',   value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ],
            width: 'w-[120px]',
          },
        ]}
        resultCount={{ showing: filtered.length, total: categories.length, label: 'categories' }}
        actions={
          <button
            onClick={() => setCatModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 h-9"
          >
            <Plus size={13} /> New Category
          </button>
        }
      />

      {/* ── Table ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.parent_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditTarget(c)}
                      className="text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(c)}
                      className="text-red-500 hover:text-red-700 transition-colors" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                {(searchInput || typeFilter || statusFilter) ? 'No categories match your filters.' : 'No categories yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast.msg && (
        <div className={cn('fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/40' : 'bg-card text-foreground')}>
          {toast.msg}
        </div>
      )}

      {catModalOpen && (
        <CategoryFormModal
          categories={categories}
          onClose={() => setCatModalOpen(false)}
          onSaved={() => { setCatModalOpen(false); onRefresh(); }}
        />
      )}

      {editTarget && (
        <CategoryEditModal
          category={editTarget}
          categories={categories}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); onRefresh(); toast.show('Category updated.'); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete category?"
          description={`"${deleteTarget.name}" will be permanently deleted. This cannot be undone.`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ── UPA Discount Settings ─────────────────────────────────────────────────

function DiscountSettingsCard() {
  const toast = useToast();
  const [settings, setSettings] = useState<UPADiscountSettings | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [value,    setValue]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    productService.getDiscountSettings().then((r) => {
      setSettings(r.data);
      setValue(r.data.global_discount_percent);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await productService.updateDiscountSettings({ global_discount_percent: value });
      setSettings(r.data);
      setEditing(false);
      toast.show('Discount updated.');
    } catch { toast.show('Failed.', true); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Global UPA Discount</h3>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline">Edit</button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-3">
          <input type="number" step="0.01" min="0" max="100"
            value={value} onChange={(e) => setValue(e.target.value)}
            className="input-base w-24" />
          <span className="text-sm text-muted-foreground">%</span>
          <button onClick={handleSave} disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>
      ) : (
        <p className="text-2xl font-bold text-foreground">
          {settings?.global_discount_percent ?? '—'}%
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        This affects all products without a per-product override.
      </p>

      {toast.msg && (
        <div className={cn('fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/40' : 'bg-card text-foreground')}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────

function ProductsTab({
  categories = [],
  onEditProduct,
}: {
  categories?: Category[];
  onEditProduct: (p: Product) => void;
}) {
  const { user }           = useAuthStore();
  const toast              = useToast();
  const navigate           = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state from URL ──────────────────────────────────────────────
  const categoryFilter = searchParams.get('category') ?? '';
  const statusFilter   = searchParams.get('status')   ?? '';
  const stockFilter    = searchParams.get('stock')    ?? '';

  // Local search input (debounced before hitting URL)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

  const [products,     setProducts]     = useState<ProductListItem[]>([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [nextPage,     setNextPage]     = useState<string | null>(null);
  const [page,         setPage]         = useState(1);
  const [deleteTarget,       setDeleteTarget]       = useState<ProductListItem | null>(null);
  const [deleting,           setDeleting]           = useState(false);
  const [commissionProduct,  setCommissionProduct]  = useState<ProductListItem | null>(null);
  const [commissionRule,     setCommissionRule]     = useState<ProductCommissionRule | null>(null);
  const [commissionOpen,     setCommissionOpen]     = useState(false);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' ||
    (user?.permissions?.includes('products.edit') ?? false);

  // ── Debounce search into URL ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        searchInput ? next.set('search', searchInput) : next.delete('search');
        return next;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch whenever URL params change ──────────────────────────────────
  const searchFromUrl = searchParams.get('search') ?? '';

  const fetchProducts = async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    try {
      const r = await productService.listProducts({
        search:   searchFromUrl   || undefined,
        category: categoryFilter  || undefined,
        status:   (statusFilter   as 'published' | 'unpublished') || undefined,
        stock:    (stockFilter    as 'in_stock' | 'low_stock' | 'out_of_stock') || undefined,
        page: pg,
      });
      if (reset) setProducts(r.data.results);
      else       setProducts((prev) => [...prev, ...r.data.results]);
      setTotalCount(r.data.count);
      setNextPage(r.data.next);
      setPage(pg);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(1, true); }, [searchFromUrl, categoryFilter, statusFilter, stockFilter]);

  // ── Filter helpers ─────────────────────────────────────────────────────
  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  };

  const hasFilters = !!(searchInput || categoryFilter || statusFilter || stockFilter);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleTogglePublish = async (p: ProductListItem) => {
    try {
      const r = await productService.togglePublish(p.slug);
      setProducts((prev) => prev.map((x) =>
        x.id === p.id ? { ...x, is_published: r.data.is_published } : x,
      ));
      toast.show(r.data.message);
    } catch { toast.show('Failed.', true); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.deleteProduct(deleteTarget.slug);
      setProducts((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setTotalCount((c) => c - 1);
      toast.show('Product deleted.');
    } catch { toast.show('Failed.', true); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const handleEdit = async (p: ProductListItem) => {
    try {
      const r = await productService.getProduct(p.slug);
      onEditProduct(r.data);
    } catch { toast.show('Failed to load product.', true); }
  };

  const handleOpenCommission = async (p: ProductListItem) => {
    setCommissionProduct(p);
    setCommissionRule(null);
    if (p.has_commission_rule) {
      try {
        const r = await commissionService.getProductRuleByProduct(p.id);
        setCommissionRule(r.data);
      } catch { /* rule not found — open in create mode */ }
    }
    setCommissionOpen(true);
  };

  return (
    <div className="space-y-3">

      {/* ── Filter toolbar ── */}
      <FilterToolbar
        searchPlaceholder="Search by name or SKU..."
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        filters={[
          {
            id: 'category',
            placeholder: 'All categories',
            value: categoryFilter,
            onChange: (v) => setFilter('category', v),
            options: categories.map((c) => ({ label: c.name, value: c.slug })),
            width: 'w-[150px]',
          },
          {
            id: 'status',
            placeholder: 'All status',
            value: statusFilter,
            onChange: (v) => setFilter('status', v),
            options: [
              { label: 'Published',   value: 'published' },
              { label: 'Unpublished', value: 'unpublished' },
            ],
            width: 'w-[130px]',
          },
          {
            id: 'stock',
            placeholder: 'All stock',
            value: stockFilter,
            onChange: (v) => setFilter('stock', v),
            options: [
              { label: 'In stock',     value: 'in_stock' },
              { label: 'Low stock',    value: 'low_stock' },
              { label: 'Out of stock', value: 'out_of_stock' },
            ],
            width: 'w-[130px]',
          },
        ]}
        resultCount={!loading ? { showing: products.length, total: totalCount, label: 'products' } : undefined}
      />

      {/* ── Table ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="hidden md:table-cell px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="hidden lg:table-cell px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Brand</th>
                <th className="hidden sm:table-cell px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Variants</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                <th className="px-4 py-2.5 text-left text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                {canEdit && <th className="px-4 py-2.5 w-8" />}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-muted/20 cursor-pointer group"
                  onClick={() => navigate(`/admin/products/${p.slug}`)}
                >
                  {/* Product: thumbnail + name + SKU */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted overflow-hidden border border-border/50">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={14} className="text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[13px] text-foreground group-hover:text-primary transition-colors truncate leading-tight">
                          {p.name}
                        </p>
                        {p.sku && (
                          <p className="text-[10.5px] font-mono text-muted-foreground mt-0.5">{p.sku}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="hidden md:table-cell px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{p.category_name ?? '—'}</span>
                  </td>

                  {/* Brand */}
                  <td className="hidden lg:table-cell px-4 py-3">
                    <span className="text-[12px] text-foreground">{p.brand_name ?? <span className="text-muted-foreground">—</span>}</span>
                  </td>

                  {/* Variant count */}
                  <td className="hidden sm:table-cell px-4 py-3" onClick={e => e.stopPropagation()}>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-muted/60 border border-border text-muted-foreground text-[11px] font-medium">
                      {p.variant_count} variant{p.variant_count !== 1 ? 's' : ''}
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[4px]',
                      p.stock_label === 'Out of Stock'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : p.stock_label === 'Low Stock'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'bg-green-500/10 text-green-600 dark:text-green-400',
                    )}>
                      {p.stock_label === 'In Stock' ? '●' : p.stock_label === 'Low Stock' ? '⚠' : '✕'}
                      {' '}{p.stock_label}
                    </span>
                  </td>

                  {/* Published status */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <span className={cn(
                      'inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-[4px]',
                      p.is_published
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-muted/60 text-muted-foreground border border-border',
                    )}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>

                  {/* Actions */}
                  {canEdit && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleTogglePublish(p)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title={p.is_published ? 'Unpublish' : 'Publish'}>
                          {p.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => handleOpenCommission(p)}
                          title={p.has_commission_rule ? 'Edit commission' : 'Set commission'}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors',
                            p.has_commission_rule
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          )}>
                          {p.has_commission_rule ? '●' : '+'}%
                        </button>
                        <button onClick={() => setDeleteTarget(p)}
                          className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {hasFilters ? 'No products match your filters.' : 'No products yet.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Load more */}
        {!loading && nextPage && (
          <div className="border-t px-4 py-3">
            <button onClick={() => fetchProducts(page + 1, false)}
              className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
              Load more
            </button>
          </div>
        )}
      </div>

      {toast.msg && (
        <div className={cn('fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/40' : 'bg-card text-foreground')}>
          {toast.msg}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete product?"
          description={`"${deleteTarget.name}" will be permanently deleted. This action cannot be undone.`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {commissionOpen && (
        <ProductCommissionModal
          rule={commissionRule}
          initialProduct={commissionProduct}
          onSave={(saved) => {
            setCommissionOpen(false);
            setProducts((prev) => prev.map((p) =>
              p.id === (commissionProduct?.id ?? saved.product)
                ? { ...p, has_commission_rule: true }
                : p,
            ));
            toast.show(commissionRule ? 'Commission updated.' : 'Commission rule saved.');
          }}
          onClose={() => { setCommissionOpen(false); setCommissionProduct(null); setCommissionRule(null); }}
        />
      )}
    </div>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────

function Field({
  label, children, required, hint,
}: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="ml-auto font-normal text-muted-foreground">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex-1 border-t border-border/60" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type PageTab = 'products' | 'categories';

export function ProductsPage() {
  const { user }               = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const navigate               = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab,  setActiveTab]   = useState<PageTab>('products');
  const [categories, setCategories]  = useState<Category[]>([]);
  const [formOpen,   setFormOpen]    = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [refreshKey, setRefreshKey]  = useState(0);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' ||
    (user?.permissions?.includes('products.edit') ?? false);

  const fetchCategories = () => {
    productService.listCategories().then((r) => {
      const data = r.data as { results?: Category[] } | Category[];
      setCategories(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSaved = () => {
    setFormOpen(false);
    setEditProduct(null);
    setRefreshKey((k) => k + 1);
  };

  const handleEditProduct = (p: Product) => {
    setEditProduct(p);
    setFormOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b bg-background/95 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground">
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-semibold text-foreground">Products</h1>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate('/admin/products/new')}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus size={13} /> New Product
              </button>
            )}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Badge variant={user?.role === 'superadmin' ? 'danger' : user?.role === 'admin' ? 'warning' : 'info'} className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* UPA Discount Settings */}
          <DiscountSettingsCard />

          {/* Tabs */}
          <div className="flex border-b gap-0">
            {(['products', 'categories'] as PageTab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn(
                  'px-4 py-2 text-sm capitalize border-b-2 -mb-px transition-colors',
                  activeTab === t
                    ? 'border-purple-600 text-purple-700 font-medium dark:border-purple-400 dark:text-purple-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <ProductsTab
              key={refreshKey}
              categories={categories}
              onEditProduct={handleEditProduct}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesTab categories={categories} onRefresh={fetchCategories} />
          )}
        </main>
      </div>

      {/* Product form sheet */}
      {formOpen && (
        <ProductFormSheet
          categories={categories}
          product={editProduct}
          onClose={() => { setFormOpen(false); setEditProduct(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
