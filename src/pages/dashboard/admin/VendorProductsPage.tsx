import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, Package, ExternalLink } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { vendorService } from '@/services/vendorService';
import { cn } from '@utils/cn';
import type {
  VendorProductAdminListItem,
  VendorProductAdmin,
  VendorProductStats,
  VendorProductStatus,
} from '@/types/vendor.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold', color ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

const STATUS_STYLES: Record<VendorProductStatus, string> = {
  pending_approval: 'bg-amber-100 text-amber-800 border-amber-300',
  approved:         'bg-green-100 text-green-800 border-green-300',
  rejected:         'bg-red-100 text-red-800 border-red-300',
  not_continued:    'bg-gray-100 text-gray-600 border-gray-300',
};

const STATUS_LABELS: Record<VendorProductStatus, string> = {
  pending_approval: 'Pending Review',
  approved:         'Approved',
  rejected:         'Rejected',
  not_continued:    'Deactivated',
};

function StatusBadge({ status }: { status: VendorProductStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Action Alert Dialog ───────────────────────────────────────────────────────

type DialogType = 'approve' | 'reject';

function ActionAlertDialog({
  type,
  reason,
  acting,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  type:           DialogType;
  reason:         string;
  acting:         boolean;
  onReasonChange: (v: string) => void;
  onConfirm:      () => void;
  onCancel:       () => void;
}) {
  const isApprove = type === 'approve';
  const reasonOk  = isApprove || reason.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">
          {isApprove ? 'Approve this product?' : 'Reject this product?'}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {isApprove
            ? 'This will copy the product to the main catalog (unpublished, stock=0).'
            : 'Please provide a rejection reason. The vendor will see this.'}
        </p>
        {!isApprove && (
          <textarea
            className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={3}
            placeholder="Rejection reason (min 10 chars)…"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <button
            disabled={acting || !reasonOk}
            onClick={onConfirm}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
              isApprove
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-destructive text-white hover:bg-destructive/90',
            )}
          >
            {acting ? 'Working…' : isApprove ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Detail Sheet ──────────────────────────────────────────────────────

function ProductDetailSheet({
  productId,
  onClose,
  onUpdated,
}: {
  productId: string;
  onClose:   () => void;
  onUpdated: () => void;
}) {
  const [product, setProduct] = useState<VendorProductAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog]   = useState<DialogType | null>(null);
  const [reason, setReason]   = useState('');
  const [acting, setActing]   = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { show, msg } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await vendorService.adminGetProduct(productId);
      setProduct(res.data);
      setAdminNotes(res.data.admin_notes ?? '');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!product || !dialog) return;
    setActing(true);
    try {
      if (dialog === 'approve') {
        await vendorService.adminApproveProduct(product.id);
      } else {
        await vendorService.adminRejectProduct(product.id, reason);
      }
      show('Action completed.');
      setDialog(null);
      setReason('');
      await load();
      onUpdated();
    } catch {
      show('Action failed. Please try again.', true);
    } finally {
      setActing(false);
    }
  };

  const saveNotes = async (value: string) => {
    if (!product) return;
    await vendorService.adminUpdateProductNotes(product.id, value);
  };

  const handleNotesChange = (v: string) => {
    setAdminNotes(v);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(v), 1500);
  };

  const isPending  = product?.status === 'pending_approval';
  const isApproved = product?.status === 'approved';

  return (
    <>
      {dialog && product && (
        <ActionAlertDialog
          type={dialog}
          reason={reason}
          acting={acting}
          onReasonChange={setReason}
          onConfirm={handleAction}
          onCancel={() => { setDialog(null); setReason(''); }}
        />
      )}

      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative flex w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{product?.name ?? 'Loading…'}</h2>
                {product && <StatusBadge status={product.status} />}
              </div>
              {product && (
                <p className="text-xs text-muted-foreground">
                  by {product.vendor_name} · Submitted {formatDate(product.submitted_at)}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : product ? (
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {msg && (
                <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>
                  {msg.text}
                </div>
              )}

              {/* Images */}
              {product.images.length > 0 && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Images</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.image_url ?? ''}
                        alt={img.alt_text}
                        className="h-20 w-20 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Product info */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Product Details</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-36 text-muted-foreground">SKU</dt>
                    <dd className="font-mono">{product.sku}</dd>
                  </div>
                  {product.barcode && (
                    <div className="flex gap-2">
                      <dt className="w-36 text-muted-foreground">Barcode</dt>
                      <dd>{product.barcode}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-36 text-muted-foreground">Category</dt>
                    <dd>{product.category?.name ?? '—'}</dd>
                  </div>
                  {product.monthly_capacity != null && (
                    <div className="flex gap-2">
                      <dt className="w-36 text-muted-foreground">Monthly Capacity</dt>
                      <dd>{product.monthly_capacity.toLocaleString()} units</dd>
                    </div>
                  )}
                  {product.yearly_capacity != null && (
                    <div className="flex gap-2">
                      <dt className="w-36 text-muted-foreground">Yearly Capacity</dt>
                      <dd>{product.yearly_capacity.toLocaleString()} units</dd>
                    </div>
                  )}
                  {product.description && (
                    <div className="flex gap-2">
                      <dt className="w-36 text-muted-foreground">Description</dt>
                      <dd className="flex-1">{product.description}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Variants */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Variants</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3">Name</th>
                        <th className="pb-2 pr-3">Type</th>
                        <th className="pb-2 pr-3">SKU</th>
                        <th className="pb-2 pr-3">MRP</th>
                        <th className="pb-2">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {product.variants.map((v) => (
                        <tr key={v.id}>
                          <td className="py-2 pr-3 font-medium">{v.name}</td>
                          <td className="py-2 pr-3 capitalize text-muted-foreground">{v.variant_type}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{v.sku}</td>
                          <td className="py-2 pr-3">₹{v.mrp}</td>
                          <td className="py-2">{v.is_active ? '✓' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Catalog link */}
              {isApproved && product.catalog_product_id && (
                <section className="rounded-md border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 text-sm font-medium text-green-800">Linked to Catalog Product</p>
                  <a
                    href={`/admin/products/${product.catalog_product_id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:underline"
                  >
                    View in catalog <ExternalLink className="h-3 w-3" />
                  </a>
                </section>
              )}

              {/* Rejection reason */}
              {product.status === 'rejected' && product.rejection_reason && (
                <section className="rounded-md border border-red-200 bg-red-50 p-4">
                  <p className="mb-1 text-sm font-medium text-red-800">Rejection Reason</p>
                  <p className="text-sm text-red-700">{product.rejection_reason}</p>
                </section>
              )}

              {/* Admin actions */}
              {isPending && (
                <section className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                    onClick={() => setDialog('approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => setDialog('reject')}
                  >
                    Reject
                  </Button>
                </section>
              )}

              {/* Internal notes */}
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</h3>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                  placeholder="Admin-only notes (auto-saved)…"
                  value={adminNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={() => saveNotes(adminNotes)}
                />
              </section>

              {/* Reviewer info */}
              {product.reviewed_by_name && (
                <p className="text-xs text-muted-foreground">
                  Reviewed by {product.reviewed_by_name}
                  {product.reviewed_at ? ` on ${formatDate(product.reviewed_at)}` : ''}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">Product not found.</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminVendorProductsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts]       = useState<VendorProductAdminListItem[]>([]);
  const [stats, setStats]             = useState<VendorProductStats | null>(null);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const { msg } = useToast();

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await vendorService.adminListProducts(params);
      setProducts(res.data.results);
      setTotal(res.data.count);
      setStats(res.data.stats);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Vendor Products</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {msg && (
            <div className={cn('mb-4 rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>
              {msg.text}
            </div>
          )}

          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Vendor Products</h1>
            <p className="text-sm text-muted-foreground">Review and approve vendor product submissions</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total"          value={stats.total} />
              <StatCard label="Pending Review" value={stats.pending_approval} color="text-amber-600" />
              <StatCard label="Approved"       value={stats.approved}         color="text-green-600" />
              <StatCard label="Rejected"       value={stats.rejected}         color="text-red-600" />
              <StatCard label="Deactivated"    value={stats.not_continued}    color="text-gray-500" />
            </div>
          )}

          {/* Filters */}
          <div className="mb-4">
            <FilterToolbar
              searchPlaceholder="Search by product name, SKU, vendor…"
              searchValue={search}
              onSearchChange={(v) => setSearch(v)}
              filters={[
                {
                  id: 'status',
                  placeholder: 'All Statuses',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'pending_approval', label: 'Pending Review' },
                    { value: 'approved',         label: 'Approved' },
                    { value: 'rejected',         label: 'Rejected' },
                    { value: 'not_continued',    label: 'Deactivated' },
                  ],
                },
              ]}
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-center">Variants</th>
                    <th className="px-4 py-3">MRP Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-muted-foreground">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-muted-foreground">
                        <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
                        No products found
                      </td>
                    </tr>
                  ) : products.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedId(p.id)}
                    >
                      <td className="px-4 py-3" style={{ width: '64px' }}>
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0"
                          style={{ minWidth: '48px', minHeight: '48px' }}
                        >
                          {p.primary_image ? (
                            <img
                              src={p.primary_image}
                              alt=""
                              className="w-full h-full"
                              style={{ objectFit: 'cover', display: 'block' }}
                              onError={(e) => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.vendor_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{p.variant_count}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.mrp_range ? `₹${p.mrp_range.min}${p.mrp_range.min !== p.mrp_range.max ? ` – ₹${p.mrp_range.max}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchProducts(page - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchProducts(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedId && (
        <ProductDetailSheet
          productId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => fetchProducts(page)}
        />
      )}
    </div>
  );
}
