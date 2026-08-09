import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Pencil, Trash2, Eye, EyeOff, Package, ImageIcon, GripVertical } from 'lucide-react';
import { cn } from '@utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import { useAuthStore } from '@/store/authStore';
import { ProductFormSheet } from './ProductsPage';
import type { Product, Category, ProductVariant } from '@/types/product.types';

// ── Helpers ────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const show = (m: string, isErr = false) => {
    setMsg(m); setErr(isErr);
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, err, show };
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────

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

// ── Product Detail Page ────────────────────────────────────────────────────

export function ProductDetailPage() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const toast     = useToast();

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [product,       setProduct]       = useState<Product | null>(null);
  const [variants,      setVariants]      = useState<ProductVariant[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [editOpen,      setEditOpen]      = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [deleteDialog,  setDeleteDialog]  = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImage,   setActiveImage]   = useState(0);

  // drag-and-drop reorder
  const dragIdx    = useRef<number | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const canEdit =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    (user?.permissions?.includes('products.edit') ?? false);

  const loadProduct = async () => {
    if (!slug) return;
    try {
      const r = await productService.getProduct(slug);
      setProduct(r.data);
      setVariants([...r.data.variants].sort((a, b) => a.order - b.order));
      setActiveImage(0);
    } catch {
      toast.show('Failed to load product.', true);
    } finally {
      setLoading(false);
    }
  };

  const onDragStart = (idx: number) => { dragIdx.current = idx; };

  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
    const from = dragIdx.current;
    if (from === null || from === idx) return;
    setVariants(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      dragIdx.current = idx;
      return next;
    });
  };

  const onDragEnd = async () => {
    setDragOver(null);
    dragIdx.current = null;
    if (!slug) return;
    setSaving(true);
    try {
      await Promise.all(
        variants.map((v, i) => productService.updateVariant(slug, v.id, { order: i }))
      );
    } catch {
      toast.show('Failed to save order.', true);
      loadProduct();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadProduct();
    productService.listCategories().then((r) => {
      const data = r.data as { results?: Category[] } | Category[];
      setCategories(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
  }, [slug]);

  const handleTogglePublish = async () => {
    if (!product) return;
    setActionLoading(true);
    try {
      const r = await productService.togglePublish(product.slug);
      setProduct((p) => p ? { ...p, is_published: r.data.is_published } : p);
      toast.show(r.data.message);
    } catch {
      toast.show('Failed.', true);
    } finally {
      setActionLoading(false);
      setPublishDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setActionLoading(true);
    try {
      await productService.deleteProduct(product.slug);
      navigate('/admin/products');
    } catch {
      toast.show('Failed to delete.', true);
      setActionLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleEditSaved = () => {
    setEditOpen(false);
    loadProduct();
  };

  // ── Loading / not found states ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Product not found.</p>
          <button
            onClick={() => navigate('/admin/products')}
            className="text-sm text-primary hover:underline"
          >
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  const images = product.images;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b bg-background/95 px-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground shrink-0"
            >
              <Menu size={20} />
            </button>
            <button
              onClick={() => navigate('/admin/products')}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
              <span className="text-sm hidden sm:inline">Products</span>
            </button>
            <span className="text-muted-foreground/40 shrink-0">/</span>
            <h1 className="text-sm font-semibold text-foreground truncate">{product.name}</h1>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => setPublishDialog(true)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                {product.is_published ? <><EyeOff size={12} /> Unpublish</> : <><Eye size={12} /> Publish</>}
              </button>
              <button
                onClick={() => setDeleteDialog(true)}
                className="flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </header>

        {/* Body — split layout */}
        <main className="flex-1 overflow-hidden flex">

          {/* ── LEFT: main content ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">

            {/* Basic Info card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2.5 border-b border-border">
                Basic Info
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <InfoField label="Product Name">
                  <span className="font-semibold">{product.name}</span>
                </InfoField>
                <InfoField label="SKU">
                  <span className="font-mono text-sm">{product.sku || '—'}</span>
                </InfoField>
                <InfoField label="Category">
                  {product.category?.name ?? '—'}
                </InfoField>
                <InfoField label="Brand">
                  {product.brand?.name ?? '—'}
                </InfoField>
                {product.barcode && (
                  <InfoField label="Barcode">
                    <span className="font-mono text-sm">{product.barcode}</span>
                  </InfoField>
                )}
              </div>
              {product.description && (
                <InfoField label="Description">
                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-sm">{product.description}</p>
                </InfoField>
              )}
              {/* Extra fields */}
              {product.extra_fields && Object.keys(product.extra_fields).length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Product Fields</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {Object.entries(product.extra_fields).map(([k, v]) => (
                      <InfoField key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}>
                        {String(v)}
                      </InfoField>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Variants card */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Variants</span>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10.5px] font-bold">
                    {variants.length}
                  </span>
                  {canEdit && variants.length > 1 && (
                    <span className="text-[10px] text-muted-foreground/60">⠿ drag to reorder</span>
                  )}
                  {saving && <span className="text-[10px] text-primary animate-pulse">saving…</span>}
                </div>
                <span className="text-xs text-muted-foreground">{product.total_stock} units total</span>
              </div>

              {variants.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No variants configured.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {canEdit && <th className="w-8" />}
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Attributes</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">SKU</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr
                          key={v.id}
                          draggable={canEdit}
                          onDragStart={() => onDragStart(idx)}
                          onDragOver={e => onDragOver(e, idx)}
                          onDragEnd={onDragEnd}
                          className={cn(
                            'border-b last:border-0 transition-colors',
                            dragOver === idx ? 'bg-primary/5' : 'hover:bg-muted/20',
                            canEdit && 'cursor-grab active:cursor-grabbing',
                          )}
                        >
                          {canEdit && (
                            <td className="pl-3 py-3 w-8">
                              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                            </td>
                          )}
                          <td className="px-4 py-3 font-semibold text-foreground text-[13px]">{v.name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-[10.5px] font-semibold px-2 py-0.5 rounded-[4px]',
                              v.variant_type === 'weight' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                              v.variant_type === 'size'   ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                              v.variant_type === 'colour' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                              'bg-muted/60 text-muted-foreground border border-border',
                            )}>
                              {v.variant_type.charAt(0).toUpperCase() + v.variant_type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {Object.keys(v.attributes ?? {}).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(v.attributes).map(([k, val]) => (
                                  <span key={k} className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-[3px] bg-muted/60 border border-border text-muted-foreground">
                                    {k}: {val}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.sku || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-xs font-semibold tabular-nums',
                              v.stock_label === 'Out of Stock' ? 'text-red-600 dark:text-red-400' :
                              v.stock_label === 'Low Stock'    ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                            )}>
                              {v.stock_quantity}
                              {v.stock_label === 'Low Stock' && (
                                <span className="ml-1.5 text-[9.5px] font-bold px-1 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">LOW</span>
                              )}
                              {v.stock_label === 'Out of Stock' && (
                                <span className="ml-1.5 text-[9.5px] font-bold px-1 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">OUT</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={v.is_active ? 'success' : 'secondary'} className="text-xs">
                              {v.is_active ? 'Active' : 'Off'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT: sidebar ── */}
          <div className="w-[248px] shrink-0 border-l border-border flex flex-col overflow-y-auto bg-card">

            {/* Section 1 — Visibility */}
            <div className="px-4 py-3.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Visibility</p>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">Published</span>
                <Badge variant={product.is_published ? 'success' : 'secondary'} className="text-[10.5px]">
                  {product.is_published ? 'Live' : 'Draft'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {product.is_published ? 'Visible to customers on store' : 'Hidden from customers'}
              </p>
              {canEdit && (
                <button
                  onClick={() => setPublishDialog(true)}
                  className={cn(
                    'mt-2.5 w-full rounded-lg py-1.5 text-xs font-semibold transition-colors',
                    product.is_published
                      ? 'border border-border text-muted-foreground hover:bg-muted'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {product.is_published ? 'Unpublish' : 'Publish'}
                </button>
              )}
            </div>

            {/* Section 2 — Images */}
            <div className="px-4 py-3.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Images</p>
              {images.length > 0 ? (
                <div className="space-y-2">
                  {/* Primary */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
                    {images[activeImage]?.image ? (
                      <img src={images[activeImage].image!} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-muted-foreground/30" />
                    )}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setActiveImage(idx)}
                          className={cn(
                            'aspect-square rounded overflow-hidden border-2 transition-colors',
                            idx === activeImage ? 'border-primary' : 'border-border hover:border-primary/50',
                          )}
                        >
                          {img.image ? (
                            <img src={img.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Package size={10} className="text-muted-foreground/40" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-muted/50 border-2 border-dashed border-border/70 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
                  <ImageIcon size={22} />
                  <p className="text-[10px]">No images</p>
                </div>
              )}
            </div>

            {/* Section 3 — Quick Stats */}
            <div className="px-4 py-3.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Stats</p>
              {[
                { label: 'Total Stock', value: `${product.total_stock} units` },
                { label: 'Variants',    value: String(variants.length) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="font-semibold text-foreground tabular-nums">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground text-xs">Stock Status</span>
                <span className={cn(
                  'text-[10.5px] font-bold px-2 py-0.5 rounded-[4px]',
                  product.stock_label === 'Out of Stock' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  product.stock_label === 'Low Stock'    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                  'bg-green-500/10 text-green-600 dark:text-green-400',
                )}>
                  {product.stock_label}
                </span>
              </div>
            </div>

            {/* Section 4 — Identifiers */}
            <div className="px-4 py-3.5 border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Identifiers</p>
              {[
                { label: 'SKU',      value: product.sku || '—',          mono: true  },
                { label: 'Barcode',  value: product.barcode || '—',      mono: true  },
                { label: 'Category', value: product.category?.name ?? '—', mono: false },
                { label: 'Brand',    value: product.brand?.name ?? '—',  mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className={cn('text-xs font-medium text-foreground', mono && 'font-mono')}>{value}</span>
                </div>
              ))}
            </div>

            {/* Section 5 — Timestamps */}
            <div className="px-4 py-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Timestamps</p>
              {[
                { label: 'Created', value: new Date(product.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Updated', value: new Date(product.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="text-xs text-foreground">{value}</span>
                </div>
              ))}
            </div>

          </div>

        </main>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div className={cn(
          'fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/40' : 'bg-card text-foreground',
        )}>
          {toast.msg}
        </div>
      )}

      {/* Edit sheet */}
      {editOpen && (
        <ProductFormSheet
          categories={categories}
          product={product}
          onClose={() => setEditOpen(false)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Publish / Unpublish confirm */}
      {publishDialog && (
        <ConfirmDialog
          title={product.is_published ? 'Unpublish product?' : 'Publish product?'}
          description={
            product.is_published
              ? 'This will hide the product from customers.'
              : 'This will make the product visible to customers.'
          }
          confirmLabel={product.is_published ? 'Unpublish' : 'Publish'}
          isDanger={false}
          loading={actionLoading}
          onConfirm={handleTogglePublish}
          onCancel={() => setPublishDialog(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteDialog && (
        <ConfirmDialog
          title="Delete product?"
          description={`"${product.name}" will be permanently deleted. This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog(false)}
        />
      )}

    </div>
  );
}
