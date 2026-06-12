import { useState, useEffect, useCallback } from 'react';
import { Menu, Search, Sun, Moon } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@components/ui/Badge';
import { useTheme } from '@context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { commissionService } from '@/services/commissionService';
import type { PendingCommissionEntry, PendingStats } from '@/types/commission.types';
import { cn } from '@utils/cn';

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

export function PendingCommissionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme }        = useTheme();
  const { user }                      = useAuthStore();
  const toast = useToast();

  const [entries,       setEntries]       = useState<PendingCommissionEntry[]>([]);
  const [stats,         setStats]         = useState<PendingStats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState('');
  const [reasonFilter,  setReasonFilter]  = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search.trim())  params.search     = search.trim();
      if (typeFilter)     params.entry_type = typeFilter;
      if (reasonFilter)   params.status     = reasonFilter;
      const [entriesRes, statsRes] = await Promise.all([
        commissionService.getPending(params),
        commissionService.getPendingStats(),
      ]);
      setEntries(entriesRes.data.results ?? []);
      setStats(statsRes.data);
    } catch {
      toast.show('Failed to load commission entries', true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, reasonFilter]);

  useEffect(() => {
    const t = setTimeout(fetchData, 350);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleCredit = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [`credit_${id}`]: true }));
    setErrors(prev => ({ ...prev, [id]: '' }));
    try {
      await commissionService.creditEntry(id);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to credit';
      setErrors(prev => ({ ...prev, [id]: msg }));
    } finally {
      setActionLoading(prev => ({ ...prev, [`credit_${id}`]: false }));
    }
  };

  const handleIgnore = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [`ignore_${id}`]: true }));
    try {
      await commissionService.ignoreEntry(id);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(prev => ({ ...prev, [`ignore_${id}`]: false }));
    }
  };

  const handleCreditBulk = async () => {
    try {
      await commissionService.creditBulk();
      await fetchData();
      toast.show('All eligible entries credited');
    } catch {
      toast.show('Failed to credit all', true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-md p-1.5 hover:bg-muted">
              <Menu size={18} />
            </button>
            <span className="text-base font-semibold text-foreground">Pending Commissions</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Badge variant={user?.role === 'superadmin' ? 'danger' : user?.role === 'admin' ? 'warning' : 'info'} className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

          {toast.msg && (
            <div className={cn(
              'rounded-lg border px-4 py-2.5 text-sm font-medium',
              toast.msg.err
                ? 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border-green-400/40 text-green-600 dark:text-green-400',
            )}>
              {toast.msg.text}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Pending Amount</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                ₹{stats ? Number(stats.total_pending_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">pending + vacant entries</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Inactive Users</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats?.inactive_user_count ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">users yet to activate</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Vacant Legs</p>
              <p className="text-xl font-bold text-foreground mt-1">
                {stats?.vacant_leg_count ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">no user in that position</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ignored</p>
              <p className="text-xl font-bold text-muted-foreground mt-1">
                {stats?.ignored_count ?? '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">skipped by admin</p>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, UPA ID, mobile, order…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All types</option>
              <option value="network_upline">Network upline</option>
              <option value="team_downline">Team downline</option>
            </select>
            <select
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All reasons</option>
              <option value="pending">Inactive user</option>
              <option value="vacant">Vacant leg</option>
            </select>
            <button
              onClick={handleCreditBulk}
              className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-colors whitespace-nowrap"
            >
              Credit all eligible →
            </button>
          </div>

          {/* Entry count */}
          {!loading && (
            <p className="text-xs text-muted-foreground">Showing {entries.length} entries</p>
          )}

          {/* List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
              No pending commission entries.
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm divide-y divide-border/50">
              {entries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  actionLoading={actionLoading}
                  errors={errors}
                  onCredit={handleCredit}
                  onIgnore={handleIgnore}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── EntryRow ──────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  actionLoading,
  errors,
  onCredit,
  onIgnore,
}: {
  entry:         PendingCommissionEntry;
  actionLoading: Record<string, boolean>;
  errors:        Record<string, string>;
  onCredit:      (id: string) => void;
  onIgnore:      (id: string) => void;
}) {
  const iconBg =
    entry.status === 'vacant'
      ? 'bg-amber-500/10'
      : entry.recipient_is_active
      ? 'bg-green-500/10'
      : 'bg-red-500/10';

  const iconChar =
    entry.status === 'vacant'
      ? '⏸'
      : entry.recipient_is_active
      ? '✓'
      : '⏸';

  const reasonLabel =
    entry.status === 'vacant'
      ? 'Vacant leg'
      : entry.recipient_is_active
      ? 'Now active ✓'
      : 'Inactive user';

  const reasonClass =
    entry.status === 'vacant'
      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
      : entry.recipient_is_active
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : 'bg-red-500/10 text-red-700 dark:text-red-400';

  const typeLabel =
    entry.entry_type === 'network_upline'
      ? `L${entry.level} — Network upline`
      : entry.entry_type === 'team_downline'
      ? `${entry.leg_position} leg — Team`
      : entry.entry_type;

  const isIgnored        = entry.status === 'ignored';
  const creditingBusy    = actionLoading[`credit_${entry.id}`];
  const ignoringBusy     = actionLoading[`ignore_${entry.id}`];
  const cantCredit       = entry.status === 'vacant' || isIgnored;
  const creditBtnClass   =
    cantCredit
      ? 'bg-muted text-muted-foreground border cursor-not-allowed'
      : entry.recipient_is_active
      ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20'
      : 'bg-muted text-muted-foreground border';

  return (
    <div className={cn('p-4 transition-opacity', isIgnored && 'opacity-40')}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0', iconBg)}>
          {iconChar}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{entry.recipient_name || 'Unknown'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {entry.recipient_upa_id && (
              <span className="text-xs font-mono text-muted-foreground">{entry.recipient_upa_id}</span>
            )}
            {entry.recipient_mobile && (
              <span className="text-xs text-muted-foreground">· {entry.recipient_mobile}</span>
            )}
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', reasonClass)}>
              {reasonLabel}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold text-foreground">₹{Number(entry.amount).toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {entry.percentage_applied}% of ₹{entry.pool_amount.toFixed(0)} pool
          </p>
        </div>
      </div>

      {/* Detail section */}
      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5 text-xs">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-4">
          {([
            { label: 'Order',      value: entry.order_number },
            { label: 'Product',    value: entry.product_name },
            { label: 'Buyer',      value: `${entry.buyer_name}${entry.buyer_upa_id ? ` (${entry.buyer_upa_id})` : ''}` },
            { label: 'UPA profit', value: `₹${Number(entry.upa_profit).toFixed(2)}` },
          ] as const).map(d => (
            <div key={d.label}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">{d.label}</p>
              <p className="font-medium text-foreground mt-0.5 truncate">{d.value || '—'}</p>
            </div>
          ))}
        </div>

        {/* Chain visualization */}
        {entry.upline_chain && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              {entry.upline_chain.type === 'upline' ? 'Chain:' : "Buyer's legs:"}
            </span>

            {entry.upline_chain.type === 'upline' ? (
              <>
                <span className="text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5">…upline…</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-[10px] bg-primary/10 border border-primary/30 text-primary rounded px-1.5 py-0.5 font-semibold">
                  L{entry.level} {entry.recipient_name} ⏸
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-[10px] bg-background border border-border/50 rounded px-1.5 py-0.5">…levels…</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded px-1.5 py-0.5 font-semibold">
                  ★ {entry.buyer_name}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 rounded px-1.5 py-0.5 font-semibold">
                  ★ {entry.buyer_name} (buyer)
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span className={cn(
                  'text-[10px] rounded px-1.5 py-0.5 font-semibold',
                  entry.status === 'vacant'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-primary/10 border border-primary/30 text-primary',
                )}>
                  {entry.leg_position} leg{entry.status === 'vacant' ? ' (vacant ⏸)' : ''}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {errors[entry.id] && (
        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-400/40 px-3 py-2 text-xs text-red-700 dark:text-red-400">
          ❌ {errors[entry.id]}
        </div>
      )}

      {/* Action buttons */}
      {!isIgnored ? (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onIgnore(entry.id)}
            disabled={ignoringBusy}
            className="h-8 px-4 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {ignoringBusy ? 'Ignoring…' : 'Ignore'}
          </button>
          <button
            onClick={() => onCredit(entry.id)}
            disabled={creditingBusy || cantCredit}
            className={cn('h-8 px-4 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', creditBtnClass)}
          >
            {creditingBusy
              ? 'Crediting…'
              : entry.status === 'vacant'
              ? 'Cannot credit'
              : 'Credit now'}
          </button>
        </div>
      ) : (
        <div className="mt-2 text-right">
          <span className="text-xs text-muted-foreground">Ignored — no action will be taken</span>
        </div>
      )}
    </div>
  );
}
