import { useState, useEffect, useCallback } from 'react';
import { returnsService } from '@/services/returnsService';
import type { ReturnRequest, ReturnSettings } from '@/types/returns.types';
import { ReturnRequestCard } from '@/components/returns/ReturnRequestCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

const TYPE_OPTIONS = [
  { label: 'Return',   value: 'return'   },
  { label: 'Exchange', value: 'exchange' },
];

const STATUS_OPTIONS = [
  { label: 'Raised',           value: 'raised'         },
  { label: 'Under Review',     value: 'under_review'   },
  { label: 'Approved',         value: 'approved'       },
  { label: 'Rejected',         value: 'rejected'       },
  { label: 'Rejected (Final)', value: 'rejected_final' },
  { label: 'Completed',        value: 'completed'      },
];

// ── ReturnsTab ────────────────────────────────────────────────────────────────

export function ReturnsTab() {
  const [requests,    setRequests]    = useState<ReturnRequest[]>([]);
  const [settings,   setSettings]    = useState<ReturnSettings | null>(null);
  const [loading,    setLoading]     = useState(true);
  const [next,       setNext]        = useState<string | null>(null);
  const [loadingMore,setLoadingMore] = useState(false);
  const [page,       setPage]        = useState(1);
  const [typeFilter, setTypeFilter]  = useState('');
  const [statusFilter,setStatusFilter] = useState('');
  const [error,      setError]       = useState('');

  // Fetch settings once
  useEffect(() => {
    returnsService.getSettings().then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  const fetchRequests = useCallback(async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    else       setLoadingMore(true);
    setError('');
    const params: Record<string, string> = { page: String(pg) };
    if (typeFilter)   params.request_type = typeFilter;
    if (statusFilter) params.status       = statusFilter;
    try {
      const r = await returnsService.getMyRequests(params);
      setRequests((prev) => reset ? r.data.results : [...prev, ...r.data.results]);
      setNext(r.data.next);
      setPage(pg);
    } catch {
      setError('Failed to load your return requests.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    fetchRequests(1, true);
  }, [fetchRequests]);

  const handleUpdated = (updated: ReturnRequest) => {
    setRequests((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  const clearFilters = () => { setTypeFilter(''); setStatusFilter(''); };
  const hasFilters   = !!typeFilter || !!statusFilter;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-8 rounded-lg border px-3 text-xs hover:bg-muted transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground text-sm">
          {hasFilters ? 'No requests match your filters.' : 'You have no return or exchange requests yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((rr) => (
            <ReturnRequestCard
              key={rr.id}
              rr={rr}
              settings={settings}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {next && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchRequests(page + 1, false)}
            disabled={loadingMore}
            className="rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
