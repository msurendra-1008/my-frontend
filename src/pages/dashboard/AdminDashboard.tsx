import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { dashboardService } from '@/services/dashboardService';
import { cn } from '@/utils/cn';
import type { DashboardStats, ProductAlert } from '@/types/dashboard.types';

// ── Types ─────────────────────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',  label: 'Today'  },
  { key: 'week',   label: 'Week'   },
  { key: 'month',  label: 'Month'  },
  { key: 'year',   label: 'Year'   },
  { key: 'custom', label: 'Custom' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function ChangeTag({ value }: { value: number | null }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={cn('text-[11px] font-medium', up ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
      {up ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

// ── Revenue bar chart ─────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  if (data.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No data</p>;
  return (
    <div>
      <div className="flex items-end gap-0.5 h-28">
        {data.map((d, i) => (
          <div key={i} className="flex-1 group relative" style={{ minWidth: '3px' }}>
            <div
              className={cn('w-full rounded-t transition-opacity', i === data.length - 1 ? 'bg-primary' : 'bg-primary/60 hover:bg-primary/80')}
              style={{ height: `${Math.max((d.revenue / max) * 100, 2)}%` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {d.date}: {fmt(d.revenue)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ breakdown }: { breakdown: Record<string, number> }) {
  const STATUS_COLORS: Record<string, string> = {
    confirmed:  '#534AB7',
    delivered:  '#16A34A',
    shipped:    '#D97706',
    cancelled:  '#E24B4A',
    pending:    '#6B7280',
    packed:     '#0284C7',
  };
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total   = entries.reduce((s, [, v]) => s + v, 0) || 1;
  const radius  = 30;
  const circ    = 2 * Math.PI * radius;
  let offset    = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0">
        {entries.map(([key, val]) => {
          const pct  = val / total;
          const dash = pct * circ;
          const gap  = circ - dash;
          const el   = (
            <circle
              key={key}
              cx="40" cy="40" r={radius}
              fill="none"
              stroke={STATUS_COLORS[key] || '#9CA3AF'}
              strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 40 40)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
          {total}
        </text>
      </svg>
      <div className="flex-1 space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[key] || '#9CA3AF' }} />
            <span className="flex-1 capitalize text-muted-foreground">{key}</span>
            <span className="font-semibold">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alert config ──────────────────────────────────────────────────────────────
const ALERT_CONFIG: Record<ProductAlert['type'], { label: string; bg: string; badge: string; icon: string }> = {
  low_stock:    { label: 'Low stock',    bg: 'bg-red-500/10',   badge: 'bg-red-500/10 text-red-700 dark:text-red-400',     icon: '📦' },
  out_of_stock: { label: 'Out of stock', bg: 'bg-red-500/10',   badge: 'bg-red-500/10 text-red-700 dark:text-red-400',     icon: '📦' },
  no_pricing:   { label: 'No pricing',   bg: 'bg-amber-500/10', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', icon: '💰' },
  no_rule:      { label: 'No rule',      bg: 'bg-amber-500/10', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', icon: '%'  },
};

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebar, setSidebar]   = useState(false);
  const [period, setPeriod]     = useState<Period>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: { period?: string; date_from?: string; date_to?: string } = { period };
      if (period === 'custom' && dateFrom && dateTo) {
        params.date_from = dateFrom;
        params.date_to   = dateTo;
      }
      const res = await dashboardService.getStats(params);
      setStats(res.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebar} onMobileToggle={() => setSidebar(v => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 bg-card px-4 py-3 flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground hidden md:block">Dashboard</h1>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  period === p.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </header>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 bg-muted/20 flex-shrink-0">
            <span className="text-xs text-muted-foreground">Date range:</span>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={load}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !stats ? (
            <div className="py-20 text-center text-muted-foreground">Failed to load dashboard data.</div>
          ) : (
            <div className="space-y-5">

              {/* STAT ROW 1 */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'Total orders',          value: stats.orders.total.toLocaleString('en-IN'),  change: stats.orders.total_change,   sub: 'orders placed',         color: 'text-foreground' },
                  { label: 'Revenue',                value: fmt(stats.orders.revenue),                  change: stats.orders.revenue_change, sub: 'gross collected',       color: 'text-primary' },
                  { label: 'Active UPA users',       value: stats.upa.active.toLocaleString('en-IN'),   change: null,                        sub: `+${stats.upa.new} new`, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Pending commissions',    value: fmt(stats.commissions.pending_amount),      change: null,                        sub: `${stats.commissions.pending_count} entries`, color: 'text-amber-600 dark:text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
                    <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ChangeTag value={s.change} />
                      <span className="text-[11px] text-muted-foreground">{s.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* STAT ROW 2 */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  { label: 'UPA orders',        value: stats.orders.upa_count.toLocaleString('en-IN'), sub: fmt(stats.orders.upa_revenue),      color: 'text-primary' },
                  { label: 'Regular orders',    value: stats.orders.regular_count.toLocaleString('en-IN'), sub: fmt(stats.orders.regular_revenue), color: 'text-foreground' },
                  { label: 'Company balance',   value: fmt(stats.wallet.balance),    sub: 'net wallet',          color: 'text-green-600 dark:text-green-400' },
                  { label: 'GST collected',     value: fmt(stats.wallet.gst_pending), sub: 'total collected',    color: 'text-blue-600 dark:text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
                    <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* REVENUE CHART + ORDER STATUS */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="md:col-span-2 rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Revenue trend</p>
                    <span className="text-xs text-muted-foreground">{stats.period.start} → {stats.period.end}</span>
                  </div>
                  <RevenueChart data={stats.daily_revenue} />
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">Order status</p>
                  <DonutChart breakdown={stats.orders.status_breakdown} />
                </div>
              </div>

              {/* UPA NETWORK + COMMISSION */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* UPA Network */}
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">UPA network</p>
                    <button onClick={() => navigate('/admin/upa-users')} className="text-xs text-primary hover:underline">View all →</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Active',     value: stats.upa.active,     color: 'text-green-600 dark:text-green-400' },
                      { label: 'Standalone', value: stats.upa.standalone, color: 'text-amber-600 dark:text-amber-400' },
                      { label: 'Inactive',   value: stats.upa.inactive,   color: 'text-red-500' },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-muted/40 p-3 text-center">
                        <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Monthly registrations</p>
                  <div className="flex items-end gap-0.5 h-16">
                    {stats.upa.monthly.map((m, i) => {
                      const maxM = Math.max(...stats.upa.monthly.map(x => x.count), 1);
                      return (
                        <div key={i} className="flex-1 group relative" title={`${m.month}: ${m.count}`}>
                          <div
                            className={cn('w-full rounded-t', i === stats.upa.monthly.length - 1 ? 'bg-green-500' : 'bg-green-500/50')}
                            style={{ height: `${Math.max((m.count / maxM) * 100, 4)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{stats.upa.monthly[0]?.month}</span>
                    <span>{stats.upa.monthly[stats.upa.monthly.length - 1]?.month}</span>
                  </div>
                </div>

                {/* Commission overview */}
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-foreground">Commission overview</p>
                    <button onClick={() => navigate('/admin/commissions/pending')} className="text-xs text-primary hover:underline">View pending →</button>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Distributed</span>
                    <span className="font-bold text-primary">{fmt(stats.commissions.distributed)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{fmt(stats.commissions.pending_amount)}</span>
                  </div>

                  {/* Distribution bar */}
                  {(() => {
                    const b     = stats.commissions.breakdown;
                    const total = Object.values(b).reduce((s, v) => s + v, 0) || 1;
                    const COMM_COLORS: Record<string, string> = {
                      network: '#534AB7', team: '#16A34A', social: '#D97706', company: '#6B7280', self: '#A855F7',
                    };
                    return (
                      <>
                        <div className="flex h-2 rounded-full overflow-hidden mb-2">
                          {Object.entries(b).map(([key, val]) => (
                            <div key={key} style={{ flex: val / total, background: COMM_COLORS[key] || '#9CA3AF' }} />
                          ))}
                        </div>
                        <div className="flex gap-x-3 gap-y-1 flex-wrap">
                          {Object.entries(b).map(([key, val]) => (
                            <span key={key} className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: COMM_COLORS[key] || '#9CA3AF' }} />
                              {key} {fmt(val)}
                            </span>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="rounded-lg bg-red-500/10 p-3 text-center">
                      <p className="text-xl font-bold text-red-500">{stats.commissions.inactive_count}</p>
                      <p className="text-[10px] text-red-700 dark:text-red-400">Inactive users</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.commissions.vacant_count}</p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400">Vacant legs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRODUCT ALERTS + TOP PRODUCTS */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                {/* Product alerts */}
                <div className="rounded-xl border border-border/50 bg-card">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground">⚠ Product alerts</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-red-500/10 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                        {stats.products.alerts.length} issues
                      </span>
                      <button onClick={() => navigate('/admin/products')} className="text-xs text-primary hover:underline">View all →</button>
                    </div>
                  </div>
                  <div className="px-4 py-2">
                    {stats.products.alerts.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">✅ No product alerts</p>
                    ) : (
                      stats.products.alerts.slice(0, 6).map((alert: ProductAlert) => {
                        const cfg = ALERT_CONFIG[alert.type];
                        return (
                          <div key={alert.id} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0', cfg.bg)}>
                              {cfg.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{alert.name}</p>
                              {alert.stock !== undefined && (
                                <p className="text-[11px] text-muted-foreground">Stock: {alert.stock} units</p>
                              )}
                            </div>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', cfg.badge)}>
                              {cfg.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top products + mini cards */}
                <div className="space-y-4">

                  {/* Top products */}
                  <div className="rounded-xl border border-border/50 bg-card">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                      <p className="text-sm font-semibold text-foreground">Top products</p>
                      <span className="text-[11px] text-muted-foreground">by orders</span>
                    </div>
                    <div className="px-4 py-2">
                      {stats.top_products.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No data yet</p>
                      ) : (
                        stats.top_products.map((p, i) => (
                          <div key={p.product_name} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                            <span className={cn(
                              'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                              i === 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                : i === 1 ? 'bg-muted/50 text-muted-foreground'
                                : i === 2 ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
                                : 'bg-muted text-muted-foreground'
                            )}>
                              {i + 1}
                            </span>
                            <span className="flex-1 text-xs font-medium text-foreground truncate">{p.product_name}</span>
                            <span className="text-[11px] text-muted-foreground">{p.order_count} orders</span>
                            <span className="text-xs font-semibold text-primary">{fmt(p.revenue)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Employees + Wallet mini */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl border border-border/50 bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate('/admin/employees')}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Employees</p>
                      <p className="text-2xl font-bold text-foreground">{stats.employees.total}</p>
                      <p className="text-xs text-primary mt-1">View all →</p>
                    </div>
                    <div
                      className="rounded-xl border border-border/50 bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate('/admin/company-wallet')}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Wallet</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{fmt(stats.wallet.balance)}</p>
                      <p className="text-xs text-primary mt-1">View ledger →</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ORDERS */}
              <div className="rounded-xl border border-border/50 bg-card">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground">Recent orders</p>
                  <button onClick={() => navigate('/admin/orders')} className="text-xs text-primary hover:underline">View all →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Order</th>
                        <th className="text-left px-4 py-2.5 font-medium">Customer</th>
                        <th className="text-left px-4 py-2.5 font-medium">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                        <th className="text-left px-4 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {stats.recent_orders.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No orders yet</td></tr>
                      ) : stats.recent_orders.map(o => (
                        <tr
                          key={o.id}
                          className="hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate('/admin/orders')}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground">{o.order_number}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{o.customer || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium',
                              o.order_type === 'upa' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                            )}>
                              {o.order_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-primary">{fmt(o.total)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-medium capitalize',
                              o.status === 'delivered'  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                : o.status === 'cancelled' ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                                : o.status === 'shipped'   ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                            )}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
