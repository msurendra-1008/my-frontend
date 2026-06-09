import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { companyWalletService } from '@/services/companyWalletService';
import type {
  CompanyWallet,
  CompanyTransaction,
  GSTLedgerEntry,
  CompanyWalletStats,
  TxType,
} from '@/types/companyWallet.types';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (v: string | number) =>
  '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TX_LABELS: Record<TxType, string> = {
  order_received:  'Order Received',
  commission_paid: 'Commission Paid',
  refund_paid:     'Refund Paid',
  gst_collected:   'GST Collected',
  gst_paid:        'GST Paid',
  manual_credit:   'Manual Credit',
  manual_debit:    'Manual Debit',
};

const TX_COLORS: Record<TxType, string> = {
  order_received:  'text-green-600 dark:text-green-400',
  commission_paid: 'text-red-600 dark:text-red-400',
  refund_paid:     'text-red-600 dark:text-red-400',
  gst_collected:   'text-blue-600 dark:text-blue-400',
  gst_paid:        'text-orange-600 dark:text-orange-400',
  manual_credit:   'text-green-600 dark:text-green-400',
  manual_debit:    'text-red-600 dark:text-red-400',
};

const TX_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'order_received',  label: 'Order Received' },
  { value: 'commission_paid', label: 'Commission Paid' },
  { value: 'refund_paid',     label: 'Refund Paid' },
  { value: 'manual_credit',   label: 'Manual Credit' },
  { value: 'manual_debit',    label: 'Manual Debit' },
];

const GST_FILTER_OPTIONS = [
  { value: '',          label: 'All' },
  { value: 'collected', label: 'Collected' },
  { value: 'paid',      label: 'Paid' },
];

/* ── component ───────────────────────────────────────────────────────────── */
export default function CompanyWalletPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'ledger' | 'gst'>('overview');

  const [wallet, setWallet]   = useState<CompanyWallet | null>(null);
  const [stats, setStats]     = useState<CompanyWalletStats | null>(null);
  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [txCount, setTxCount]           = useState(0);
  const [txPage, setTxPage]             = useState(1);
  const [txFilter, setTxFilter]         = useState('');

  const [gstEntries, setGstEntries] = useState<GSTLedgerEntry[]>([]);
  const [gstCount, setGstCount]     = useState(0);
  const [gstPage, setGstPage]       = useState(1);
  const [gstFilter, setGstFilter]   = useState('');

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Manual entry form
  const [showManual, setShowManual]   = useState(false);
  const [manualType, setManualType]   = useState<'manual_credit' | 'manual_debit'>('manual_credit');
  const [manualAmt, setManualAmt]     = useState('');
  const [manualDesc, setManualDesc]   = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError]   = useState('');

  const PAGE_SIZE = 30;

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [wRes, sRes] = await Promise.all([
        companyWalletService.getOverview(),
        companyWalletService.getStats(),
      ]);
      setWallet(wRes.data);
      setStats(sRes.data);
    } catch {
      setError('Failed to load wallet data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 1, type = '') => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (type) params.type = type;
    try {
      const res = await companyWalletService.getTransactions(params);
      setTransactions(res.data.results ?? []);
      setTxCount(res.data.count);
    } catch {
      setError('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGST = useCallback(async (page = 1, type = '') => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = { page: String(page), page_size: String(PAGE_SIZE) };
    if (type) params.type = type;
    try {
      const res = await companyWalletService.getGSTLedger(params);
      setGstEntries(res.data.results ?? []);
      setGstCount(res.data.count);
    } catch {
      setError('Failed to load GST ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (tab === 'ledger') loadTransactions(txPage, txFilter);
  }, [tab, txPage, txFilter, loadTransactions]);

  useEffect(() => {
    if (tab === 'gst') loadGST(gstPage, gstFilter);
  }, [tab, gstPage, gstFilter, loadGST]);

  const handleManualSubmit = async () => {
    if (!manualAmt || isNaN(Number(manualAmt)) || Number(manualAmt) <= 0) {
      setManualError('Enter a valid amount.');
      return;
    }
    if (!manualDesc.trim()) {
      setManualError('Description is required.');
      return;
    }
    setManualSaving(true);
    setManualError('');
    try {
      const res = await companyWalletService.recordManualEntry({
        tx_type:     manualType,
        amount:      manualAmt,
        description: manualDesc,
      });
      setWallet(res.data);
      setManualAmt('');
      setManualDesc('');
      setShowManual(false);
      loadOverview();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setManualError(err?.response?.data?.detail || 'Failed to record entry.');
    } finally {
      setManualSaving(false);
    }
  };

  const txPages = Math.ceil(txCount / PAGE_SIZE);
  const gstPages = Math.ceil(gstCount / PAGE_SIZE);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 px-4 py-3 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Company Wallet</h1>
            <p className="text-xs text-muted-foreground">Track income, commissions, refunds and GST</p>
          </div>
          <button
            onClick={() => setShowManual(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Manual Entry
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-5 border-b border-border/50">
            {(['overview', 'ledger', 'gst'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'gst' ? 'GST Ledger' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Balance card */}
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-4xl font-bold text-foreground">
                  {wallet ? fmt(wallet.balance) : '—'}
                </p>
                {wallet && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated {new Date(wallet.updated_at).toLocaleString('en-IN')}
                  </p>
                )}
              </div>

              {/* Stats grid */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total In',      value: stats.total_in,      color: 'text-green-600 dark:text-green-400' },
                    { label: 'Total Out',     value: stats.total_out,     color: 'text-red-600 dark:text-red-400' },
                    { label: 'Transactions',  value: stats.tx_count,      color: 'text-foreground', isCnt: true },
                    { label: 'GST Collected', value: stats.gst_collected, color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'GST Paid',      value: stats.gst_paid,      color: 'text-orange-600 dark:text-orange-400' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-xl font-semibold ${s.color}`}>
                        {s.isCnt ? s.value : fmt(s.value as string)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent transactions */}
              <div>
                <h2 className="text-sm font-medium text-foreground mb-3">Recent Transactions</h2>
                <RecentTxList />
              </div>
            </div>
          )}

          {/* ── LEDGER TAB ── */}
          {tab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={txFilter}
                  onChange={e => { setTxFilter(e.target.value); setTxPage(1); }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {TX_FILTER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">{txCount} entries</span>
              </div>

              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Date', 'Type', 'Description', 'Order', 'Amount', 'Balance After'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
                    ) : transactions.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No transactions found.</td></tr>
                    ) : transactions.map(tx => (
                      <tr key={tx.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${TX_COLORS[tx.transaction_type]}`}>
                            {TX_LABELS[tx.transaction_type]}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-foreground max-w-[200px] truncate">
                          {tx.description || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {tx.order_number || '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-xs font-semibold ${Number(tx.amount) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {Number(tx.amount) >= 0 ? '+' : ''}{fmt(tx.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-foreground font-medium">
                          {fmt(tx.balance_after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {txPages > 1 && <Pagination page={txPage} total={txPages} onPage={setTxPage} />}
            </div>
          )}

          {/* ── GST LEDGER TAB ── */}
          {tab === 'gst' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={gstFilter}
                  onChange={e => { setGstFilter(e.target.value); setGstPage(1); }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  {GST_FILTER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">{gstCount} entries</span>
              </div>

              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Date', 'Type', 'Description', 'Order / Ref', 'Amount'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
                    ) : gstEntries.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No GST entries found.</td></tr>
                    ) : gstEntries.map(g => (
                      <tr key={g.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(g.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium ${g.gst_type === 'collected' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {g.gst_type === 'collected' ? 'Collected' : 'Paid'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-foreground max-w-[200px] truncate">
                          {g.description || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {g.order_number || g.reference || '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-xs font-semibold ${g.gst_type === 'collected' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {fmt(g.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {gstPages > 1 && <Pagination page={gstPage} total={gstPages} onPage={setGstPage} />}
            </div>
          )}
        </main>
      </div>

      {/* Manual Entry Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-6 shadow-xl">
            <h2 className="text-base font-semibold text-foreground mb-4">Manual Entry</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Type</label>
                <select
                  value={manualType}
                  onChange={e => setManualType(e.target.value as 'manual_credit' | 'manual_debit')}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="manual_credit">Manual Credit (+)</option>
                  <option value="manual_debit">Manual Debit (−)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={manualAmt}
                  onChange={e => setManualAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                <input
                  type="text"
                  value={manualDesc}
                  onChange={e => setManualDesc(e.target.value)}
                  placeholder="Reason for manual entry"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>

              {manualError && (
                <p className="text-xs text-red-600 dark:text-red-400">{manualError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowManual(false); setManualError(''); }}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={manualSaving}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {manualSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── sub-components ─────────────────────────────────────────────────────── */
function RecentTxList() {
  const [items, setItems] = useState<CompanyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyWalletService.getTransactions({ page: '1', page_size: '10' })
      .then(r => setItems(r.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No transactions yet.</p>;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {['Date', 'Type', 'Description', 'Amount'].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(tx => (
            <tr key={tx.id} className="border-t border-border/30 hover:bg-muted/20">
              <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                {new Date(tx.created_at).toLocaleDateString('en-IN')}
              </td>
              <td className={`px-4 py-2 text-xs font-medium ${TX_COLORS[tx.transaction_type]}`}>
                {TX_LABELS[tx.transaction_type]}
              </td>
              <td className="px-4 py-2 text-xs text-foreground max-w-[200px] truncate">
                {tx.description || '—'}
              </td>
              <td className={`px-4 py-2 text-xs font-semibold ${Number(tx.amount) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {Number(tx.amount) >= 0 ? '+' : ''}{fmt(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
      >
        Previous
      </button>
      <span className="text-xs text-muted-foreground">Page {page} of {total}</span>
      <button
        disabled={page === total}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
