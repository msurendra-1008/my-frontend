import { useState, useEffect, Fragment } from 'react';
import {
  Menu, Trash2, Pencil, Sun, Moon, Settings, Package, X,
  ChevronRight, ChevronDown, Layers, Plus,
} from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@components/ui/Badge';
import { useTheme } from '@context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { ProductCommissionModal } from '@/components/commissions/ProductCommissionModal';
import { VariantCommissionModal } from '@/components/commissions/VariantCommissionModal';
import { commissionService } from '@/services/commissionService';
import type {
  CommissionSettings,
  ProductCommissionRule,
  VariantCommissionStatus,
  VariantCommissionRule,
  CommissionDirection,
} from '@/types/commission.types';
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

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

// ── Expanded Product Rule read-only panel ────────────────────────────────────
function ProductRulePanel({ rule }: { rule: ProductCommissionRule }) {
  const profit    = rule.product_pricing?.upa_profit ?? 100;
  const isPreview = !rule.product_pricing?.pricing_configured;

  const networkAmt  = profit * Number(rule.network_commission_pct)  / 100;
  const teamAmt     = profit * Number(rule.team_commission_pct)     / 100;
  const socialAmt   = profit * Number(rule.social_work_pct)         / 100;
  const companyAmt  = profit * Number(rule.company_pct)             / 100;
  const delivAmt    = profit * Number(rule.delivery_packaging_pct)  / 100;
  const selfAmt     = rule.self_commission_enabled
                        ? profit * Number(rule.self_commission_pct) / 100
                        : 0;

  const pools = [
    { label: '↑ Network',     pct: rule.network_commission_pct,  amt: networkAmt,  color: 'text-primary',                        bg: 'bg-primary/5 border-primary/20' },
    { label: '↓ Team',        pct: rule.team_commission_pct,     amt: teamAmt,     color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/5 border-green-500/20' },
    { label: '♥ Social',      pct: rule.social_work_pct,         amt: socialAmt,   color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/5 border-amber-500/20' },
    { label: '🏢 Company',    pct: rule.company_pct,             amt: companyAmt,  color: 'text-muted-foreground',               bg: 'bg-muted/40 border-border/50' },
    { label: '📦 Delivery',   pct: rule.delivery_packaging_pct,  amt: delivAmt,    color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/20' },
    { label: '✦ Self',        pct: rule.self_commission_pct,     amt: selfAmt,     color: 'text-purple-600 dark:text-purple-400', bg: rule.self_commission_enabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/30 border-border/30 opacity-50' },
  ];

  const displayPct = rule.direction === 'ancestor_first'
    ? [...rule.level_percentages].reverse()
    : rule.level_percentages;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT — Pools + Team split */}
      <div className="space-y-3">
        {isPreview && (
          <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            ₹ amounts shown as preview (₹100 base) — configure product pricing for exact figures.
          </div>
        )}
        {rule.product_pricing?.pricing_configured && (
          <div className="rounded-md border border-green-400/40 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-400">
            Real pricing: MRP {fmt(Number(rule.product_mrp))} → UPA Price {fmt(rule.product_pricing.upa_price)} → Profit {fmt(profit)}
          </div>
        )}

        {/* Pools grid */}
        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Commission Pools</p>
          <div className="grid grid-cols-2 gap-2">
            {pools.map(p => (
              <div key={p.label} className={cn('rounded-lg border p-2.5', p.bg)}>
                <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-1', p.color)}>{p.label}</p>
                <p className={cn('text-sm font-bold', p.color)}>{p.pct}%</p>
                <p className="text-xs text-muted-foreground">{fmt(p.amt)}</p>
              </div>
            ))}
          </div>
          {/* Distribution bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-1">
            <div style={{ width: `${Math.max(0, Number(rule.network_commission_pct))}%` }} className="bg-primary" />
            <div style={{ width: `${Math.max(0, Number(rule.team_commission_pct))}%` }} className="bg-green-500" />
            <div style={{ width: `${Math.max(0, Number(rule.social_work_pct))}%` }} className="bg-amber-500" />
            <div style={{ width: `${Math.max(0, Number(rule.company_pct))}%` }} className="bg-muted-foreground/40" />
            <div style={{ width: `${Math.max(0, Number(rule.delivery_packaging_pct))}%` }} className="bg-blue-500" />
            <div style={{ width: `${Math.max(0, rule.self_commission_enabled ? Number(rule.self_commission_pct) : 0)}%` }} className="bg-purple-500" />
          </div>
        </div>

        {/* Team leg split */}
        <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Team Leg Split</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Left',   pct: rule.left_leg_pct },
              { label: 'Middle', pct: rule.middle_leg_pct },
              { label: 'Right',  pct: rule.right_leg_pct },
            ].map(({ label, pct }) => (
              <div key={label} className="rounded-lg border border-green-500/20 bg-green-500/5 p-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-base font-bold text-green-600 dark:text-green-400">{pct}%</p>
                <p className="text-[10px] text-muted-foreground">{fmt(teamAmt * Number(pct) / 100)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Network level split */}
      <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Network Level Split</p>
          <span className="text-xs text-muted-foreground">
            {rule.direction === 'direct_first' ? '↓ Direct first' : '↑ Ancestor first'}
          </span>
        </div>
        <div className="space-y-0">
          {Array.from({ length: rule.max_upline_levels }, (_, i) => {
            const pct    = displayPct[i] ?? 0;
            const amt    = networkAmt * pct / 100;
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                <span
                  className="w-7 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: LEVEL_COLORS[i] ?? '#aaa' }}
                >
                  L{i + 1}
                </span>
                <span className="flex-1 text-xs text-muted-foreground">
                  {i === 0 ? 'Direct parent' : `Level ${i + 1}`}
                </span>
                <span className="text-xs font-semibold text-foreground">{pct}%</span>
                <span className="text-xs font-semibold text-primary min-w-[56px] text-right">{fmt(amt)}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground pt-1">
          Network pool total: {fmt(networkAmt)} {isPreview && '(preview)'}
        </p>
      </div>
    </div>
  );
}

// ── Variant Overrides sub-table ──────────────────────────────────────────────
function VariantOverridesPanel({
  productRule,
  variants,
  loading,
  onAddOverride,
  onEditOverride,
  onDeleteOverride,
}: {
  productRule:     ProductCommissionRule;
  variants:        VariantCommissionStatus[];
  loading:         boolean;
  onAddOverride:   (vs: VariantCommissionStatus) => void;
  onEditOverride:  (vs: VariantCommissionStatus) => void;
  onDeleteOverride:(vs: VariantCommissionStatus) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No variants found for this product.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40">
            {['Variant', 'MRP', 'UPA Price', 'Est. Profit', 'Rule Source', 'Network %', 'Team %', 'Levels', 'Status', 'Actions'].map(h => (
              <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.map(vs => {
            const rule       = vs.rule;
            const profit     = vs.variant_profit ?? 100;
            const isPreview  = vs.variant_profit === null;
            const netPct     = rule ? rule.network_commission_pct : productRule.network_commission_pct;
            const teamPct    = rule ? rule.team_commission_pct    : productRule.team_commission_pct;
            const levels     = rule ? rule.max_upline_levels      : productRule.max_upline_levels;
            const netAmt     = profit * Number(netPct) / 100;
            const teamAmt    = profit * Number(teamPct) / 100;

            return (
              <tr key={vs.variant_id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2">
                  <p className="font-medium text-foreground">{vs.variant_name}</p>
                  <p className="text-[10px] text-muted-foreground">{vs.variant_sku}</p>
                </td>
                <td className="px-3 py-2 font-medium text-foreground">
                  ₹{Number(vs.variant_mrp).toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-2 text-foreground">
                  {vs.upa_price ? `₹${Number(vs.upa_price).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-3 py-2">
                  {isPreview ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="font-semibold text-green-600 dark:text-green-400">{fmt(profit)}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {vs.has_override ? (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-400/30">
                      Variant Override
                    </span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      Product Rule
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-primary">{netPct}%</span>
                  {!isPreview && (
                    <p className="text-[10px] text-muted-foreground">{fmt(netAmt)}</p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-green-600 dark:text-green-400">{teamPct}%</span>
                  {!isPreview && (
                    <p className="text-[10px] text-muted-foreground">{fmt(teamAmt)}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-foreground">{levels}</td>
                <td className="px-3 py-2">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    vs.is_active
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-muted/50 text-muted-foreground',
                  )}>
                    {vs.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {vs.stock_quantity === 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Out of stock</p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    {vs.has_override ? (
                      <>
                        <button
                          onClick={() => onEditOverride(vs)}
                          className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit override"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteOverride(vs)}
                          className="rounded-md p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Remove override"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onAddOverride(vs)}
                        className="flex items-center gap-1 rounded-md border border-purple-400/40 bg-purple-500/10 px-2 py-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-colors"
                        title="Set variant override"
                      >
                        <Plus size={10} /> Set Override
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function CommissionSettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme }        = useTheme();
  const { user }                      = useAuthStore();
  const toast = useToast();

  const [globalModalOpen, setGlobalModalOpen] = useState(false);

  const [settings,         setSettings]         = useState<CommissionSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CommissionSettings | null>(null);
  const [settingsLoad,     setSettingsLoad]     = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);

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

  // Expansion state
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [expandedTab,    setExpandedTab]    = useState<'product' | 'variants'>('product');
  const [variantsCache,   setVariantsCache]   = useState<Record<string, VariantCommissionStatus[]>>({});
  const [variantsLoading, setVariantsLoading] = useState<Record<string, boolean>>({});
  const [variantModal, setVariantModal] = useState<{
    variantStatus: VariantCommissionStatus;
    existingRule:  VariantCommissionRule | null;
    productRule:   ProductCommissionRule;
  } | null>(null);

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
      setGlobalModalOpen(false);
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

  const closeModal = () => {
    if (isEditing) cancelEdit();
    setGlobalModalOpen(false);
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
      if (expandedRuleId === rule.id) setExpandedRuleId(null);
      toast.show('Rule deleted');
    } catch { toast.show('Failed to delete rule', true); }
  };

  const loadVariants = async (ruleId: string) => {
    setVariantsLoading(prev => ({ ...prev, [ruleId]: true }));
    try {
      const r = await commissionService.getVariantsStatus(ruleId);
      setVariantsCache(prev => ({ ...prev, [ruleId]: r.data }));
    } catch {
      toast.show('Failed to load variant data', true);
    } finally {
      setVariantsLoading(prev => ({ ...prev, [ruleId]: false }));
    }
  };

  const handleToggleRow = (ruleId: string) => {
    if (expandedRuleId === ruleId) {
      setExpandedRuleId(null);
      return;
    }
    setExpandedRuleId(ruleId);
    setExpandedTab('product');
    if (!variantsCache[ruleId]) {
      void loadVariants(ruleId);
    }
  };

  const refreshVariantsAndRules = (ruleId: string) => {
    void loadVariants(ruleId);
    commissionService.getProductRules()
      .then(r => setRules(r.data.results ?? []))
      .catch(() => {});
  };

  const handleVariantSaved = (saved: VariantCommissionRule, productRuleId: string) => {
    setVariantModal(null);
    toast.show('Variant override saved');
    refreshVariantsAndRules(productRuleId);
  };

  const handleDeleteVariantRule = async (vs: VariantCommissionStatus, productRuleId: string) => {
    if (!vs.rule) return;
    if (!window.confirm(`Remove variant override for "${vs.variant_name}"?`)) return;
    try {
      await commissionService.deleteVariantRule(vs.rule.id);
      toast.show('Variant override removed');
      refreshVariantsAndRules(productRuleId);
    } catch {
      toast.show('Failed to remove variant override', true);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const totalPoolPct = Number(networkPct) + Number(teamPct) + Number(socialPct) + Number(companyPct)
                     + (selfEnabled ? Number(selfPct) : 0) + Number(deliveryPct);
  const remaining    = 100 - totalPoolPct;

  const displayPercentages = direction === 'ancestor_first'
    ? [...levelPercentages].reverse()
    : levelPercentages;

  const PREVIEW_PROFIT = 100;

  const pools = [
    { key: 'network',  val: networkPct,  set: setNetworkPct,  title: '↑ Network',     desc: 'Goes UP the chain',    color: 'text-primary',                        bg: 'bg-primary/5 border-primary/20' },
    { key: 'team',     val: teamPct,     set: setTeamPct,     title: '↓ Team',        desc: 'Goes to direct legs',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/5 border-green-500/20' },
    { key: 'social',   val: socialPct,   set: setSocialPct,   title: '♥ Social Work', desc: 'Social fund',          color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/5 border-amber-500/20' },
    { key: 'company',  val: companyPct,  set: setCompanyPct,  title: '🏢 Company',    desc: 'Stays with company',   color: 'text-muted-foreground',               bg: 'bg-muted/40 border-border/50' },
    { key: 'delivery', val: deliveryPct, set: setDeliveryPct, title: '📦 Delivery',   desc: 'Delivery / packaging', color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/20' },
  ];

  const totalVariantOverrides = rules.reduce((acc, r) => acc + (r.variant_rule_count ?? 0), 0);

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

          {toast.msg && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm font-medium',
              toast.msg.err
                ? 'bg-red-500/10 border border-red-400/40 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border border-green-400/40 text-green-600 dark:text-green-400'
            )}>
              {toast.msg.text}
            </div>
          )}

          {/* ── Summary cards ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Card 1 — Global Settings */}
            <button
              onClick={() => !settingsLoad && setGlobalModalOpen(true)}
              className={cn(
                'group text-left rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/40',
                settingsLoad && 'opacity-70 cursor-wait'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Settings size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Global Commission Settings</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Click to view or edit</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors mt-0.5" />
              </div>
              {settingsLoad ? (
                <div className="mt-4 space-y-2">
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Network pool</p>
                    <p className="text-sm font-bold text-primary">{networkPct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Team pool</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">{teamPct}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Upline levels</p>
                    <p className="text-sm font-bold text-foreground">{levels}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Trigger</p>
                    <p className="text-sm font-bold text-foreground capitalize">{triggerMode}</p>
                  </div>
                </div>
              )}
            </button>

            {/* Card 2 — Product Rules */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <Package size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Product-specific Rules</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Override per product</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalRule(null)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  + Add Rule
                </button>
              </div>
              {rulesLoad ? (
                <div className="mt-4 h-4 animate-pulse rounded bg-muted w-1/2" />
              ) : (
                <div className="mt-4 flex items-center gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Total rules</p>
                    <p className="text-2xl font-bold text-foreground">{rules.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Active</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {rules.filter(r => r.is_active).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Inactive</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {rules.filter(r => !r.is_active).length}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3 — Variant Overrides */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Layers size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Variant Overrides</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Per-variant commission rules</p>
                </div>
              </div>
              {rulesLoad ? (
                <div className="mt-4 h-4 animate-pulse rounded bg-muted w-1/2" />
              ) : (
                <div className="mt-4 flex items-center gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Total overrides</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalVariantOverrides}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">Products covered</p>
                    <p className="text-2xl font-bold text-foreground">
                      {rules.filter(r => (r.variant_rule_count ?? 0) > 0).length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Product Rules Table ────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Product-specific Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click a row to expand commission details and manage variant overrides
                </p>
              </div>
              <button
                onClick={() => setModalRule(null)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                + Add Product Rule
              </button>
            </div>

            {rulesLoad ? (
              <div className="p-6 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
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
                      <th className="w-10 px-3 py-3" />
                      {['Product', 'Network %', 'Team %', 'Variant Overrides', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => {
                      const isExpanded = expandedRuleId === rule.id;
                      return (
                        <Fragment key={rule.id}>
                          <tr
                            className={cn(
                              'border-b transition-colors cursor-pointer',
                              isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20',
                            )}
                            onClick={() => handleToggleRow(rule.id)}
                          >
                            {/* Chevron */}
                            <td className="px-3 py-3 text-muted-foreground">
                              {isExpanded
                                ? <ChevronDown size={16} className="text-primary" />
                                : <ChevronRight size={16} />}
                            </td>

                            {/* Product */}
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{rule.product_name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {rule.direction === 'direct_first' ? '↓ Direct first' : '↑ Ancestor first'} · {rule.max_upline_levels} levels
                                {rule.product_mrp && ` · MRP ₹${Number(rule.product_mrp).toLocaleString('en-IN')}`}
                              </p>
                            </td>

                            {/* Network % */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-primary">{rule.network_commission_pct}%</span>
                            </td>

                            {/* Team % */}
                            <td className="px-4 py-3">
                              <span className="font-semibold text-green-600 dark:text-green-400">{rule.team_commission_pct}%</span>
                            </td>

                            {/* Variant overrides count */}
                            <td className="px-4 py-3">
                              {(rule.variant_rule_count ?? 0) > 0 ? (
                                <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-400/30">
                                  {rule.variant_rule_count} override{rule.variant_rule_count !== 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                                rule.is_active
                                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                  : 'bg-muted/50 text-muted-foreground'
                              )}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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

                          {/* ── Expanded row panel ─────────────────────────────── */}
                          {isExpanded && (
                            <tr className="border-b bg-muted/10">
                              <td colSpan={7} className="p-0">
                                <div className="px-4 pb-4 pt-2">
                                  {/* Tab bar */}
                                  <div className="flex border-b border-border/50 mb-4">
                                    <button
                                      onClick={() => setExpandedTab('product')}
                                      className={cn(
                                        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                                        expandedTab === 'product'
                                          ? 'border-primary text-primary'
                                          : 'border-transparent text-muted-foreground hover:text-foreground',
                                      )}
                                    >
                                      Product Rule
                                    </button>
                                    <button
                                      onClick={() => setExpandedTab('variants')}
                                      className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                                        expandedTab === 'variants'
                                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                          : 'border-transparent text-muted-foreground hover:text-foreground',
                                      )}
                                    >
                                      Variant Overrides
                                      {(rule.variant_rule_count ?? 0) > 0 && (
                                        <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                          {rule.variant_rule_count}
                                        </span>
                                      )}
                                    </button>
                                  </div>

                                  {/* Tab content */}
                                  {expandedTab === 'product' ? (
                                    <ProductRulePanel rule={rule} />
                                  ) : (
                                    <VariantOverridesPanel
                                      productRule={rule}
                                      variants={variantsCache[rule.id] ?? []}
                                      loading={variantsLoading[rule.id] ?? false}
                                      onAddOverride={(vs) => setVariantModal({ variantStatus: vs, existingRule: null, productRule: rule })}
                                      onEditOverride={(vs) => setVariantModal({ variantStatus: vs, existingRule: vs.rule!, productRule: rule })}
                                      onDeleteOverride={(vs) => handleDeleteVariantRule(vs, rule.id)}
                                    />
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Global Settings Modal ─────────────────────────────────────────────── */}
      {globalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border bg-card shadow-2xl flex flex-col">

            <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-primary" />
                <h2 className="font-semibold text-foreground">Global Commission Settings</h2>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 h-8 rounded-lg border px-3 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    <Pencil size={12} /> Edit settings
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                      className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                      {saving ? 'Saving…' : 'Save Settings'}
                    </button>
                    <button onClick={cancelEdit} disabled={saving}
                      className="h-8 rounded-lg border px-4 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60">
                      Cancel
                    </button>
                  </div>
                )}
                <button onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT COLUMN */}
                <div className="space-y-4">

                  {/* Commission Pools */}
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

                      {/* Self Commission */}
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

                    <div className="rounded-lg bg-muted/40 px-3 py-2 flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining ({remaining.toFixed(1)}% of profit)</span>
                      <span className="font-semibold">Stays with company</span>
                    </div>

                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${Math.max(0, Number(networkPct))}%` }} className="bg-primary transition-all" />
                      <div style={{ width: `${Math.max(0, Number(teamPct))}%` }} className="bg-green-500 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(socialPct))}%` }} className="bg-amber-500 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(companyPct))}%` }} className="bg-muted-foreground/40 transition-all" />
                      <div style={{ width: `${Math.max(0, Number(deliveryPct))}%` }} className="bg-blue-500 transition-all" />
                      <div style={{ width: `${Math.max(0, selfEnabled ? Number(selfPct) : 0)}%` }} className="bg-purple-500 transition-all" />
                      <div style={{ width: `${Math.max(0, remaining)}%` }} className="bg-muted transition-all" />
                    </div>
                  </div>

                  {/* Team leg split */}
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
                    <p className="text-xs text-muted-foreground">Vacant legs receive no commission — that amount stays with the company.</p>
                  </div>

                  {/* Trigger mode */}
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

                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">Max levels</label>
                    <input type="number" min={1} max={10}
                      value={levels}
                      onChange={e => setLevels(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      disabled={!isEditing}
                      className="w-24 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:border-transparent disabled:bg-transparent" />
                  </div>

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
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button onClick={cancelEdit} disabled={saving}
                    className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Settings'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={closeModal}
                    className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                    Close
                  </button>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <Pencil size={14} /> Edit Settings
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalRule !== undefined && (
        <ProductCommissionModal rule={modalRule} onSave={handleRuleSaved} onClose={() => setModalRule(undefined)} />
      )}

      {variantModal && (
        <VariantCommissionModal
          variantStatus={variantModal.variantStatus}
          existingRule={variantModal.existingRule}
          productRule={variantModal.productRule}
          onSave={(saved) => handleVariantSaved(saved, variantModal.productRule.id)}
          onClose={() => setVariantModal(null)}
        />
      )}
    </div>
  );
}
