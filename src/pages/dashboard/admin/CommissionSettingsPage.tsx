import { useState, useEffect } from 'react';
import { Menu, Trash2, Pencil } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ProductCommissionModal } from '@/components/commissions/ProductCommissionModal';
import { commissionService } from '@/services/commissionService';
import type { CommissionSettings, ProductCommissionRule } from '@/types/commission.types';
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

// Pastel-safe segment colors
const SEGMENT_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500',
  'bg-amber-500', 'bg-red-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

// ── CommissionSettingsPage ────────────────────────────────────────────────────

export function CommissionSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  // --- Global Settings state ---
  const [settings,     setSettings]     = useState<CommissionSettings | null>(null);
  const [settingsLoad, setSettingsLoad] = useState(true);
  const [saving,       setSaving]       = useState(false);

  // Editable fields
  const [isEnabled,        setIsEnabled]        = useState(false);
  const [direction,        setDirection]        = useState<'upline' | 'downline'>('upline');
  const [levels,           setLevels]           = useState(5);
  const [levelPercentages, setLevelPercentages] = useState<number[]>(Array(5).fill(0));

  // --- Product Rules state ---
  const [rules,       setRules]       = useState<ProductCommissionRule[]>([]);
  const [rulesLoad,   setRulesLoad]   = useState(true);
  const [modalRule,   setModalRule]   = useState<ProductCommissionRule | null | undefined>(undefined);
  // undefined = modal closed, null = create mode, ProductCommissionRule = edit mode

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    commissionService.getSettings()
      .then((r) => {
        const s = r.data;
        setSettings(s);
        setIsEnabled(s.is_enabled);
        setDirection(s.direction);
        setLevels(s.levels);
        setLevelPercentages(s.level_percentages.slice(0, s.levels));
      })
      .catch(() => toast.show('Failed to load settings', true))
      .finally(() => setSettingsLoad(false));

    commissionService.getProductRules()
      .then((r) => setRules(r.data.results ?? []))
      .catch(() => toast.show('Failed to load product rules', true))
      .finally(() => setRulesLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync levelPercentages length when levels changes
  useEffect(() => {
    setLevelPercentages((prev) => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  // ── Save Settings ───────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const r = await commissionService.updateSettings({
        is_enabled:        isEnabled,
        direction,
        levels,
        level_percentages: levelPercentages,
      });
      setSettings(r.data);
      toast.show('Settings saved');
    } catch {
      toast.show('Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  // ── Product Rule handlers ───────────────────────────────────────────────────
  const handleRuleSaved = (saved: ProductCommissionRule) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setModalRule(undefined);
    toast.show('Rule saved');
  };

  const handleDeleteRule = async (rule: ProductCommissionRule) => {
    if (!window.confirm(`Delete rule for "${rule.product_name}"?`)) return;
    try {
      await commissionService.deleteProductRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.show('Rule deleted');
    } catch {
      toast.show('Failed to delete rule', true);
    }
  };

  // ── Percentage bar preview ──────────────────────────────────────────────────
  const pctSum = levelPercentages.reduce((a, b) => a + b, 0);
  const overLimit = pctSum > 100;

  const handlePctChange = (idx: number, val: string) => {
    const n = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setLevelPercentages((prev) => {
      const next = [...prev];
      next[idx] = n;
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-[52px] items-center gap-3 border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1.5 hover:bg-muted">
            <Menu size={18} />
          </button>
          <span className="font-semibold">Commission Settings</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-foreground">Commission Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure global commission rules and per-product overrides
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

          {/* ── Section A: Global Settings ──────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold text-foreground">Global Settings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applied to all products unless overridden
              </p>
            </div>

            {settingsLoad ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Commission System</p>
                    <p className="text-xs text-muted-foreground">Enable or disable commission distribution globally</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEnabled((v) => !v)}
                    className={cn(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      isEnabled ? 'bg-green-500' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      isEnabled ? 'translate-x-6' : 'translate-x-1',
                    )} />
                  </button>
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Direction</label>
                  <div className="flex gap-2">
                    {(['upline', 'downline'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDirection(d)}
                        className={cn(
                          'rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors',
                          direction === d
                            ? 'border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Levels */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Levels (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={levels}
                    onChange={(e) => setLevels(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-24 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Level percentages */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Level Percentages
                  </label>
                  <div className="space-y-2">
                    {Array.from({ length: levels }, (_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-32 text-xs text-muted-foreground">
                          {i === 0 ? 'Level 1 (direct)' : `Level ${i + 1}`}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={levelPercentages[i] ?? 0}
                          onChange={(e) => handlePctChange(i, e.target.value)}
                          className="w-24 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    ))}
                  </div>

                  {/* Live preview bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Distribution preview</span>
                      <span className={cn(
                        'text-xs font-semibold',
                        overLimit
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground',
                      )}>
                        Total: {pctSum.toFixed(1)}%
                        {overLimit && ' ⚠ Exceeds 100%'}
                      </span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-muted/50 overflow-hidden flex">
                      {levelPercentages.map((pct, i) => {
                        const width = Math.min(100, (pct / 100) * 100);
                        if (width <= 0) return null;
                        return (
                          <div
                            key={i}
                            className={cn('h-full transition-all', SEGMENT_COLORS[i % SEGMENT_COLORS.length])}
                            style={{ width: `${width}%` }}
                            title={`Level ${i + 1}: ${pct}%`}
                          />
                        );
                      })}
                    </div>
                    {overLimit && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Warning: total exceeds 100%. This may cause issues with commission distribution.
                      </p>
                    )}
                    {/* Legend */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {levelPercentages.map((pct, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className={cn('h-2 w-2 rounded-full', SEGMENT_COLORS[i % SEGMENT_COLORS.length])} />
                          <span className="text-[10px] text-muted-foreground">
                            L{i + 1}: {pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Last updated */}
                {settings?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Last updated:{' '}
                    {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
                      new Date(settings.updated_at),
                    )}
                  </p>
                )}

                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>

          {/* ── Section B: Product Rules ────────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Product-specific Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Override commission settings per product
                </p>
              </div>
              <button
                onClick={() => setModalRule(null)}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                + Add Product Rule
              </button>
            </div>

            {rulesLoad ? (
              <div className="p-6 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No product-specific rules. Click "Add Product Rule" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {['Product', 'Direction', 'Levels', 'Total %', 'Enabled', 'Actions'].map((h) => (
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
                    {rules.map((rule) => {
                      const total = rule.level_percentages.reduce((a, b) => a + b, 0);
                      return (
                        <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{rule.product_name}</td>
                          <td className="px-4 py-3 capitalize text-muted-foreground">{rule.direction}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rule.levels}</td>
                          <td className="px-4 py-3 text-muted-foreground">{total.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                              rule.is_enabled
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-muted/50 text-muted-foreground',
                            )}>
                              {rule.is_enabled ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setModalRule(rule)}
                                className="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule)}
                                className="rounded-md p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal */}
      {modalRule !== undefined && (
        <ProductCommissionModal
          rule={modalRule}
          onSave={handleRuleSaved}
          onClose={() => setModalRule(undefined)}
        />
      )}
    </div>
  );
}
