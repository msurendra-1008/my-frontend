import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Search } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { commissionService } from '@/services/commissionService';
import type { CommissionEntry } from '@/types/commission.types';
import { cn } from '@utils/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

type StatusFilter = 'all' | 'pending_window' | 'pending' | 'credited' | 'vacant';

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CommissionEntry['status'] }) {
  const cfg: Record<CommissionEntry['status'], string> = {
    pending_window: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    pending:        'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    credited:       'bg-green-500/10 text-green-600 dark:text-green-400',
    vacant:         'bg-muted/50 text-muted-foreground',
  };
  const label: Record<CommissionEntry['status'], string> = {
    pending_window: 'Pending window',
    pending:        'Pending',
    credited:       'Credited',
    vacant:         'Vacant',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', cfg[status])}>
      {label[status]}
    </span>
  );
}

// ── Stats card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── PendingCommissionsPage ────────────────────────────────────────────────────

export function PendingCommissionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  const [entries,  setEntries]  = useState<CommissionEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [creditingId, setCreditingId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEntries = useCallback(async (searchVal: string, statusVal: StatusFilter) => {
    setLoading(true);
    try {
      const params: { status?: string; search?: string } = {};
      if (statusVal !== 'all') params.status = statusVal;
      if (searchVal.trim())    params.search = searchVal.trim();
      const r = await commissionService.getPendingEntries(params);
      setEntries(r.data.results ?? []);
    } catch {
      toast.show('Failed to load commission entries', true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced fetch on search/filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEntries(search, statusFilter), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, statusFilter, fetchEntries]);

  const handleCredit = async (entry: CommissionEntry) => {
    setCreditingId(entry.id);
    try {
      const r = await commissionService.creditEntry(entry.id);
      setEntries((prev) => prev.map((e) => e.id === entry.id ? r.data : e));
      toast.show(`Credited ₹${entry.amount} to ${entry.recipient_name}`);
    } catch {
      toast.show('Failed to credit entry', true);
    } finally {
      setCreditingId(null);
    }
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  // Both 'pending_window' (active user, waiting) and 'pending' (inactive user) count as uncredited
  const uncreditedEntries = entries.filter((e) => e.status === 'pending_window' || e.status === 'pending');
  const pendingCount      = uncreditedEntries.length;
  const pendingAmount     = uncreditedEntries.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
  // Eligible = window expired → admin can act (credit 'pending' manually; 'pending_window' awaits auto-process)
  const eligibleCount     = uncreditedEntries.filter((e) => isExpired(e.return_window_expires)).length;

  const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all',            label: 'All' },
    { key: 'pending_window', label: 'Awaiting window' },
    { key: 'pending',        label: 'Inactive users' },
    { key: 'credited',       label: 'Credited' },
    { key: 'vacant',         label: 'Vacant' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-[52px] items-center gap-3 border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1.5 hover:bg-muted">
            <Menu size={18} />
          </button>
          <span className="font-semibold">Pending Commissions</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-foreground">Pending Commissions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and credit pending commission entries
            </p>
          </div>

          {/* Toast */}
          {toast.msg && (
            <div className={cn(
              'rounded-lg px-4 py-2.5 text-sm text-white',
              toast.msg.err ? 'bg-red-500' : 'bg-foreground',
            )}>
              {toast.msg.text}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Pending"
              value={pendingCount}
              sub="entries awaiting credit"
            />
            <StatCard
              label="Total Pending Amount"
              value={`₹${pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              sub="across all pending entries"
            />
            <StatCard
              label="Eligible to Credit"
              value={eligibleCount}
              sub="return window expired"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or UPA ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Status tabs */}
              <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      statusFilter === tab.key
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {!loading && (
              <p className="text-xs text-muted-foreground">
                Showing {entries.length} entries
              </p>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
              No commission entries found.
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Order #', 'Beneficiary', 'Level', 'Rate', 'Amount', 'Return Window', 'Status', 'Action'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const expired = isExpired(entry.return_window_expires);
                    const canCredit = entry.status === 'pending' && expired;
                    return (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {entry.order_number}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{entry.recipient_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{entry.recipient_upa_id}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">L{entry.level}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.percentage_applied}%</td>
                        <td className="px-4 py-3 font-semibold text-foreground">₹{entry.amount}</td>
                        <td className="px-4 py-3">
                          {entry.return_window_expires ? (
                            <span className={cn(
                              'text-xs',
                              expired
                                ? 'text-muted-foreground'
                                : 'text-amber-700 dark:text-amber-400',
                            )}>
                              {formatDate(entry.return_window_expires)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-4 py-3">
                          {/* Inactive user — admin can credit once window expires */}
                          {entry.status === 'pending' && canCredit && (
                            <button
                              onClick={() => handleCredit(entry)}
                              disabled={creditingId === entry.id}
                              className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                            >
                              {creditingId === entry.id ? 'Crediting…' : 'Credit'}
                            </button>
                          )}
                          {entry.status === 'pending' && !canCredit && entry.return_window_expires && (
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              Window expires {formatDate(entry.return_window_expires)}
                            </span>
                          )}
                          {/* Active user — window not yet expired */}
                          {entry.status === 'pending_window' && !expired && entry.return_window_expires && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              Expires {formatDate(entry.return_window_expires)}
                            </span>
                          )}
                          {/* Active user — window expired, awaiting auto-process */}
                          {entry.status === 'pending_window' && expired && (
                            <span className="text-xs text-muted-foreground">Ready to process</span>
                          )}
                          {entry.status === 'credited' && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {formatDate(entry.credited_at)}
                            </span>
                          )}
                          {entry.status === 'vacant' && (
                            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                              Vacant
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
