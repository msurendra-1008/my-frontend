import { useState, useEffect, useRef } from 'react';
import {
  Menu, Settings, Sun, Moon, Search, X, Package,
  Save, Loader2, Pencil, Trash2, Info,
} from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Badge } from '@components/ui/Badge';
import { useTheme } from '@context/ThemeContext';
import { useAuthStore } from '@/store/authStore';
import { commissionService } from '@/services/commissionService';
import { productService } from '@/services/productService';
import type {
  CommissionSettings,
  ProductCommissionRule,
  VariantCommissionStatus,
  CommissionDirection,
} from '@/types/commission.types';
import type { ProductListItem } from '@/types/product.types';
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

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        disabled && 'cursor-default opacity-60',
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )} />
    </button>
  );
}

type OverrideState = { enabled: boolean; netPct: string; teamPct: string; ruleId?: string };

export function CommissionSettingsPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const { theme, toggleTheme }          = useTheme();
  const { user }                        = useAuthStore();
  const toast                           = useToast();
  const searchRef                       = useRef<HTMLDivElement>(null);

  // ── Global Settings modal state ────────────────────────────────────────────
  const [globalModalOpen,  setGlobalModalOpen]  = useState(false);
  const [settings,         setSettings]         = useState<CommissionSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<CommissionSettings | null>(null);
  const [settingsLoad,     setSettingsLoad]     = useState(true);
  const [globalSaving,     setGlobalSaving]     = useState(false);
  const [isEditing,        setIsEditing]        = useState(false);

  const [networkPct,       setNetworkPct]       = useState('7.00');
  const [teamPct,          setTeamPct]          = useState('3.00');
  const [socialPct,        setSocialPct]        = useState('0.00');
  const [companyPct,       setCompanyPct]       = useState('0.00');
  const [selfEnabled,      setSelfEnabled]      = useState(false);
  const [selfPct,          setSelfPct]          = useState('0.00');
  const [deliveryPct,      setDeliveryPct]      = useState('0.00');
  const [direction,        setDirection]        = useState<CommissionDirection>('direct_first');
  const [levels,           setLevels]           = useState(7);
  const [levelPercentages, setLevelPercentages] = useState<number[]>([40,25,15,10,5,3,2]);
  const [leftLegPct,       setLeftLegPct]       = useState('40.00');
  const [middleLegPct,     setMiddleLegPct]     = useState('30.00');
  const [rightLegPct,      setRightLegPct]      = useState('30.00');
  const [triggerMode,      setTriggerMode]      = useState<'auto'|'manual'>('auto');

  // ── Product search state ───────────────────────────────────────────────────
  const [query,         setQuery]         = useState('');
  const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Selected product + form state ─────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [existingRule,    setExistingRule]    = useState<ProductCommissionRule | null>(null);
  const [productLoading,  setProductLoading]  = useState(false);

  const [ruleActive,   setRuleActive]   = useState(true);
  const [rNetPct,      setRNetPct]      = useState('7.00');
  const [rTeamPct,     setRTeamPct]     = useState('3.00');
  const [rSocialPct,   setRSocialPct]   = useState('0.00');
  const [rCompanyPct,  setRCompanyPct]  = useState('0.00');
  const [rSelfEnabled, setRSelfEnabled] = useState(false);
  const [rSelfPct,     setRSelfPct]     = useState('0.00');
  const [rDeliveryPct, setRDeliveryPct] = useState('0.00');
  const [rDirection,   setRDirection]   = useState<CommissionDirection>('direct_first');
  const [rLevels,      setRLevels]      = useState(7);
  const [rLevelPcts,   setRLevelPcts]   = useState<number[]>([40,25,15,10,5,3,2]);
  const [rLeftLeg,     setRLeftLeg]     = useState('40.00');
  const [rMiddleLeg,   setRMiddleLeg]   = useState('30.00');
  const [rRightLeg,    setRRightLeg]    = useState('30.00');

  // ── Variant overrides ──────────────────────────────────────────────────────
  const [variants,        setVariants]        = useState<VariantCommissionStatus[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantOverrides, setVariantOverrides] = useState<Record<string, OverrideState>>({});

  // ── Rule save ──────────────────────────────────────────────────────────────
  const [ruleSaving, setRuleSaving] = useState(false);

  // ── All rules list (bottom) ────────────────────────────────────────────────
  const [allRules,    setAllRules]    = useState<ProductCommissionRule[]>([]);
  const [allRulesLoad, setAllRulesLoad] = useState(true);

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  const fillRuleForm = (rule: ProductCommissionRule) => {
    setRuleActive(rule.is_active);
    setRNetPct(rule.network_commission_pct);
    setRTeamPct(rule.team_commission_pct);
    setRSocialPct(rule.social_work_pct);
    setRCompanyPct(rule.company_pct);
    setRSelfEnabled(rule.self_commission_enabled);
    setRSelfPct(rule.self_commission_pct);
    setRDeliveryPct(rule.delivery_packaging_pct);
    setRDirection(rule.direction);
    setRLevels(rule.max_upline_levels);
    setRLevelPcts(rule.level_percentages.slice(0, rule.max_upline_levels));
    setRLeftLeg(rule.left_leg_pct);
    setRMiddleLeg(rule.middle_leg_pct);
    setRRightLeg(rule.right_leg_pct);
  };

  const fillRuleFromSettings = (s: CommissionSettings) => {
    setRuleActive(true);
    setRNetPct(s.network_commission_pct);
    setRTeamPct(s.team_commission_pct);
    setRSocialPct(s.social_work_pct);
    setRCompanyPct(s.company_pct);
    setRSelfEnabled(s.self_commission_enabled);
    setRSelfPct(s.self_commission_pct);
    setRDeliveryPct(s.delivery_packaging_pct);
    setRDirection(s.direction);
    setRLevels(s.max_upline_levels);
    setRLevelPcts(s.level_percentages.slice(0, s.max_upline_levels));
    setRLeftLeg(s.left_leg_pct);
    setRMiddleLeg(s.middle_leg_pct);
    setRRightLeg(s.right_leg_pct);
  };

  const loadVariants = async (ruleId: string, ruleNetPct?: string, ruleTeamPct?: string) => {
    setVariantsLoading(true);
    try {
      const r = await commissionService.getVariantsStatus(ruleId);
      setVariants(r.data);
      const overrides: Record<string, OverrideState> = {};
      for (const vs of r.data) {
        overrides[vs.variant_id] = {
          enabled:  vs.has_override,
          netPct:   vs.rule?.network_commission_pct ?? ruleNetPct ?? rNetPct,
          teamPct:  vs.rule?.team_commission_pct ?? ruleTeamPct ?? rTeamPct,
          ruleId:   vs.rule?.id,
        };
      }
      setVariantOverrides(overrides);
    } catch {
      toast.show('Failed to load variant data', true);
    } finally {
      setVariantsLoading(false);
    }
  };

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    commissionService.getSettings()
      .then(r => { setSettings(r.data); setOriginalSettings(r.data); fillFromSettings(r.data); })
      .catch(() => toast.show('Failed to load settings', true))
      .finally(() => setSettingsLoad(false));

    commissionService.getProductRules()
      .then(r => setAllRules(r.data.results ?? []))
      .catch(() => toast.show('Failed to load rules', true))
      .finally(() => setAllRulesLoad(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Level count → level percentages array ─────────────────────────────────
  useEffect(() => {
    setLevelPercentages(prev => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  useEffect(() => {
    setRLevelPcts(prev => {
      const next = [...prev];
      while (next.length < rLevels) next.push(0);
      return next.slice(0, rLevels);
    });
  }, [rLevels]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); setDropdownOpen(false); return; }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await productService.listProducts({ search: query.trim() });
        const results = (r.data.results ?? []).filter((p: ProductListItem) => p.pricing_configured);
        setSearchResults(results);
        setDropdownOpen(results.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Select product ────────────────────────────────────────────────────────
  const handleSelectProduct = async (product: ProductListItem) => {
    setDropdownOpen(false);
    setQuery('');
    setSelectedProduct(product);
    setVariants([]);
    setVariantOverrides({});
    setProductLoading(true);

    try {
      const ruleResp = await commissionService.getProductRuleByProduct(product.id);
      const rule = ruleResp.data;
      setExistingRule(rule);
      fillRuleForm(rule);
      await loadVariants(rule.id, rule.network_commission_pct, rule.team_commission_pct);
    } catch {
      setExistingRule(null);
      if (settings) fillRuleFromSettings(settings);
      setVariants([]);
    } finally {
      setProductLoading(false);
    }
  };

  // ── Save rule + variant overrides ─────────────────────────────────────────
  const handleSaveRule = async () => {
    if (!selectedProduct) return;
    setRuleSaving(true);
    try {
      const ruleData = {
        product:                 selectedProduct.id,
        is_active:               ruleActive,
        network_commission_pct:  rNetPct,
        team_commission_pct:     rTeamPct,
        social_work_pct:         rSocialPct,
        company_pct:             rCompanyPct,
        self_commission_enabled: rSelfEnabled,
        self_commission_pct:     rSelfPct,
        delivery_packaging_pct:  rDeliveryPct,
        direction:               rDirection,
        max_upline_levels:       rLevels,
        level_percentages:       rLevelPcts,
        left_leg_pct:            rLeftLeg,
        middle_leg_pct:          rMiddleLeg,
        right_leg_pct:           rRightLeg,
      };

      let savedRule: ProductCommissionRule;
      if (existingRule) {
        const r = await commissionService.updateProductRule(existingRule.id, ruleData);
        savedRule = r.data;
      } else {
        const r = await commissionService.createProductRule(ruleData);
        savedRule = r.data;
      }
      setExistingRule(savedRule);

      // Re-fetch variants to get latest has_override state
      const varResp = await commissionService.getVariantsStatus(savedRule.id);
      const freshVariants = varResp.data;

      // Apply override changes
      await Promise.all(
        freshVariants.map(async (vs) => {
          const ov = variantOverrides[vs.variant_id];
          if (!ov) return;
          if (ov.enabled && !vs.has_override) {
            await commissionService.createVariantRule({
              variant:                 vs.variant_id,
              is_active:               true,
              network_commission_pct:  ov.netPct,
              team_commission_pct:     ov.teamPct,
              social_work_pct:         rSocialPct,
              company_pct:             rCompanyPct,
              self_commission_enabled: rSelfEnabled,
              self_commission_pct:     rSelfPct,
              delivery_packaging_pct:  rDeliveryPct,
              direction:               rDirection,
              max_upline_levels:       rLevels,
              use_max_levels:          false,
              level_percentages:       rLevelPcts,
              left_leg_pct:            rLeftLeg,
              middle_leg_pct:          rMiddleLeg,
              right_leg_pct:           rRightLeg,
            });
          } else if (ov.enabled && vs.has_override && vs.rule) {
            await commissionService.updateVariantRule(vs.rule.id, {
              network_commission_pct: ov.netPct,
              team_commission_pct:    ov.teamPct,
            });
          } else if (!ov.enabled && vs.has_override && vs.rule) {
            await commissionService.deleteVariantRule(vs.rule.id);
          }
        })
      );

      // Reload variants with fresh state
      await loadVariants(savedRule.id, rNetPct, rTeamPct);

      // Refresh all rules list
      commissionService.getProductRules()
        .then(r => setAllRules(r.data.results ?? []))
        .catch(() => {});

      toast.show(existingRule ? 'Commission rule updated' : 'Commission rule created');
    } catch {
      toast.show('Failed to save commission rules', true);
    } finally {
      setRuleSaving(false);
    }
  };

  const handleDeleteAllRule = async (rule: ProductCommissionRule) => {
    if (!window.confirm(`Delete commission rule for "${rule.product_name}"?`)) return;
    try {
      await commissionService.deleteProductRule(rule.id);
      setAllRules(prev => prev.filter(r => r.id !== rule.id));
      if (existingRule?.id === rule.id) {
        setExistingRule(null);
        setVariants([]);
        setVariantOverrides({});
        if (settings) fillRuleFromSettings(settings);
      }
      toast.show('Rule deleted');
    } catch { toast.show('Failed to delete rule', true); }
  };

  // ── Global Settings handlers ──────────────────────────────────────────────
  const handleGlobalSave = async () => {
    setGlobalSaving(true);
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
      toast.show('Global settings saved');
    } catch { toast.show('Failed to save settings', true); }
    finally { setGlobalSaving(false); }
  };

  const cancelEdit = () => {
    if (originalSettings) fillFromSettings(originalSettings);
    setIsEditing(false);
  };

  const closeModal = () => { if (isEditing) cancelEdit(); setGlobalModalOpen(false); };

  // ── Derived values ────────────────────────────────────────────────────────
  const PREVIEW_PROFIT = 100;
  const totalPoolPct = Number(networkPct) + Number(teamPct) + Number(socialPct) + Number(companyPct)
                     + (selfEnabled ? Number(selfPct) : 0) + Number(deliveryPct);
  const remaining = 100 - totalPoolPct;
  const displayPercentages = direction === 'ancestor_first' ? [...levelPercentages].reverse() : levelPercentages;

  const rDisplayPcts = rDirection === 'ancestor_first' ? [...rLevelPcts].reverse() : rLevelPcts;

  // Product profit (use upa_profit_min as best estimate, or upa_profit_max, else 100)
  const productProfit = selectedProduct
    ? (selectedProduct.upa_profit_min ?? selectedProduct.upa_profit_max ?? 100)
    : 100;

  const pools = [
    { key: 'network',  val: networkPct,  set: setNetworkPct,  title: '↑ Network',   desc: 'Goes UP the chain',    color: 'text-primary',                       bg: 'bg-primary/5 border-primary/20' },
    { key: 'team',     val: teamPct,     set: setTeamPct,     title: '↓ Team',      desc: 'Goes to direct legs',  color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
    { key: 'social',   val: socialPct,   set: setSocialPct,   title: '♥ Social',    desc: 'Social fund',          color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
    { key: 'company',  val: companyPct,  set: setCompanyPct,  title: '🏢 Company',  desc: 'Stays with company',   color: 'text-muted-foreground',              bg: 'bg-muted/40 border-border/50' },
    { key: 'delivery', val: deliveryPct, set: setDeliveryPct, title: '📦 Delivery', desc: 'Delivery / packaging', color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/5 border-blue-500/20' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-[52px] items-center justify-between border-b bg-card px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-md p-1.5 hover:bg-muted">
              <Menu size={18} />
            </button>
            <span className="text-base font-semibold text-foreground">Commission Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => !settingsLoad && setGlobalModalOpen(true)}
              disabled={settingsLoad}
              className="flex items-center gap-1.5 h-8 rounded-lg border px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Settings size={13} />
              Global Settings
              {!settingsLoad && settings && (
                <span className="text-primary font-semibold">{networkPct}% net</span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
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
          {/* Toast */}
          {toast.msg && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm font-medium',
              toast.msg.err
                ? 'bg-red-500/10 border border-red-400/40 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 border border-green-400/40 text-green-600 dark:text-green-400'
            )}>
              {toast.msg.text}
            </div>
          )}

          {/* ── Product search ─────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold text-foreground">Set Commission for a Product</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Search for a product with pricing configured to set its commission rules
              </p>
            </div>
            <div className="p-6">
              <div ref={searchRef} className="relative max-w-lg">
                <div className="flex items-center gap-2 rounded-lg border bg-background px-3 h-10 focus-within:ring-2 focus-within:ring-primary/30">
                  {searchLoading
                    ? <Loader2 size={16} className="text-muted-foreground animate-spin flex-shrink-0" />
                    : <Search size={16} className="text-muted-foreground flex-shrink-0" />
                  }
                  <input
                    type="text"
                    placeholder="Search products with pricing configured…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  {query && (
                    <button onClick={() => { setQuery(''); setDropdownOpen(false); }} className="text-muted-foreground hover:text-foreground">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search dropdown */}
                {dropdownOpen && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border bg-card shadow-xl overflow-hidden">
                    {searchResults.slice(0, 8).map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <Package size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.mrp_min ? `MRP ₹${Number(product.mrp_min).toLocaleString('en-IN')}` : ''}
                            {product.upa_profit_min != null ? ` · Profit ₹${product.upa_profit_min.toFixed(0)}` : ''}
                            {product.variant_count > 0 ? ` · ${product.variant_count} variant${product.variant_count !== 1 ? 's' : ''}` : ''}
                          </p>
                        </div>
                        {product.has_commission_rule && (
                          <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            Rule exists
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {dropdownOpen && query.trim() && searchResults.length === 0 && !searchLoading && (
                  <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border bg-card shadow-xl px-4 py-6 text-center text-sm text-muted-foreground">
                    No products with pricing configured found for "{query}"
                  </div>
                )}
              </div>
            </div>

            {/* ── Selected product panel ──────────────────────────────────── */}
            {selectedProduct && (
              <div className="border-t">
                {productLoading ? (
                  <div className="p-6 flex items-center gap-3 text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Loading product commission data…</span>
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Product info bar */}
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Package size={20} className="text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{selectedProduct.name}</p>
                            {existingRule ? (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-400/30">
                                Rule exists
                              </span>
                            ) : (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                                No rule yet
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedProduct.mrp_min && `MRP ₹${Number(selectedProduct.mrp_min).toLocaleString('en-IN')}`}
                            {selectedProduct.upa_profit_min != null && ` · UPA Profit ₹${selectedProduct.upa_profit_min.toFixed(2)}`}
                            {selectedProduct.variant_count > 0 && ` · ${selectedProduct.variant_count} variants`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Rule active</label>
                        <Toggle checked={ruleActive} onChange={setRuleActive} />
                        <button
                          onClick={() => setSelectedProduct(null)}
                          className="ml-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Commission pools form */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      {/* LEFT — Pools */}
                      <div className="space-y-4">
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Commission Pools</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              % of UPA profit (≈{fmt(productProfit)}) distributed per sale
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: '↑ Network',   pct: rNetPct,      set: setRNetPct,      color: 'text-primary', bg: 'bg-primary/5 border-primary/20' },
                              { label: '↓ Team',      pct: rTeamPct,     set: setRTeamPct,     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5 border-green-500/20' },
                              { label: '♥ Social',    pct: rSocialPct,   set: setRSocialPct,   color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
                              { label: '🏢 Company',  pct: rCompanyPct,  set: setRCompanyPct,  color: 'text-muted-foreground', bg: 'bg-muted/40 border-border/50' },
                              { label: '📦 Delivery', pct: rDeliveryPct, set: setRDeliveryPct, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/5 border-blue-500/20' },
                            ].map(({ label, pct, set, color, bg }) => (
                              <div key={label} className={cn('rounded-lg border p-2.5', bg)}>
                                <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-1', color)}>{label}</p>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number" min={0} max={100} step="0.01"
                                    value={pct}
                                    onChange={e => set(e.target.value)}
                                    className="w-16 h-7 rounded-md border bg-background px-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                                <p className={cn('text-xs font-semibold mt-1', color)}>
                                  {fmt(productProfit * Number(pct) / 100)}
                                </p>
                              </div>
                            ))}

                            {/* Self commission toggle */}
                            <div className={cn('rounded-lg border p-2.5', rSelfEnabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/30 border-border/40')}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">✦ Self</p>
                                <Toggle checked={rSelfEnabled} onChange={setRSelfEnabled} />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number" min={0} max={100} step="0.01"
                                  value={rSelfPct}
                                  onChange={e => setRSelfPct(e.target.value)}
                                  disabled={!rSelfEnabled}
                                  className="w-16 h-7 rounded-md border bg-background px-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">
                                {rSelfEnabled ? fmt(productProfit * Number(rSelfPct) / 100) : 'Disabled'}
                              </p>
                            </div>
                          </div>

                          {/* Distribution bar */}
                          <div className="flex h-1.5 rounded-full overflow-hidden">
                            <div style={{ width: `${Math.max(0, Number(rNetPct))}%` }} className="bg-primary" />
                            <div style={{ width: `${Math.max(0, Number(rTeamPct))}%` }} className="bg-green-500" />
                            <div style={{ width: `${Math.max(0, Number(rSocialPct))}%` }} className="bg-amber-500" />
                            <div style={{ width: `${Math.max(0, Number(rCompanyPct))}%` }} className="bg-muted-foreground/40" />
                            <div style={{ width: `${Math.max(0, Number(rDeliveryPct))}%` }} className="bg-blue-500" />
                            <div style={{ width: `${Math.max(0, rSelfEnabled ? Number(rSelfPct) : 0)}%` }} className="bg-purple-500" />
                          </div>
                        </div>

                        {/* Team leg split */}
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                          <p className="text-sm font-semibold text-foreground">Team Leg Split</p>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { label: 'Left',   val: rLeftLeg,   set: setRLeftLeg },
                              { label: 'Middle', val: rMiddleLeg, set: setRMiddleLeg },
                              { label: 'Right',  val: rRightLeg,  set: setRRightLeg },
                            ] as const).map(({ label, val, set }) => (
                              <div key={label} className="rounded-lg border border-green-500/20 bg-green-500/5 p-2 text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                                <input
                                  type="number" min={0} max={100} step="0.01"
                                  value={val} onChange={e => set(e.target.value)}
                                  className="w-full text-center text-base font-bold text-green-600 dark:text-green-400 border-none bg-transparent focus:outline-none"
                                />
                                <p className="text-[10px] text-muted-foreground">% of team</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Direction + levels */}
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                          <p className="text-sm font-semibold text-foreground">Network Distribution</p>
                          <div className="flex border border-border/60 rounded-lg overflow-hidden">
                            <button onClick={() => setRDirection('direct_first')}
                              className={cn('flex-1 h-8 text-xs font-medium transition-colors',
                                rDirection === 'direct_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                              ↓ Direct parent first
                            </button>
                            <button onClick={() => setRDirection('ancestor_first')}
                              className={cn('flex-1 h-8 text-xs font-medium border-l border-border/60 transition-colors',
                                rDirection === 'ancestor_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                              ↑ Ancestor first
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">Max upline levels</label>
                            <input
                              type="number" min={1} max={10}
                              value={rLevels}
                              onChange={e => setRLevels(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                              className="w-16 h-7 rounded-md border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="space-y-0">
                            {Array.from({ length: rLevels }, (_, i) => {
                              const pct = rDisplayPcts[i] ?? 0;
                              const netPool = productProfit * Number(rNetPct) / 100;
                              const amt = netPool * pct / 100;
                              return (
                                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                                  <span className="w-7 h-5 rounded flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{ background: LEVEL_COLORS[i] ?? '#aaa' }}>
                                    L{i + 1}
                                  </span>
                                  <span className="flex-1 text-xs text-muted-foreground">
                                    {i === 0 ? 'Direct parent' : `Level ${i + 1}`}
                                  </span>
                                  <input
                                    type="number" min={0} max={100} step="0.1"
                                    value={pct}
                                    onChange={e => {
                                      const next = [...rLevelPcts];
                                      const idx = rDirection === 'ancestor_first' ? rLevels - 1 - i : i;
                                      next[idx] = Number(e.target.value);
                                      setRLevelPcts(next);
                                    }}
                                    className="w-16 h-6 rounded-md border bg-background px-1.5 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                  <span className="text-xs font-semibold text-primary min-w-[52px] text-right">{fmt(amt)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT — Variants table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">Variants &amp; Overrides</p>
                          {!existingRule && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <Info size={12} />
                              Save product rule first to set variant overrides
                            </span>
                          )}
                        </div>

                        {variantsLoading ? (
                          <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}
                          </div>
                        ) : variants.length === 0 && existingRule ? (
                          <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                            No variants found for this product.
                          </div>
                        ) : variants.length === 0 ? (
                          <div className="rounded-xl border bg-muted/30 p-6 text-center">
                            <p className="text-sm text-muted-foreground">Save the product rule above to manage per-variant overrides.</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border bg-muted/30 overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 border-b bg-muted/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <span>Variant</span>
                              <span className="text-right">UPA Profit</span>
                              <span className="text-right">Network</span>
                              <span className="text-right">Team</span>
                              <span className="text-center">Override</span>
                            </div>

                            {variants.map(vs => {
                              const ov = variantOverrides[vs.variant_id] ?? { enabled: false, netPct: rNetPct, teamPct: rTeamPct };
                              const profit = vs.variant_profit ?? productProfit;
                              const effectiveNet  = ov.enabled ? Number(ov.netPct)  : Number(rNetPct);
                              const effectiveTeam = ov.enabled ? Number(ov.teamPct) : Number(rTeamPct);
                              const netAmt  = profit * effectiveNet  / 100;
                              const teamAmt = profit * effectiveTeam / 100;

                              return (
                                <div key={vs.variant_id} className={cn(
                                  'border-b last:border-0 p-3 transition-colors',
                                  ov.enabled ? 'bg-purple-500/5' : 'hover:bg-muted/30',
                                )}>
                                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-start">
                                    {/* Name */}
                                    <div>
                                      <p className="text-xs font-medium text-foreground">{vs.variant_name}</p>
                                      <p className="text-[10px] text-muted-foreground">{vs.variant_sku}</p>
                                      {vs.stock_quantity === 0 && (
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400">Out of stock</span>
                                      )}
                                    </div>

                                    {/* UPA Profit */}
                                    <div className="text-right">
                                      {vs.variant_profit != null ? (
                                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{fmt(vs.variant_profit)}</span>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </div>

                                    {/* Network pool */}
                                    <div className="text-right">
                                      {ov.enabled ? (
                                        <input
                                          type="number" min={0} max={100} step="0.01"
                                          value={ov.netPct}
                                          onChange={e => setVariantOverrides(prev => ({
                                            ...prev,
                                            [vs.variant_id]: { ...ov, netPct: e.target.value },
                                          }))}
                                          className="w-14 h-6 rounded-md border border-purple-400/40 bg-background px-1 text-xs font-bold text-center text-primary focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                                        />
                                      ) : (
                                        <span className="text-xs font-semibold text-primary">{rNetPct}%</span>
                                      )}
                                      <p className="text-[10px] text-muted-foreground">{fmt(netAmt)}</p>
                                    </div>

                                    {/* Team pool */}
                                    <div className="text-right">
                                      {ov.enabled ? (
                                        <input
                                          type="number" min={0} max={100} step="0.01"
                                          value={ov.teamPct}
                                          onChange={e => setVariantOverrides(prev => ({
                                            ...prev,
                                            [vs.variant_id]: { ...ov, teamPct: e.target.value },
                                          }))}
                                          className="w-14 h-6 rounded-md border border-purple-400/40 bg-background px-1 text-xs font-bold text-center text-green-600 dark:text-green-400 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                                        />
                                      ) : (
                                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{rTeamPct}%</span>
                                      )}
                                      <p className="text-[10px] text-muted-foreground">{fmt(teamAmt)}</p>
                                    </div>

                                    {/* Override toggle */}
                                    <div className="flex flex-col items-center gap-1">
                                      <Toggle
                                        checked={ov.enabled}
                                        disabled={!existingRule}
                                        onChange={enabled => setVariantOverrides(prev => ({
                                          ...prev,
                                          [vs.variant_id]: {
                                            ...ov,
                                            enabled,
                                            netPct:  enabled ? (vs.rule?.network_commission_pct ?? rNetPct) : rNetPct,
                                            teamPct: enabled ? (vs.rule?.team_commission_pct ?? rTeamPct) : rTeamPct,
                                          },
                                        }))}
                                      />
                                      {ov.enabled && (
                                        <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold">custom</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save button */}
                    <div className="flex items-center justify-end gap-3 border-t pt-4">
                      <button
                        onClick={() => setSelectedProduct(null)}
                        className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveRule}
                        disabled={ruleSaving}
                        className="flex items-center gap-2 h-9 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                      >
                        {ruleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {ruleSaving ? 'Saving…' : existingRule ? 'Update Rule' : 'Create Rule'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── All product rules list ─────────────────────────────────────── */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">All Product Commission Rules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click "Edit" to open a product and modify its commission settings
                </p>
              </div>
              {!allRulesLoad && (
                <span className="text-xs text-muted-foreground">
                  {allRules.filter(r => r.is_active).length} active / {allRules.length} total
                </span>
              )}
            </div>

            {allRulesLoad ? (
              <div className="p-6 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}
              </div>
            ) : allRules.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No product commission rules yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Search for a product above to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      {['Product', 'Network %', 'Team %', 'Variant Overrides', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allRules.map(rule => (
                      <tr key={rule.id} className={cn(
                        'border-b last:border-0 transition-colors hover:bg-muted/20',
                        existingRule?.id === rule.id && 'bg-primary/5',
                      )}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{rule.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {rule.direction === 'direct_first' ? '↓ Direct first' : '↑ Ancestor first'} · {rule.max_upline_levels} levels
                            {rule.product_mrp && ` · MRP ₹${Number(rule.product_mrp).toLocaleString('en-IN')}`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-primary">{rule.network_commission_pct}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-green-600 dark:text-green-400">{rule.team_commission_pct}%</span>
                        </td>
                        <td className="px-4 py-3">
                          {(rule.variant_rule_count ?? 0) > 0 ? (
                            <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-400/30">
                              {rule.variant_rule_count} override{rule.variant_rule_count !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                            rule.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted/50 text-muted-foreground',
                          )}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const fakeProduct: ProductListItem = {
                                  id: rule.product,
                                  name: rule.product_name,
                                  slug: rule.product_slug,
                                  sku: null,
                                  mrp: rule.product_mrp || null,
                                  min_variant_mrp: rule.product_mrp || null,
                                  primary_image: null,
                                  category_name: null,
                                  brand_name: null,
                                  is_published: true,
                                  stock_label: 'In Stock',
                                  total_stock: 0,
                                  variant_count: 0,
                                  first_variant_id: null,
                                  pricing_configured: true,
                                  configured_variant_count: 0,
                                  mrp_min: rule.product_mrp || null,
                                  mrp_max: rule.product_mrp || null,
                                  profit_min: null,
                                  profit_max: null,
                                  upa_profit_min: rule.product_pricing?.upa_profit ?? null,
                                  upa_profit_max: rule.product_pricing?.upa_profit ?? null,
                                  purchase_price: null,
                                  profit_amount: null,
                                  upa_profit_amount: rule.product_pricing?.upa_profit ?? null,
                                  upa_discount_override: null,
                                  has_commission_rule: true,
                                };
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                setSelectedProduct(fakeProduct);
                                setExistingRule(rule);
                                fillRuleForm(rule);
                                setVariants([]);
                                setVariantOverrides({});
                                setVariantsLoading(true);
                                try {
                                  const r = await commissionService.getVariantsStatus(rule.id);
                                  setVariants(r.data);
                                  const overrides: Record<string, OverrideState> = {};
                                  for (const vs of r.data) {
                                    overrides[vs.variant_id] = {
                                      enabled: vs.has_override,
                                      netPct:  vs.rule?.network_commission_pct ?? rule.network_commission_pct,
                                      teamPct: vs.rule?.team_commission_pct ?? rule.team_commission_pct,
                                      ruleId:  vs.rule?.id,
                                    };
                                  }
                                  setVariantOverrides(overrides);
                                } catch {
                                  toast.show('Failed to load variant data', true);
                                } finally {
                                  setVariantsLoading(false);
                                }
                              }}
                              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAllRule(rule)}
                              className="rounded-md p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete rule"
                            >
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
                    <button onClick={handleGlobalSave} disabled={globalSaving}
                      className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                      {globalSaving ? 'Saving…' : 'Save Settings'}
                    </button>
                    <button onClick={cancelEdit} disabled={globalSaving}
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

                {/* LEFT */}
                <div className="space-y-4">
                  {/* Commission Pools */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground text-sm">Commission Pools</p>
                      <p className="text-xs text-muted-foreground mt-0.5">% of UPA profit distributed per sale (preview on ₹100)</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {pools.map(pool => (
                        <div key={pool.key} className={cn('rounded-xl border p-3', pool.bg)}>
                          <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-2', pool.color)}>
                            {pool.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <input type="number" min={0} max={100} step="0.01"
                              value={pool.val}
                              onChange={e => pool.set(e.target.value)}
                              disabled={!isEditing}
                              className="w-24 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:border-transparent disabled:bg-transparent" />
                            <span className="text-sm text-muted-foreground">%</span>
                            <span className={cn('text-sm font-semibold', pool.color)}>
                              = ₹{(PREVIEW_PROFIT * Number(pool.val) / 100).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{pool.desc}</p>
                        </div>
                      ))}

                      {/* Self Commission */}
                      <div className={cn('rounded-xl border p-3', selfEnabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/30 border-border/40 opacity-70')}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">✦ Self Commission</p>
                          <Toggle checked={selfEnabled} onChange={setSelfEnabled} disabled={!isEditing} />
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
                          className={cn('flex-1 h-9 text-xs font-medium transition-colors',
                            mode === 'manual' && 'border-l border-border/60',
                            triggerMode === mode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                          {mode === 'auto' ? '⏱ Auto (after return window)' : '✋ Manual (admin triggers)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT — Network level split */}
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
                  <button onClick={cancelEdit} disabled={globalSaving}
                    className="h-9 rounded-lg border px-5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60">
                    Cancel
                  </button>
                  <button onClick={handleGlobalSave} disabled={globalSaving}
                    className="h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                    {globalSaving ? 'Saving…' : 'Save Settings'}
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
    </div>
  );
}
