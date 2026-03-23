import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { returnsService } from '@/services/returnsService';
import { productService } from '@/services/productService';
import { OrderItemStatusBadge } from '@/components/orders/OrderItemStatusBadge';
import type { ReturnRequest, ReturnRequestType, ReturnSettings } from '@/types/returns.types';
import type { ProductVariant } from '@/types/product.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

// ── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

const TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Return',   value: 'return'   },
  { label: 'Exchange', value: 'exchange' },
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'Raised',       value: 'raised'       },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved',     value: 'approved'     },
  { label: 'Rejected',     value: 'rejected'     },
  { label: 'Completed',    value: 'completed'    },
];

// ── Raise Return Form (inline, for re-raising after rejection) ────────────────

function RaiseReturnInlineForm({
  orderItemId,
  orderItemQty,
  productSlug,
  variantId,
  settings,
  onSuccess,
  onCancel,
}: {
  orderItemId: string;
  orderItemQty: number;
  productSlug:  string | null;
  variantId:    string | null;
  settings:     ReturnSettings;
  onSuccess:    (rr: ReturnRequest) => void;
  onCancel:     () => void;
}) {
  const [type,       setType]       = useState<ReturnRequestType>('return');
  const [qty,        setQty]        = useState(1);
  const [reason,     setReason]     = useState('');
  const [notes,      setNotes]      = useState('');
  const [exVariant,  setExVariant]  = useState('');
  const [variants,   setVariants]   = useState<ProductVariant[]>([]);
  const [photos,     setPhotos]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (type === 'exchange' && productSlug && variantId) {
      productService.getProduct(productSlug)
        .then((r) => setVariants(
          r.data.variants.filter((v) => v.id !== variantId && v.is_active && v.stock_quantity > 0),
        ))
        .catch(() => {});
    }
  }, [type, productSlug, variantId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason.'); return; }
    if (type === 'exchange' && !exVariant) { setError('Please select an exchange variant.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const resp = await returnsService.createRequest({
        order_item_id:       orderItemId,
        request_type:        type,
        return_qty:          qty,
        exchange_variant_id: type === 'exchange' ? exVariant : undefined,
        reason,
        notes,
      });
      for (const file of photos) {
        try { await returnsService.uploadPhoto(resp.data.id, file); } catch { /**/ }
      }
      onSuccess(resp.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string; order_item_id?: string[] } } })
        ?.response?.data;
      setError(detail?.detail ?? detail?.order_item_id?.[0] ?? 'Failed to raise request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">New Request</p>
        <button onClick={onCancel} className="rounded-md p-1 hover:bg-muted"><X size={13} /></button>
      </div>

      {/* Type */}
      <div className="flex gap-2">
        {(['return', 'exchange'] as ReturnRequestType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
              type === t
                ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Qty */}
      {orderItemQty > 1 && (
        <input
          type="number" min={1} max={orderItemQty} value={qty}
          onChange={(e) => setQty(Math.min(orderItemQty, Math.max(1, Number(e.target.value))))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder={`Qty (max ${orderItemQty})`}
        />
      )}

      {/* Exchange variant */}
      {type === 'exchange' && (
        variants.length === 0
          ? <p className="text-xs text-muted-foreground">No other variants available.</p>
          : (
            <select
              value={exVariant} onChange={(e) => setExVariant(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select variant…</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.name} (stock: {v.stock_quantity})</option>
              ))}
            </select>
          )
      )}

      {/* Reason */}
      <select
        value={reason} onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        <option value="">Select reason…</option>
        {settings.predefined_reasons.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Notes */}
      <textarea
        value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Additional details (optional)…"
        rows={2}
        className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      {/* Photos */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Photos (optional, max 3)</p>
        <input type="file" accept="image/*" multiple onChange={handleFileChange} className="text-xs text-muted-foreground" />
        {photos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1">
            {photos.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt="" className="h-10 w-10 rounded-md object-cover border" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-white flex items-center justify-center"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Raise Request'}
      </button>
    </div>
  );
}

// ── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  rr,
  settings,
  onUpdated,
}: {
  rr:        ReturnRequest;
  settings:  ReturnSettings | null;
  onUpdated: (updated: ReturnRequest) => void;
}) {
  const [replyOpen,   setReplyOpen]   = useState(false);
  const [replyNotes,  setReplyNotes]  = useState('');
  const [replyPhotos, setReplyPhotos] = useState<File[]>([]);
  const [sending,     setSending]     = useState(false);
  const [replyError,  setReplyError]  = useState('');
  const [raiseOpen,   setRaiseOpen]   = useState(false);

  const rejectionCount = rr.order_item.return_rejection_count;

  const showRefund =
    rr.request_type === 'return' &&
    (rr.status === 'approved' || rr.status === 'completed') &&
    rr.refund_amount != null;

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = 3 - rr.photos.length;
    const files = Array.from(e.target.files ?? []);
    setReplyPhotos((prev) => [...prev, ...files].slice(0, remaining));
  };

  const handleSendReply = async () => {
    if (!replyNotes.trim()) { setReplyError('Please enter a reply.'); return; }
    setReplyError('');
    setSending(true);
    try {
      const resp = await returnsService.userReply(rr.id, replyNotes.trim());
      for (const file of replyPhotos) {
        try { await returnsService.uploadPhoto(rr.id, file); } catch { /**/ }
      }
      setReplyOpen(false);
      setReplyNotes('');
      setReplyPhotos([]);
      onUpdated(resp.data);
    } catch {
      setReplyError('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {rr.order_item.product_name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rr.order_item.variant_name} &middot; SKU: {rr.order_item.sku}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={rr.request_type === 'return' ? 'info' : 'secondary'}>
            {rr.request_type}
          </Badge>
          <OrderItemStatusBadge
            status={
              rr.request_type === 'return'
                ? rr.status === 'raised'
                  ? 'return_requested'
                  : rr.status === 'approved'
                  ? 'return_approved'
                  : rr.status === 'rejected'
                  ? 'return_rejected'
                  : rr.status === 'completed'
                  ? 'refunded'
                  : 'return_requested'
                : rr.status === 'raised'
                ? 'exchange_requested'
                : rr.status === 'approved'
                ? 'exchange_approved'
                : rr.status === 'rejected'
                ? 'exchange_rejected'
                : rr.status === 'completed'
                ? 'exchanged'
                : 'exchange_requested'
            }
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">Qty: </span>
          <span className="font-medium">{rr.return_qty}</span>
        </div>
        {rr.request_type === 'exchange' && rr.exchange_variant_name && (
          <div className="col-span-2 sm:col-span-2">
            <span className="text-muted-foreground">Exchange for: </span>
            <span className="font-medium">{rr.exchange_variant_name}</span>
          </div>
        )}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-muted-foreground">Reason: </span>
          <span className="font-medium">{rr.reason}</span>
        </div>
        {showRefund && (
          <div>
            <span className="text-muted-foreground">Refund: </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              &#8377;{rr.refund_amount}
            </span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">Raised: </span>
          <span className="font-medium">{formatDate(rr.raised_at)}</span>
        </div>
      </div>

      {/* Notes */}
      {rr.notes && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">
          Your note: {rr.notes}
        </p>
      )}

      {/* Under review — admin info request + reply form */}
      {rr.status === 'under_review' && rr.admin_notes && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 space-y-2">
          <p><span className="font-semibold">Admin needs more info:</span> {rr.admin_notes}</p>
          {!replyOpen && (
            <button
              onClick={() => setReplyOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Reply
            </button>
          )}
          {replyOpen && (
            <div className="space-y-2 pt-1">
              <textarea
                value={replyNotes}
                onChange={(e) => setReplyNotes(e.target.value)}
                placeholder="Provide additional details…"
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-foreground"
              />
              {(3 - rr.photos.length) > 0 && (
                <div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-1">
                    Attach photos (up to {3 - rr.photos.length} more)
                  </p>
                  <input
                    type="file" accept="image/*" multiple
                    onChange={handleReplyFileChange}
                    className="text-[11px] text-amber-700 dark:text-amber-400"
                  />
                  {replyPhotos.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {replyPhotos.map((f, i) => (
                        <div key={i} className="relative">
                          <img src={URL.createObjectURL(f)} alt="" className="h-10 w-10 rounded-md object-cover border" />
                          <button
                            onClick={() => setReplyPhotos((p) => p.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-white flex items-center justify-center"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {replyError && (
                <p className="text-[11px] text-destructive">{replyError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSendReply}
                  disabled={sending}
                  className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
                <button
                  onClick={() => { setReplyOpen(false); setReplyNotes(''); setReplyPhotos([]); setReplyError(''); }}
                  className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejected — admin rejection reason + re-raise option */}
      {rr.status === 'rejected' && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5 text-xs text-red-800 dark:text-red-300 space-y-2">
          {rr.admin_notes && (
            <p><span className="font-semibold">Rejection reason:</span> {rr.admin_notes}</p>
          )}
          {rejectionCount < 2 ? (
            !raiseOpen ? (
              <button
                onClick={() => setRaiseOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 dark:text-red-400 hover:underline"
              >
                <RotateCcw size={10} />
                You can raise a new request
              </button>
            ) : null
          ) : (
            <p className="text-[11px] text-muted-foreground">No further requests allowed for this item.</p>
          )}
        </div>
      )}

      {/* Re-raise form */}
      {rr.status === 'rejected' && raiseOpen && settings && rejectionCount < 2 && (
        <RaiseReturnInlineForm
          orderItemId={rr.order_item.id}
          orderItemQty={rr.order_item.quantity}
          productSlug={rr.order_item.product_slug}
          variantId={rr.order_item.variant_id}
          settings={settings}
          onSuccess={(newRr) => { setRaiseOpen(false); onUpdated(newRr); }}
          onCancel={() => setRaiseOpen(false)}
        />
      )}

      {/* Photo thumbnails */}
      {rr.photos.length > 0 && (
        <div className="flex gap-2 flex-wrap pt-1">
          {rr.photos.map((p) => (
            <a key={p.id} href={p.photo} target="_blank" rel="noreferrer">
              <img
                src={p.photo}
                alt="return photo"
                className="h-14 w-14 rounded-md object-cover border hover:opacity-80 transition-opacity"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReturnsTab() {
  const [requests,  setRequests]  = useState<ReturnRequest[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [next,      setNext]      = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,      setPage]      = useState(1);
  const [settings,  setSettings]  = useState<ReturnSettings | null>(null);

  const [typeFilter,   setTypeFilter]   = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    returnsService.getSettings()
      .then((r) => setSettings(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async (pg: number, type: string, status: string) => {
    try {
      const params: Record<string, string> = { page: String(pg) };
      if (type)   params.request_type = type;
      if (status) params.status       = status;
      const r = await returnsService.getMyRequests(params);
      if (pg === 1) {
        setRequests(r.data.results);
      } else {
        setRequests((prev) => [...prev, ...r.data.results]);
      }
      setTotal(r.data.count);
      setNext(r.data.next);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    load(1, typeFilter, statusFilter).finally(() => setLoading(false));
  }, [typeFilter, statusFilter, load]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await load(nextPage, typeFilter, statusFilter).finally(() => setLoadingMore(false));
    setPage(nextPage);
  };

  const handleUpdated = (updated: ReturnRequest) => {
    setRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      // New request raised after rejection — reload list
      return [updated, ...prev];
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={typeFilter || undefined}
          onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-muted-foreground">All types</SelectItem>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter || undefined}
          onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__" className="text-muted-foreground">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(typeFilter || statusFilter) && (
          <button
            onClick={() => { setTypeFilter(''); setStatusFilter(''); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        )}

        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {total} request{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No return or exchange requests yet.</p>
        </div>
      )}

      {/* Request cards */}
      {!loading && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((rr) => (
            <RequestCard
              key={rr.id}
              rr={rr}
              settings={settings}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {!loading && next && (
        <div className="pt-1">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
