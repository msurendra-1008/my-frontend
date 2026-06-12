import { useState, useEffect } from 'react';
import { Menu, Trash2, Pencil, Sun, Moon } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@components/ui/Badge';
import { useTheme } from '@context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { ProductCommissionModal } from '@/components/commissions/ProductCommissionModal';
import { commissionService } from '@/services/commissionService';
import type { CommissionSettings, ProductCommissionRule, CommissionDirection } from '@/types/commission.types';
import { cn } from '@utils/cn';

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

const LEVEL_COLORS = [
  '#3C3489','#534AB7','#6B63C9','#8078D4','#9A90DF',
  '#B3ABEA','#CCC7F2','#E0DCFA','#EEEDFE','#F5F4FF',
];

export function CommissionSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme }        = useTheme();
  const { user }                      = useAuthStore();
  const toast = useToast();

  const [settings,         setSettings]         = useState<CommissionSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CommissionSettings | null>(null);
  const [settingsLoad,     setSettingsLoad]     = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);

  // ── Editable fields ──────────────────────────────────────────────────────────
  const [networkPct,        setNetworkPct]        = useState('7.00');
  const [teamPct,           setTeamPct]           = useState('3.00');
  const [socialPct,         setSocialPct]         = useState('0.00');
  const [companyPct,        setCompanyPct]        = useState('0.00');
  const [selfEnabled,       setSelfEnabled]       = useState(false);
  const [selfPct,           setSelfPct]           = useState('0.00');
  const [deliveryPct,       setDeliveryPct]       = useState('0.00');
  const [direction,         setDirection]         = useState<CommissionDirection>('direct_first');
  const [levels,            setLevels]            = useState(7);
  const [levelPercentages,  setLevelPercentages]  = useState<number[]>([40,25,15,10,5,3,2]);
  const [leftLegPct,        setLeftLegPct]        = useState('40.00');
  const [middleLegPct,      setMiddleLegPct]      = useState('30.00');
  const [rightLegPct,       setRightLegPct]       = useState('30.00');
  const [triggerMode,       setTriggerMode]       = useState<'auto'|'manual'>('auto');

  const [rules,     setRules]     = useState<ProductCommissionRule[]>([]);
  const [rulesLoad, setRulesLoad] = useState(true);
  const [modalRule, setModalRule] = useState<ProductCommissionRule | null | undefined>(undefined);

  const fillFromSettings = (s: CommissionSettings) => {
    setNetworkPct(s.network_commission_pct);
    setTeamPct(s.team_commission_pct);
    setSocialPct(s.social_work_pct);
    setCompanyPct(s.company_pct);
    setSelfEnabled(s.self_commission_enabled);
    setSelfPct(s.self_commission_pct);
    setDeliveryPct(s.delivery_packaging_pct);
    setDirection(s.direction);
    setLevels(s.max_upline_levels);
    setLevelPercentages(s.level_percentages.slice(0, s.max_upline_levels));
    setLeftLegPct(s.left_leg_pct);
    setMiddleLegPct(s.middle_leg_pct);
    setRightLegPct(s.right_leg_pct);
    setTriggerMode(s.trigger_mode);
  };

  useEffect(() => {
    commissionService.getSettings()
      .then((r) => { setSettings(r.data); setOriginalSettings(r.data); fillFromSettings(r.data); })
      .catch(() => toast.show('Failed to load settings', true))
      .finally(() => setSettingsLoad(false));
    commissionService.getProductRules()
      .then((r) => setRules(r.data.results ?? []))
      .catch(() => toast.show('Failed to load product rules', true))
      .finally(() => setRulesLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLevelPercentages((prev) => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await commissionService.updateSettings({
        network_commission_pct:  networkPct,
        team_commission_pct:     teamPct,
        social_work_pct:         socialPct,
        company_pct:             companyPct,
        self_commission_enabled: selfEnabled,
        self_commission_pct:     selfPct,
        delivery_packaging_pct:  deliveryPct,
        direction,
        max_upline_levels:       levels,
        level_percentages:       levelPercentages,
        left_leg_pct:            leftLegPct,
        middle_leg_pct:          middleLegPct,
        right_leg_pct:           rightLegPct,
        trigger_mode:            triggerMode,
      });
      setSettings(r.data); setOriginalSettings(r.data);
      setIsEditing(false);
      toast.show('Settings saved');
    } catch {
      toast.show('Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (originalSettings) fillFromSettings(originalSettings);
    setIsEditing(false);
  };

  const handleRuleSaved = (saved: ProductCommissionRule) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
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
    } catch { toast.show('Failed to delete rule', true); }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const totalPoolPct = Number(networkPct) + Number(teamPct) + Number(socialPct) + Number(companyPct)
                     + (selfEnabled ? Number(selfPct) : 0) + Number(deliveryPct);
  const remaining    = 100 - totalPoolPct;

  const displayPercentages = direction === 'ancestor_first'
    ? [...levelPercentages].reverse()
    : levelPercentages;

  const PREVIEW_PROFIT = 100; // ₹100 for global settings preview

  const pools = [
    { key: 'network',  val: networkPct,  set: setNetworkPct,  title: '↑ Network',     desc: 'Goes UP the chain',    color: 'text-primary',                        bg: 'bg-primary/5 border-primary/20' },
    { key: 'team',     val: teamPct,     set: setTeamPct,     title: '↓ Team',        desc: 'Goes to direct legs',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/5 border-green-500/20' },
    { key: 'social',   val: socialPct,   set: setSocialPct,   title: '♥ Social Work', desc: 'Social fund',          color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/5 border-amber-500/20' },
    { key: 'company',  val: companyPct,  set: setCompanyPct,  title: '🏢 Company',    desc: 'Stays with company',   color: 'text-muted-foreground',               bg: 'bg-muted/40 border-border/50' },
    { key: 'delivery', val: deliveryPct, set: setDeliveryPct, title: '📦 Delivery',   desc: 'Delivery / packaging', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/20' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-md p-1.5 hover:bg-muted">
              <Menu size={18} />
            </button>
            <span className="text-base font-semibold text-foreground">Commission Settings</span>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-end">
            {!settingsLoad && (
              isEditing ? (
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving}
                    className="h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Settings'}
                  </button>
                  <button onClick={cancelEdit} disabled={saving}
                    className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 h-9 rounded-lg border px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <Pencil size={14} /> Edit settings
                </button>
              )
            )}
          </div>

          {toast.msg && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm font-medium',
              toast.msg.err
                ? 'bg-red-500/10 border border-red-400/40 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border border-green-400/40 text-green-600 dark:text-green-400'
            )}>
              {toast.msg.text}
            </div>
          )}

          {settingsLoad ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            <>
              {/* ── Two-column layout ──────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT COLUMN */}
                <div className="space-y-4">

                  {/* Card 1 — Commission Pools */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Commission Pools</p>
                      <p className="text-xs text-muted-foreground mt-0.5">% of UPA profit distributed per sale</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {pools.map(pool => (
                        <div key={pool.key} className={cn('rounded-xl border p-3', pool.bg)}>
                          <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-2', pool.color)}>
                            {pool.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={0} max={100} step="0.01"
                              value={pool.val}
                              onChange={e => pool.set(e.target.value)}
                              disabled={!isEditing}
                              className="w-24 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:border-transparent disabled:bg-transparent"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            <span className={cn('text-sm font-semibold', pool.color)}>
                              = ₹{(PREVIEW_PROFIT * Number(pool.val) / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{pool.desc}</p>
                        </div>
                      ))}

                      {/* Self Commission card — with toggle */}
                      <div className={cn('rounded-xl border p-3', selfEnabled
                        ? 'bg-purple-500/5 border-purple-500/20'
                        : 'bg-muted/30 border-border/40 opacity-70')}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                            ✦ Self Commission
                          </p>
                          <button
                            type="button"
                            onClick={() => isEditing && setSelfEnabled(v => !v)}
                            className={cn(
                              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                              selfEnabled ? 'bg-purple-600' : 'bg-muted-foreground/30',
                              !isEditing && 'cursor-default'
                            )}>
                            <span className={cn(
                              'inline-block h-3 w-3 rounded-full bg-white transition-transform',
                              selfEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                            )} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} max={100} step="0.01"
                            value={selfPct}
                            onChange={e => setSelfPct(e.target.value)}
                            disabled={!isEditing || !selfEnabled}
                            className="w-24 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:border-transparent disabled:bg-transparent disabled:opacity-50" />
                          <span className="text-sm text-muted-foreground">%</span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                            = ₹{(PREVIEW_PROFIT * (selfEnabled ? Number(selfPct) : 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Credited back to buyer</p>
                      </div>
                    </div>

                    {/* Remaining box */}
                    <div className="rounded-lg bg-muted/40 px-3 py-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining ({remaining.toFixed(1)}% of profit)</span>
                      <span className="font-semibold">Stays with company</span>
                    </div>

                    {/* Distribution bar */}
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.max(0, Number(networkPct))}%` }} className="bg-primary transition-all" />
                      <div style={{ width: `${Math.max(0, Number(teamPct))}%` }} className="bg-green-500 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(socialPct))}%` }} className="bg-amber-500 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(companyPct))}%` }} className="bg-gray-400 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(deliveryPct))}%` }} className="bg-blue-500 transition-all" />
                      <div style={{ width: `${Math.max(0, selfEnabled ? Number(selfPct) : 0)}%` }} className="bg-purple-500 transition-all" />
                      <div style={{ width: `${Math.max(0, remaining)}%` }} className="bg-muted transition-all" />
                    </div>
                  </div>

                  {/* Card 2 — Team leg split */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Team Leg Split</p>
                      <p className="text-xs text-muted-foreground mt-0.5">How to split team commission among 3 direct legs</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { label: 'Left',   val: leftLegPct,   set: setLeftLegPct },
                        { label: 'Middle', val: middleLegPct, set: setMiddleLegPct },
                        { label: 'Right',  val: rightLegPct,  set: setRightLegPct },
                      ] as const).map(({ label, val, set }) => (
                        <div key={label} className="rounded-xl border border-border/60 p-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
                          <input type="number" min={0} max={100} step="0.01"
                            value={val} onChange={e => set(e.target.value)}
                            disabled={!isEditing}
                            className="w-full text-center text-xl font-bold text-green-600 dark:text-green-400 border-none bg-transparent focus:outline-none disabled:opacity-70" />
                          <p className="text-[10px] text-muted-foreground mt-1">% of team pool</p>
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
                            ₹{(PREVIEW_PROFIT * Number(teamPct) / 100 * Number(val) / 100).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">💡 Vacant legs receive no commission. That amount stays with company.</p>
                  </div>

                  {/* Card 3 — Trigger mode */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="font-semibold text-foreground text-sm">Commission Trigger</p>
                    <div className="flex border border-border/60 rounded-lg overflow-hidden">
                      {(['auto', 'manual'] as const).map((mode) => (
                        <button key={mode} onClick={() => isEditing && setTriggerMode(mode)}
                          className={cn(
                            'flex-1 h-9 text-xs font-medium transition-colors',
                            mode === 'manual' && 'border-l border-border/60',
                            triggerMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                          )}>
                          {mode === 'auto' ? '⏱ Auto (after return window)' : '✋ Manual (admin triggers)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN — Network level split */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-foreground text-sm">Network Level Split</p>
                    <p className="text-xs text-muted-foreground mt-0.5">How network pool is split across upline levels</p>
                  </div>

                  {/* Direction toggle */}
                  <div className="flex border border-border/60 rounded-lg overflow-hidden">
                    <button onClick={() => isEditing && setDirection('direct_first')}
                      className={cn('flex-1 h-9 text-xs font-medium transition-colors',
                        direction === 'direct_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                      ↓ Direct parent gets most
                    </button>
                    <button onClick={() => isEditing && setDirection('ancestor_first')}
                      className={cn('flex-1 h-9 text-xs font-medium transition-colors border-l border-border/60',
                        direction === 'ancestor_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                      ↑ Top ancestor gets most
                    </button>
                  </div>

                  {/* Max levels */}
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">Max levels</label>
                    <input type="number" min={1} max={10}
                      value={levels}
                      onChange={e => setLevels(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      disabled={!isEditing}
                      className="w-24 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:border-transparent disabled:bg-transparent" />
                  </div>

                  {/* Level rows */}
                  <div className="space-y-0">
                    {Array.from({ length: levels }, (_, i) => {
                      const pct = displayPercentages[i] ?? 0;
                      const networkAmt = (PREVIEW_PROFIT * Number(networkPct) / 100 * pct / 100).toFixed(2);
                      return (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                          <span className="w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: LEVEL_COLORS[i] ?? '#aaa' }}>
                            L{i + 1}
                          </span>
                          <span className="flex-1 text-xs text-muted-foreground">
                            {i === 0 ? 'Direct parent' : `Level ${i + 1}`}
                          </span>
                          <input type="number" min={0} max={100} step="0.1"
                            value={pct}
                            disabled={!isEditing}
                            onChange={e => {
                              const newLevels = [...levelPercentages];
                              const idx = direction === 'ancestor_first' ? levels - 1 - i : i;
                              newLevels[idx] = Number(e.target.value);
                              setLevelPercentages(newLevels);
                            }}
                            className="w-20 h-7 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:border-transparent disabled:bg-transparent" />
                          <span className="text-xs text-muted-foreground">%</span>
                          <span className="text-xs font-semibold text-primary min-w-[50px] text-right">₹{networkAmt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {settings?.updated_at && (
                    <p className="text-[11px] text-muted-foreground pt-2">
                      Last updated: {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(settings.updated_at))}
                    </p>
                  )}

                  {/* Mobile edit buttons */}
                  <div className="lg:hidden flex gap-2 pt-2">
                    {isEditing ? (
                      <>
                        <button onClick={handleSave} disabled={saving}
                          className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit} className="flex-1 h-9 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 h-9 rounded-lg border px-4 text-sm font-medium text-muted-foreground hover:bg-muted">
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Product Rules ──────────────────────────────────────────────── */}
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground">Product-specific Rules</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Override commission settings per product</p>
                  </div>
                  <button onClick={() => setModalRule(null)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    + Add Product Rule
                  </button>
                </div>
                {rulesLoad ? (
                  <div className="p-6 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
                ) : rules.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No product-specific rules. Click "+ Add Product Rule" to create one.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          {['Product', 'Direction', 'Levels', 'Network', 'Team', 'Enabled', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map(rule => (
                          <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{rule.product_name}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {rule.direction === 'direct_first' ? '↓ Direct first' : '↑ Ancestor first'}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{rule.max_upline_levels}</td>
                            <td className="px-4 py-3 text-muted-foreground">{rule.network_commission_pct}%</td>
                            <td className="px-4 py-3 text-muted-foreground">{rule.team_commission_pct}%</td>
                            <td className="px-4 py-3">
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                rule.is_active ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted/50 text-muted-foreground')}>
                                {rule.is_active ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => setModalRule(rule)}
                                  className="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleDeleteRule(rule)}
                                  className="rounded-md p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {modalRule !== undefined && (
        <ProductCommissionModal rule={modalRule} onSave={handleRuleSaved} onClose={() => setModalRule(undefined)} />
      )}
    </div>
  );
}
