import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { OrderItemStatusBadge } from '@/components/orders/OrderItemStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { returnsService } from '@/services/returnsService';
import type { ReturnRequest, ReturnSettings } from '@/types/returns.types';
import { cn } from '@utils/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

// ── Return Request Detail Sheet ───────────────────────────────────────────────

function ReturnDetailSheet({
  rrId,
  onClose,
  onUpdated,
}: {
  rrId: string;
  onClose: () => void;
  onUpdated: (rr: ReturnRequest) => void;
}) {
  const toast = useToast();
  const [rr,      setRr]      = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes,   setNotes]   = useState('');
  const [acting,  setActing]  = useState(false);

  useEffect(() => {
    returnsService.adminDetail(rrId)
      .then((r) => { setRr(r.data); setNotes(r.data.admin_notes ?? ''); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rrId]);

  const handleApprove = async () => {
    if (!rr) return;
    setActing(true);
    try {
      const r = await returnsService.approve(rr.id);
      setRr(r.data);
      onUpdated(r.data);
      toast.show('Request approved');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to approve';
      toast.show(msg, true);
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rr) return;
    setActing(true);
    try {
      const r = await returnsService.reject(rr.id, notes);
      setRr(r.data);
      onUpdated(r.data);
      toast.show('Request rejected');
    } catch {
      toast.show('Failed to reject', true);
    } finally { setActing(false); }
  };

  const handleRequestInfo = async () => {
    if (!rr) return;
    setActing(true);
    try {
      const r = await returnsService.requestInfo(rr.id, notes);
      setRr(r.data);
      onUpdated(r.data);
      toast.show('Info requested');
    } catch {
      toast.show('Failed', true);
    } finally { setActing(false); }
  };

  const canAct = rr && (rr.status === 'raised' || rr.status === 'under_review');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold">Return / Exchange Details</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Toast */}
        {toast.msg && (
          <div className={cn('mx-5 mt-3 rounded-lg px-3 py-2 text-xs text-white', toast.msg.err ? 'bg-red-500' : 'bg-foreground')}>
            {toast.msg.text}
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : rr ? (
          <div className="p-5 space-y-5">
            {/* Type + Status */}
            <div className="flex items-center gap-2">
              <Badge variant={rr.request_type === 'return' ? 'info' : 'secondary'}>
                {rr.request_type}
              </Badge>
              <OrderItemStatusBadge
                status={
                  rr.request_type === 'return'
                    ? rr.status === 'raised'
                      ? 'return_requested'
                      : rr.status === 'approved' || rr.status === 'completed'
                      ? 'return_approved'
                      : rr.status === 'rejected'
                      ? 'return_rejected'
                      : 'return_requested'
                    : rr.status === 'raised'
                    ? 'exchange_requested'
                    : rr.status === 'approved' || rr.status === 'completed'
                    ? 'exchange_approved'
                    : rr.status === 'rejected'
                    ? 'exchange_rejected'
                    : 'exchange_requested'
                }
              />
              <span className="ml-auto text-xs text-muted-foreground">{formatDate(rr.raised_at)}</span>
            </div>

            {/* Customer */}
            <div className="rounded-xl border p-4 text-sm">
              <p className="font-semibold mb-1">Customer</p>
              <p className="font-medium">{rr.raised_by_name}</p>
            </div>

            {/* Product */}
            <div className="rounded-xl border p-4 text-sm space-y-1">
              <p className="font-semibold mb-1">Product</p>
              <p className="font-medium">{rr.order_item.product_name}</p>
              <p className="text-muted-foreground">{rr.order_item.variant_name} &middot; SKU: {rr.order_item.sku}</p>
              <p className="text-muted-foreground">Qty to return: <span className="font-medium text-foreground">{rr.return_qty}</span></p>
              {rr.request_type === 'exchange' && rr.exchange_variant_name && (
                <p className="text-muted-foreground">Exchange for: <span className="font-medium text-foreground">{rr.exchange_variant_name}</span></p>
              )}
              {rr.refund_amount && (
                <p className="text-muted-foreground">
                  Refund: <span className="font-semibold text-emerald-600 dark:text-emerald-400">&#8377;{rr.refund_amount}</span>
                </p>
              )}
            </div>

            {/* Reason + Notes */}
            <div className="rounded-xl border p-4 text-sm space-y-1">
              <p className="font-semibold mb-1">Reason</p>
              <p>{rr.reason}</p>
              {rr.notes && <p className="text-muted-foreground italic">{rr.notes}</p>}
            </div>

            {/* Photos */}
            {rr.photos.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Photos</p>
                <div className="flex gap-2 flex-wrap">
                  {rr.photos.map((p) => (
                    <a key={p.id} href={p.photo} target="_blank" rel="noreferrer">
                      <img
                        src={p.photo}
                        alt="return photo"
                        className="h-16 w-16 rounded-md object-cover border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Existing admin notes */}
            {rr.admin_notes && !canAct && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                {rr.admin_notes}
              </div>
            )}

            {/* Admin actions */}
            {canAct && (
              <div className="rounded-xl border p-4 space-y-3">
                <p className="font-semibold text-sm">Admin Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note to customer…"
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={acting}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={acting}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleRequestInfo}
                    disabled={acting}
                    className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
                  >
                    Need Info
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">Failed to load request.</p>
        )}
      </div>
    </div>
  );
}

// ── Settings Card ─────────────────────────────────────────────────────────────

function ReturnSettingsCard() {
  const toast = useToast();
  const [settings, setSettings]   = useState<ReturnSettings | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(false);
  const [days,     setDays]       = useState(7);
  const [reasons,  setReasons]    = useState<string[]>([]);
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    returnsService.getSettings()
      .then((r) => {
        setSettings(r.data);
        setDays(r.data.return_window_days);
        setReasons(r.data.predefined_reasons);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await returnsService.updateSettings({
        return_window_days: days,
        predefined_reasons: reasons,
      });
      setSettings(r.data);
      toast.show('Settings saved');
    } catch {
      toast.show('Failed to save', true);
    } finally {
      setSaving(false);
    }
  };

  const addReason = () => {
    const trimmed = newReason.trim();
    if (!trimmed || reasons.includes(trimmed)) return;
    setReasons((prev) => [...prev, trimmed]);
    setNewReason('');
  };

  const removeReason = (idx: number) => {
    setReasons((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-base">Return Settings</h2>

      {/* Toast */}
      {toast.msg && (
        <div className={cn('rounded-lg px-3 py-2 text-xs text-white', toast.msg.err ? 'bg-red-500' : 'bg-foreground')}>
          {toast.msg.text}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : settings ? (
        <>
          {/* Window days */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Return window (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-32 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Predefined reasons */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Predefined reasons</p>
            <div className="space-y-1.5 mb-2">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span>{r}</span>
                  <button
                    onClick={() => removeReason(i)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            {/* Add reason */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addReason(); }}
                placeholder="Add a reason…"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={addReason}
                className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Failed to load settings.</p>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminReturnsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  const [requests,    setRequests]    = useState<ReturnRequest[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [next,        setNext]        = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewId,      setViewId]      = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, raised: 0, under_review: 0, approved: 0 });

  // Filters
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRequests = useCallback(async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const params: Record<string, string> = { page: String(pg) };
    if (search)       params.search       = search;
    if (typeFilter)   params.request_type = typeFilter;
    if (statusFilter) params.status       = statusFilter;

    try {
      const r = await returnsService.adminList(params);
      setRequests((prev) => reset ? r.data.results : [...prev, ...r.data.results]);
      setTotal(r.data.count);
      setNext(r.data.next);
      setPage(pg);
    } catch {
      toast.show('Failed to load requests', true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, statusFilter]);

  // Fetch stats (all requests without pagination)
  const fetchStats = useCallback(async () => {
    try {
      const [all, raised, under_review, approved] = await Promise.all([
        returnsService.adminList({ page: '1' }),
        returnsService.adminList({ status: 'raised',       page: '1' }),
        returnsService.adminList({ status: 'under_review', page: '1' }),
        returnsService.adminList({ status: 'approved',     page: '1' }),
      ]);
      setStats({
        total:        all.data.count,
        raised:       raised.data.count,
        under_review: under_review.data.count,
        approved:     approved.data.count,
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchRequests(1, true), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchRequests]);

  const handleUpdated = (updated: ReturnRequest) => {
    setRequests((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    fetchStats();
  };

  const STAT_CARDS = [
    { label: 'Total',        value: stats.total,        color: 'text-foreground'                              },
    { label: 'Raised',       value: stats.raised,       color: 'text-amber-600 dark:text-amber-400'          },
    { label: 'Under Review', value: stats.under_review, color: 'text-blue-600 dark:text-blue-400'            },
    { label: 'Approved',     value: stats.approved,     color: 'text-emerald-600 dark:text-emerald-400'      },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-[52px] items-center gap-3 border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1.5 hover:bg-muted">
            <Menu size={18} />
          </button>
          <span className="font-semibold">Returns & Exchanges</span>
        </header>

        <main className="flex-1 px-4 py-6 space-y-5 max-w-full">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-foreground">Returns &amp; Exchanges</h1>
          </div>

          {/* Toast */}
          {toast.msg && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm text-white', toast.msg.err ? 'bg-red-500' : 'bg-foreground')}>
              {toast.msg.text}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STAT_CARDS.map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className={cn('mt-1 text-2xl font-bold', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filter toolbar */}
          <FilterToolbar
            searchPlaceholder="Search by customer name…"
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                id:          'type',
                placeholder: 'All types',
                value:       typeFilter,
                onChange:    setTypeFilter,
                width:       'w-[130px]',
                options: [
                  { label: 'Return',   value: 'return'   },
                  { label: 'Exchange', value: 'exchange' },
                ],
              },
              {
                id:          'status',
                placeholder: 'All statuses',
                value:       statusFilter,
                onChange:    setStatusFilter,
                width:       'w-[150px]',
                options: [
                  { label: 'Raised',       value: 'raised'       },
                  { label: 'Under Review', value: 'under_review' },
                  { label: 'Approved',     value: 'approved'     },
                  { label: 'Rejected',     value: 'rejected'     },
                  { label: 'Completed',    value: 'completed'    },
                ],
              },
            ]}
            resultCount={loading ? undefined : { showing: requests.length, total, label: 'requests' }}
          />

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground text-sm">
              No requests found.
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Customer', 'Product', 'Type', 'Status', 'Raised', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((rr) => (
                    <tr key={rr.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{rr.raised_by_name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{rr.order_item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{rr.order_item.variant_name} &times; {rr.return_qty}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={rr.request_type === 'return' ? 'info' : 'secondary'}>
                          {rr.request_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <OrderItemStatusBadge
                          status={
                            rr.request_type === 'return'
                              ? rr.status === 'raised' ? 'return_requested'
                                : (rr.status === 'approved' || rr.status === 'completed') ? 'return_approved'
                                : rr.status === 'rejected' ? 'return_rejected'
                                : 'return_requested'
                              : rr.status === 'raised' ? 'exchange_requested'
                                : (rr.status === 'approved' || rr.status === 'completed') ? 'exchange_approved'
                                : rr.status === 'rejected' ? 'exchange_rejected'
                                : 'exchange_requested'
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(rr.raised_at))}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewId(rr.id)}
                          className="flex items-center gap-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {next && !loading && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchRequests(page + 1, false)}
                disabled={loadingMore}
                className="rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}

          {/* Settings card */}
          <ReturnSettingsCard />
        </main>
      </div>

      {/* Detail sheet */}
      {viewId && (
        <ReturnDetailSheet
          rrId={viewId}
          onClose={() => setViewId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
