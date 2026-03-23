import { useState, useEffect, useCallback } from 'react';
import { returnsService } from '@/services/returnsService';
import { OrderItemStatusBadge } from '@/components/orders/OrderItemStatusBadge';
import type { ReturnRequest } from '@/types/returns.types';
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

// ── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ rr }: { rr: ReturnRequest }) {
  const showRefund =
    rr.request_type === 'return' &&
    (rr.status === 'approved' || rr.status === 'completed') &&
    rr.refund_amount != null;

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
      {rr.admin_notes && (
        <p className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-amber-800 dark:text-amber-300">
          Admin: {rr.admin_notes}
        </p>
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
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [next,     setNext]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,     setPage]     = useState(1);

  const [typeFilter,   setTypeFilter]   = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

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
            <RequestCard key={rr.id} rr={rr} />
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
