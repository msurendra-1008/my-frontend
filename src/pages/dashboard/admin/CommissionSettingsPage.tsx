import { useState, useEffect } from 'react';
import { Menu, Trash2, Pencil } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ProductCommissionModal } from '@/components/commissions/ProductCommissionModal';
import { commissionService } from '@/services/commissionService';
import type { CommissionSettings, ProductCommissionRule } from '@/types/commission.types';
import { cn } from '@utils/cn';

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

const SEGMENT_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500',
  'bg-amber-500',  'bg-red-500',  'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
];

export function CommissionSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  // ── Settings state ──────────────────────────────────────────────────────────
  const [settings,         setSettings]         = useState<CommissionSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CommissionSettings | null>(null);
  const [settingsLoad,     setSettingsLoad]     = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);

  const [direction,        setDirection]        = useState<'top_heavy' | 'bottom_heavy'>('top_heavy');
  const [levels,           setLevels]           = useState(5);
  const [levelPercentages, setLevelPercentages] = useState<number[]>(Array(5).fill(0));
  const [networkPct,       setNetworkPct]       = useState('7.00');
  const [teamPct,          setTeamPct]          = useState('3.00');
  const [leftLegPct,       setLeftLegPct]       = useState('40.00');
  const [middleLegPct,     setMiddleLegPct]     = useState('30.00');
  const [rightLegPct,      setRightLegPct]      = useState('30.00');

  // ── Product rules state ─────────────────────────────────────────────────────
  const [rules,     setRules]     = useState<ProductCommissionRule[]>([]);
  const [rulesLoad, setRulesLoad] = useState(true);
  const [modalRule, setModalRule] = useState<ProductCommissionRule | null | undefined>(undefined);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    commissionService.getSettings()
      .then((r) => {
        const s = r.data;
        setSettings(s);
        setOriginalSettings(s);
        setDirection(s.direction);
        setLevels(s.max_upline_levels);
        setLevelPercentages(s.level_percentages.slice(0, s.max_upline_levels));
        setNetworkPct(s.network_commission_pct);
        setTeamPct(s.team_commission_pct);
        setLeftLegPct(s.left_leg_pct);
        setMiddleLegPct(s.middle_leg_pct);
        setRightLegPct(s.right_leg_pct);
      })
      .catch(() => toast.show('Failed to load settings', true))
      .finally(() => setSettingsLoad(false));

    commissionService.getProductRules()
      .then((r) => setRules(r.data.results ?? []))
      .catch(() => toast.show('Failed to load product rules', true))
      .finally(() => setRulesLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep levelPercentages length in sync with levels
  useEffect(() => {
    setLevelPercentages((prev) => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const r = await commissionService.updateSettings({
        direction,
        max_upline_levels:      levels,
        level_percentages:      levelPercentages,
        network_commission_pct: networkPct,
        team_commission_pct:    teamPct,
        left_leg_pct:           leftLegPct,
        middle_leg_pct:         middleLegPct,
        right_leg_pct:          rightLegPct,
      });
      setSettings(r.data);
      setOriginalSettings(r.data);
      setIsEditing(false);
      toast.show('Settings saved');
    } catch {
      toast.show('Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!originalSettings) return;
    setDirection(originalSettings.direction);
    setLevels(originalSettings.max_upline_levels);
    setLevelPercentages(originalSettings.level_percentages.slice(0, originalSettings.max_upline_levels));
    setNetworkPct(originalSettings.network_commission_pct);
    setTeamPct(originalSettings.team_commission_pct);
    setLeftLegPct(originalSettings.left_leg_pct);
    setMiddleLegPct(originalSettings.middle_leg_pct);
    setRightLegPct(originalSettings.right_leg_pct);
    setIsEditing(false);
  };

  // ── Product rule handlers ───────────────────────────────────────────────────
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

  // ── Distribution bar helpers ────────────────────────────────────────────────
  const pctSum   = levelPercentages.reduce((a, b) => a + b, 0);
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
            <div className="border-b px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Global Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applied to all products unless overridden
                </p>
              </div>
              {!settingsLoad && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Pencil size={14} />
                  Edit settings
                </button>
              )}
            </div>

            {settingsLoad ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-5">

                {/* Direction */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Direction</label>
                  <div className={cn('flex gap-2', !isEditing && 'pointer-events-none')}>
                    <button
                      type="button"
                      onClick={() => setDirection('top_heavy')}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        direction === 'top_heavy'
                          ? 'border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      ↑ L1 gets most (top-heavy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('bottom_heavy')}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        direction === 'bottom_heavy'
                          ? 'border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}
                    >
                      ↓ L7 gets most (bottom-heavy)
                    </button>
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
                    readOnly={!isEditing}
                    className={cn(
                      'w-24 rounded-lg border px-3 py-2 text-sm',
                      isEditing
                        ? 'bg-background focus:outline-none focus:ring-2 focus:ring-purple-400'
                        : 'bg-transparent border-transparent font-semibold cursor-default',
                    )}
                  />
                </div>

                {/* Network + Team commission % */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-0.5">
                      Network commission (%)
                    </label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Sent UP the chain to upline members
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={networkPct}
                        onChange={(e) => setNetworkPct(e.target.value)}
                        placeholder="e.g. 7"
                        readOnly={!isEditing}
                        className={cn(
                          'w-24 h-9 rounded-lg border px-3 text-sm',
                          isEditing
                            ? 'bg-background focus:outline-none focus:ring-2 focus:ring-purple-400'
                            : 'bg-transparent border-transparent font-semibold cursor-default',
                        )}
                      />
                      <span className="text-sm text-muted-foreground">% of amount received</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-0.5">
                      Team commission (%)
                    </label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Sent DOWN to buyer's direct 3 legs
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={teamPct}
                        onChange={(e) => setTeamPct(e.target.value)}
                        placeholder="e.g. 3"
                        readOnly={!isEditing}
                        className={cn(
                          'w-24 h-9 rounded-lg border px-3 text-sm',
                          isEditing
                            ? 'bg-background focus:outline-none focus:ring-2 focus:ring-purple-400'
                            : 'bg-transparent border-transparent font-semibold cursor-default',
                        )}
                      />
                      <span className="text-sm text-muted-foreground">% of amount received</span>
                    </div>
                  </div>
                </div>

                {/* Level percentages + ₹ preview */}
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
                          readOnly={!isEditing}
                          className={cn(
                            'w-24 rounded-lg border px-3 py-1.5 text-sm',
                            isEditing
                              ? 'bg-background focus:outline-none focus:ring-2 focus:ring-purple-400'
                              : 'bg-transparent border-transparent font-semibold cursor-default',
                          )}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <span className="text-xs text-muted-foreground">
                          ₹{((Number(networkPct) * (levelPercentages[i] ?? 0)) / 100).toFixed(2)} per ₹100
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Distribution preview bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Distribution preview</span>
                      <span className={cn(
                        'text-xs font-semibold',
                        overLimit ? 'text-red-600 dark:text-red-400' : 'text-foreground',
                      )}>
                        Total: {pctSum.toFixed(1)}%
                        {overLimit && ' ⚠ Exceeds 100%'}
                      </span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-muted/50 overflow-hidden flex">
                      {levelPercentages.map((pct, i) => {
                        const width = Math.min(100, pct);
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      {levelPercentages.map((pct, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <span className={cn('h-2 w-2 rounded-full', SEGMENT_COLORS[i % SEGMENT_COLORS.length])} />
                          <span className="text-[10px] text-muted-foreground">L{i + 1}: {pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Team Commission Split */}
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">Team Commission Split</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    How to split team commission among 3 direct legs
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { label: 'Left',   value: leftLegPct,   setValue: setLeftLegPct },
                      { label: 'Middle', value: middleLegPct, setValue: setMiddleLegPct },
                      { label: 'Right',  value: rightLegPct,  setValue: setRightLegPct },
                    ] as const).map(({ label, value, setValue }) => (
                      <div key={label} className="rounded-xl border border-border/60 p-4 text-center">
                        <p className="text-xs font-medium text-muted-foreground mb-3">{label}</p>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          readOnly={!isEditing}
                          className={cn(
                            'w-full text-center text-2xl font-bold text-purple-600 dark:text-purple-400 border-none bg-transparent focus:outline-none',
                            !isEditing && 'pointer-events-none cursor-default',
                          )}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">% of team pool</p>
                        <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                          ₹{((Number(teamPct) * Number(value)) / 100).toFixed(2)} per ₹100
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 Vacant legs receive no commission. Remaining % stays with company.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="h-9 rounded-lg bg-purple-600 px-5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
                      >
                        {saving ? 'Saving…' : 'Save Settings'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 h-9 rounded-lg border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil size={14} />
                        Edit settings
                      </button>
                      {settings?.updated_at && (
                        <span className="text-xs text-muted-foreground">
                          Last updated:{' '}
                          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
                            new Date(settings.updated_at),
                          )}
                        </span>
                      )}
                    </>
                  )}
                </div>
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
                No product-specific rules. Click "+ Add Product Rule" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {['Product', 'Direction', 'Levels', 'Total %', 'Enabled', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => {
                      const total = rule.level_percentages.reduce((a, b) => a + b, 0);
                      const dirLabel = rule.direction === 'top_heavy' ? '↑ Top-heavy' : '↓ Bottom-heavy';
                      return (
                        <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{rule.product_name}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{dirLabel}</td>
                          <td className="px-4 py-3 text-muted-foreground">{rule.max_upline_levels}</td>
                          <td className="px-4 py-3 text-muted-foreground">{total.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                              rule.is_active
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-muted/50 text-muted-foreground',
                            )}>
                              {rule.is_active ? 'Yes' : 'No'}
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
