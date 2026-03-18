import { useState, useEffect, useRef } from 'react';
import { Menu, Plus, Pencil, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { cn } from '@utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import { useAuthStore } from '@/store/authStore';
import type {
  ProductListItem, Product, Category,
  UPADiscountSettings,
} from '@/types/product.types';

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

function ProductFormSheet({ categories, product, onClose, onSaved }: ProductFormProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:                   product?.name ?? '',
    description:            product?.description ?? '',
    sku:                    product?.sku ?? '',
    barcode:                product?.barcode ?? '',
    category:               product?.category?.id ?? '',
    mrp:                    product?.mrp ?? '',
    upa_discount_override:  product?.upa_discount_override ?? '',
    upa_price_override:     product?.upa_price_override ?? '',
    is_published:           product?.is_published ?? false,
  });
  const [variants, setVariants] = useState(
    product?.variants.map((v) => ({
      id:                  v.id,
      name:                v.name,
      variant_type:        v.variant_type,
      sku:                 v.sku,
      mrp:                 v.mrp,
      upa_price_override:  v.upa_price_override ?? '',
      stock_quantity:      v.stock_quantity,
      is_active:           v.is_active,
      _new:                false,
    })) ?? [],
  );
  const [saving,  setSaving]  = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, description: form.description, sku: form.sku,
        barcode: form.barcode, mrp: form.mrp, is_published: form.is_published,
      };
      if (form.category)               payload.category               = form.category;
      if (form.upa_discount_override)  payload.upa_discount_override  = form.upa_discount_override;
      if (form.upa_price_override)     payload.upa_price_override      = form.upa_price_override;

      let slug: string;
      if (product) {
        await productService.updateProduct(product.slug, payload);
        slug = product.slug;
      } else {
        const r = await productService.createProduct(payload);
        slug = r.data.slug;
      }

      // Upload image if selected
      if (imgFile) {
        const fd = new FormData();
        fd.append('image', imgFile);
        fd.append('is_primary', 'true');
        await productService.uploadImage(slug, fd).catch(() => {});
      }

      // Save variants
      for (const v of variants) {
        const vp = {
          name: v.name, variant_type: v.variant_type, sku: v.sku,
          mrp: v.mrp, stock_quantity: v.stock_quantity, is_active: v.is_active,
          ...(v.upa_price_override ? { upa_price_override: v.upa_price_override } : {}),
        };
        if (v._new) {
          await productService.addVariant(slug, vp).catch(() => {});
        } else {
          await productService.updateVariant(slug, v.id, vp).catch(() => {});
        }
      }

      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.show(msg ?? 'Save failed.', true);
    } finally {
      setSaving(false);
    }
  };

  const addVariant = () => {
    setVariants((v) => [...v, {
      id: crypto.randomUUID(), name: '', variant_type: 'other' as const,
      sku: '', mrp: '', upa_price_override: '',
      stock_quantity: 0, is_active: true, _new: true,
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
                  <Field label="SKU" required>
                    <input required value={form.sku} onChange={(e) => set('sku', e.target.value)}
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

              {/* ── Section: Pricing ── */}
              <section className="space-y-4">
                <SectionHeader label="Pricing" />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="MRP (₹)" required>
                    <input required type="number" step="0.01" min="0" value={form.mrp}
                      onChange={(e) => set('mrp', e.target.value)} className="input-base" placeholder="0.00" />
                  </Field>
                  <Field label="UPA Discount %" hint="Overrides global %">
                    <input type="number" step="0.01" min="0" max="100" value={form.upa_discount_override}
                      onChange={(e) => set('upa_discount_override', e.target.value)} className="input-base" placeholder="e.g. 10" />
                  </Field>
                  <Field label="UPA Price (₹)" hint="Fixed override">
                    <input type="number" step="0.01" min="0" value={form.upa_price_override}
                      onChange={(e) => set('upa_price_override', e.target.value)} className="input-base" placeholder="e.g. 199" />
                  </Field>
                </div>
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
                          <div className="grid grid-cols-3 gap-3">
                            <Field label="SKU">
                              <input value={v.sku} placeholder="VAR-001"
                                onChange={(e) => updateVariant(i, { sku: e.target.value })}
                                className="input-base" />
                            </Field>
                            <Field label="MRP (₹)">
                              <input type="number" step="0.01" value={v.mrp} placeholder="0.00"
                                onChange={(e) => updateVariant(i, { mrp: e.target.value })}
                                className="input-base" />
                            </Field>
                            <Field label="Stock Qty">
                              <input type="number" value={v.stock_quantity} placeholder="0"
                                onChange={(e) => updateVariant(i, { stock_quantity: parseInt(e.target.value) || 0 })}
                                className="input-base" />
                            </Field>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={v.is_active}
                                onChange={(e) => updateVariant(i, { is_active: e.target.checked })}
                                className="h-3.5 w-3.5 rounded accent-primary" />
                              <span className="text-xs text-muted-foreground">Active</span>
                            </label>
                            <Field label="UPA Price Override (₹)">
                              <input type="number" step="0.01" value={v.upa_price_override} placeholder="Optional"
                                onChange={(e) => updateVariant(i, { upa_price_override: e.target.value })}
                                className="input-base w-32" />
                            </Field>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {toast.msg && (
                <p className={cn('text-xs rounded-xl px-4 py-3 border font-medium', toast.err ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200')}>
                  {toast.msg}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 border-t bg-card/95 backdrop-blur-sm p-4 rounded-b-2xl">
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
      await productService.createCategory({ name, parent: parent || null });
      onSaved();
      toast.show('Category created.');
    } catch { toast.show('Failed.', true); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
          <div className="flex h-[52px] items-center justify-between border-b px-5">
            <h2 className="text-sm font-semibold">New Category</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <Field label="Category Name *">
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="input-base" placeholder="Category name" autoFocus />
            </Field>
            <Field label="Parent Category">
              <select value={parent} onChange={(e) => setParent(e.target.value)} className="input-base">
                <option value="">— Root (no parent) —</option>
                {categories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            {toast.msg && (
              <p className={cn('text-xs rounded-lg px-3 py-2 border',
                toast.err ? 'text-red-600 bg-red-50 border-red-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200')}>
                {toast.msg}
              </p>
            )}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Creating…' : 'Create Category'}
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

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await productService.deleteCategory(slug);
      onRefresh();
      toast.show('Deleted.');
    } catch { toast.show('Failed.', true); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        <button
          onClick={() => setCatModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={13} /> New Category
        </button>
      </div>

      {/* Categories list */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Parent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.parent_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(c.slug)}
                    className="text-red-500 hover:text-red-700 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {toast.msg && (
        <div className={cn('fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-50 text-red-600 border-red-200' : 'bg-card text-foreground')}>
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
          toast.err ? 'bg-red-50 text-red-600 border-red-200' : 'bg-card text-foreground')}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Products Tab ──────────────────────────────────────────────────────────

function ProductsTab({
  onEditProduct,
}: {
  categories?: Category[];
  onEditProduct: (p: Product) => void;
}) {
  const { user }    = useAuthStore();
  const toast       = useToast();
  const [products,  setProducts]  = useState<ProductListItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [nextPage,  setNextPage]  = useState<string | null>(null);
  const [page,      setPage]      = useState(1);

  const canEdit = user?.role === 'superadmin' || user?.role === 'admin' ||
    (user?.permissions?.includes('products.edit') ?? false);

  const fetchProducts = async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    try {
      const r = await productService.listProducts({ page: pg });
      if (reset) setProducts(r.data.results);
      else       setProducts((prev) => [...prev, ...r.data.results]);
      setNextPage(r.data.next);
      setPage(pg);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleTogglePublish = async (p: ProductListItem) => {
    try {
      const r = await productService.togglePublish(p.slug);
      setProducts((prev) => prev.map((x) =>
        x.id === p.id ? { ...x, is_published: r.data.is_published } : x,
      ));
      toast.show(r.data.message);
    } catch { toast.show('Failed.', true); }
  };

  const handleDelete = async (p: ProductListItem) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await productService.deleteProduct(p.slug);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.show('Product deleted.');
    } catch { toast.show('Failed.', true); }
  };

  const handleEdit = async (p: ProductListItem) => {
    try {
      const r = await productService.getProduct(p.slug);
      onEditProduct(r.data);
    } catch { toast.show('Failed to load product.', true); }
  };

  return (
    <div className="space-y-4">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Product</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">MRP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                {canEdit && <th className="px-4 py-3 w-24" />}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted overflow-hidden">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={14} className="text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 font-mono text-xs text-muted-foreground">{p.id.slice(0,8)}…</td>
                  <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">&#8377;{p.mrp}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_published ? 'success' : 'secondary'}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium',
                      p.stock_label === 'Out of Stock' ? 'text-red-500' :
                      p.stock_label === 'Low Stock' ? 'text-amber-600' : 'text-emerald-600'
                    )}>
                      {p.stock_label}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(p)}
                          className="text-muted-foreground hover:text-foreground" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleTogglePublish(p)}
                          className="text-muted-foreground hover:text-foreground"
                          title={p.is_published ? 'Unpublish' : 'Publish'}>
                          {p.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => handleDelete(p)}
                          className="text-red-500 hover:text-red-700" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No products yet.
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
          toast.err ? 'bg-red-50 text-red-600 border-red-200' : 'bg-card text-foreground')}>
          {toast.msg}
        </div>
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
  const { user }     = useAuthStore();
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
    <div className="flex h-screen bg-background">
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
          {canEdit && (
            <button
              onClick={() => { setEditProduct(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={13} /> New Product
            </button>
          )}
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
