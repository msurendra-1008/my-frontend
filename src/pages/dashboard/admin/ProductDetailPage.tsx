import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, Pencil, Trash2, Eye, EyeOff, Package, ImageIcon } from 'lucide-react';
import { cn } from '@utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@/components/ui/Badge';
import { productService } from '@/services/productService';
import { useAuthStore } from '@/store/authStore';
import { ProductFormSheet } from './ProductsPage';
import type { Product, Category } from '@/types/product.types';

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
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [editOpen,      setEditOpen]      = useState(false);
  const [publishDialog, setPublishDialog] = useState(false);
  const [deleteDialog,  setDeleteDialog]  = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeImage,   setActiveImage]   = useState(0);

  const canEdit =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    (user?.permissions?.includes('products.edit') ?? false);

  const loadProduct = async () => {
    if (!slug) return;
    try {
      const r = await productService.getProduct(slug);
      setProduct(r.data);
      setActiveImage(0);
    } catch {
      toast.show('Failed to load product.', true);
    } finally {
      setLoading(false);
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
      <div className="flex h-screen bg-background">
        <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((o) => !o)} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen bg-background">
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
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto space-y-5">

            {/* ── Top row: Details + Sidebar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Basic info */}
              <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoField label="Product Name">
                    <span className="font-medium">{product.name}</span>
                  </InfoField>
                  <InfoField label="SKU">
                    <span className="font-mono">{product.sku || '—'}</span>
                  </InfoField>
                  <InfoField label="Barcode">
                    <span className="font-mono">{product.barcode || '—'}</span>
                  </InfoField>
                  <InfoField label="Category">
                    {product.category?.name ?? '—'}
                  </InfoField>
                </div>
                {product.description && (
                  <InfoField label="Description">
                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{product.description}</p>
                  </InfoField>
                )}
              </div>

              {/* Status + Pricing sidebar */}
              <div className="space-y-4">

                {/* Status card */}
                <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={product.is_published ? 'success' : 'secondary'}>
                      {product.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant={
                      product.stock_label === 'Out of Stock' ? 'danger' :
                      product.stock_label === 'Low Stock'    ? 'warning' : 'success'
                    }>
                      {product.stock_label}
                    </Badge>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setPublishDialog(true)}
                      className={cn(
                        'w-full rounded-xl py-2 text-xs font-semibold transition-colors',
                        product.is_published
                          ? 'border border-border text-muted-foreground hover:bg-muted'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {product.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                  )}
                </div>

                {/* Pricing card */}
                <div className="rounded-xl border bg-card shadow-sm p-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</p>
                  <InfoField label="MRP">
                    <span className="text-lg font-bold">₹{product.mrp}</span>
                  </InfoField>
                  <InfoField label="UPA Price">
                    <span className="font-semibold text-primary">₹{product.upa_price.upa_price}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({product.upa_price.discount_percent}% off · saves ₹{product.upa_price.saving})
                    </span>
                  </InfoField>
                  {product.upa_discount_override && (
                    <InfoField label="UPA Discount Override">
                      {product.upa_discount_override}%
                    </InfoField>
                  )}
                  {product.upa_price_override && (
                    <InfoField label="UPA Price Override">
                      ₹{product.upa_price_override}
                    </InfoField>
                  )}
                </div>

              </div>
            </div>

            {/* ── Image Gallery ── */}
            {images.length > 0 && (
              <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Images <span className="normal-case font-normal text-muted-foreground/60">({images.length})</span>
                </p>
                <div className="flex gap-4">
                  {/* Main preview */}
                  <div className="h-56 w-56 shrink-0 rounded-xl overflow-hidden bg-muted flex items-center justify-center border border-border/40">
                    {images[activeImage]?.image ? (
                      <img
                        src={images[activeImage].image!}
                        alt={images[activeImage].alt_text || product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={36} className="text-muted-foreground/30" />
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {images.length > 1 && (
                    <div className="flex flex-wrap gap-2 content-start">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setActiveImage(idx)}
                          className={cn(
                            'h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors',
                            idx === activeImage
                              ? 'border-primary'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          {img.image ? (
                            <img src={img.image} alt={img.alt_text || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-muted flex items-center justify-center">
                              <Package size={12} className="text-muted-foreground/40" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Variants ── */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variants</p>
                <span className="text-xs text-muted-foreground">{product.variants.length} total · {product.total_stock} units</span>
              </div>
              {product.variants.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No variants configured.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">MRP</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">UPA Override</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((v) => (
                        <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{v.name || '—'}</td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">{v.variant_type}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{v.sku || '—'}</td>
                          <td className="px-4 py-3">₹{v.mrp}</td>
                          <td className="px-4 py-3">{v.upa_price_override ? `₹${v.upa_price_override}` : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-xs font-medium',
                              v.stock_label === 'Out of Stock' ? 'text-red-500' :
                              v.stock_label === 'Low Stock'    ? 'text-amber-600' : 'text-emerald-600',
                            )}>
                              {v.stock_quantity} · {v.stock_label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={v.is_active ? 'success' : 'secondary'}>
                              {v.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Meta ── */}
            <div className="rounded-xl border bg-card shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Meta</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoField label="Created At">
                  {new Date(product.created_at).toLocaleString()}
                </InfoField>
                <InfoField label="Last Updated">
                  {new Date(product.updated_at).toLocaleString()}
                </InfoField>
                <InfoField label="Total Stock">
                  {product.total_stock} units
                </InfoField>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div className={cn(
          'fixed bottom-5 right-5 z-50 rounded-lg border px-4 py-3 shadow-lg text-sm',
          toast.err ? 'bg-red-50 text-red-600 border-red-200' : 'bg-card text-foreground',
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
