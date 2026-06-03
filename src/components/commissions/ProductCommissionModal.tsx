import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '@utils/cn';
import { commissionService } from '@/services/commissionService';
import { productService } from '@/services/productService';
import type { ProductCommissionRule } from '@/types/commission.types';
import type { ProductListItem } from '@/types/product.types';

interface Props {
  rule:    ProductCommissionRule | null;
  onSave:  (r: ProductCommissionRule) => void;
  onClose: () => void;
}

export function ProductCommissionModal({ rule, onSave, onClose }: Props) {
  const isEdit = rule !== null;

  // Product search (create only)
  const [productId,       setProductId]       = useState(rule?.product ?? '');
  const [productMRP,      setProductMRP]      = useState<number>(Number(rule?.product_mrp ?? 100));
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState<ProductListItem[]>([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);

  // Commission fields
  const [isEnabled,        setIsEnabled]        = useState(rule?.is_active ?? true);
  const [direction,        setDirection]        = useState<'direct_first' | 'ancestor_first'>(rule?.direction ?? 'direct_first');
  const [levels,           setLevels]           = useState(rule?.max_upline_levels ?? 3);
  const [levelPercentages, setLevelPercentages] = useState<number[]>(
    rule?.level_percentages ?? Array(3).fill(0),
  );
  const [networkPct,   setNetworkPct]   = useState(rule?.network_commission_pct ?? '7.00');
  const [teamPct,      setTeamPct]      = useState(rule?.team_commission_pct ?? '3.00');
  const [leftLegPct,   setLeftLegPct]   = useState(rule?.left_leg_pct ?? '40.00');
  const [middleLegPct, setMiddleLegPct] = useState(rule?.middle_leg_pct ?? '30.00');
  const [rightLegPct,  setRightLegPct]  = useState(rule?.right_leg_pct ?? '30.00');

  // Global settings hint values (shown as "(Global: X%)")
  const [globalNetworkPct, setGlobalNetworkPct] = useState<string | null>(null);
  const [globalTeamPct,    setGlobalTeamPct]    = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const searchRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill from global settings when creating a new rule
  useEffect(() => {
    commissionService.getSettings().then((r) => {
      const s = r.data;
      setGlobalNetworkPct(s.network_commission_pct);
      setGlobalTeamPct(s.team_commission_pct);
      if (!isEdit) {
        setDirection(s.direction);
        setLevels(s.max_upline_levels);
        setLevelPercentages(s.level_percentages.slice(0, s.max_upline_levels));
        setNetworkPct(s.network_commission_pct);
        setTeamPct(s.team_commission_pct);
        setLeftLegPct(s.left_leg_pct);
        setMiddleLegPct(s.middle_leg_pct);
        setRightLegPct(s.right_leg_pct);
      }
    }).catch(() => {/* non-fatal */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced product search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      productService.listProducts({ search: searchQuery.trim() })
        .then((r) => {
          setSearchResults(r.data.results ?? []);
          setDropdownOpen(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Sync levelPercentages length with levels
  useEffect(() => {
    setLevelPercentages((prev) => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  const handleSelectProduct = (p: ProductListItem) => {
    setSelectedProduct(p);
    setProductId(p.id);
    setProductMRP(Number(p.mrp));
    setSearchQuery('');
    setDropdownOpen(false);
    setSearchResults([]);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setProductId('');
  };

  const handleUseGlobalDefaults = async () => {
    try {
      const r = await commissionService.getSettings();
      const s = r.data;
      setDirection(s.direction);
      setLevels(s.max_upline_levels);
      setLevelPercentages(s.level_percentages.slice(0, s.max_upline_levels));
      setNetworkPct(s.network_commission_pct);
      setTeamPct(s.team_commission_pct);
      setLeftLegPct(s.left_leg_pct);
      setMiddleLegPct(s.middle_leg_pct);
      setRightLegPct(s.right_leg_pct);
    } catch {
      setError('Failed to fetch global settings');
    }
  };

  const handleSave = async () => {
    if (!isEdit && !productId) {
      setError('Please select a product.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Partial<ProductCommissionRule> = {
        is_active:              isEnabled,
        direction,
        max_upline_levels:      levels,
        level_percentages:      levelPercentages,
        network_commission_pct: networkPct,
        team_commission_pct:    teamPct,
        left_leg_pct:           leftLegPct,
        middle_leg_pct:         middleLegPct,
        right_leg_pct:          rightLegPct,
      };
      if (!isEdit) payload.product = productId;

      let saved: ProductCommissionRule;
      if (isEdit) {
        const r = await commissionService.updateProductRule(rule.id, payload);
        saved = r.data;
      } else {
        const r = await commissionService.createProductRule(payload);
        saved = r.data;
      }
      onSave(saved);
    } catch {
      setError('Failed to save rule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePctChange = (idx: number, val: string) => {
    const n = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setLevelPercentages((prev) => {
      const next = [...prev];
      next[idx] = n;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border bg-card shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-foreground">
              {isEdit ? `Edit Rule — ${rule.product_name}` : 'Add Product Rule'}
            </h3>
            {(isEdit || productMRP !== 100) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                MRP: ₹{productMRP.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Product search (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
              {selectedProduct ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearProduct}
                    className="ml-2 rounded p-1 hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                      placeholder="Search by name or SKU…"
                      className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    )}
                  </div>
                  {dropdownOpen && searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-52 overflow-y-auto">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm text-foreground truncate">{p.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground flex-shrink-0">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {dropdownOpen && !searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-lg">
                      No products found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Is Enabled */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Enabled</label>
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
            <label className="block text-xs font-medium text-muted-foreground mb-1">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('direct_first')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  direction === 'direct_first'
                    ? 'border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                ↑ L1 gets most
              </button>
              <button
                type="button"
                onClick={() => setDirection('ancestor_first')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  direction === 'ancestor_first'
                    ? 'border-purple-400/60 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'border-border text-muted-foreground hover:bg-muted',
                )}
              >
                ↓ L7 gets most
              </button>
            </div>
          </div>

          {/* Levels */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Levels (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={levels}
              onChange={(e) => setLevels(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Network + Team commission % */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Network commission (%)
                {globalNetworkPct !== null && (
                  <span className="ml-1 font-normal">(Global: {globalNetworkPct}%)</span>
                )}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={networkPct}
                onChange={(e) => setNetworkPct(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Team commission (%)
                {globalTeamPct !== null && (
                  <span className="ml-1 font-normal">(Global: {globalTeamPct}%)</span>
                )}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={teamPct}
                onChange={(e) => setTeamPct(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Level percentages */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Level Percentages</label>
            <div className="space-y-2">
              {Array.from({ length: levels }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground">
                    {i === 0 ? 'Level 1 (direct)' : `Level ${i + 1}`}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={levelPercentages[i] ?? 0}
                    onChange={(e) => handlePctChange(i, e.target.value)}
                    className="w-20 rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <span className="text-xs text-muted-foreground">
                    ₹{(productMRP * Number(networkPct) / 100 * (levelPercentages[i] ?? 0) / 100).toFixed(2)} per ₹{productMRP.toLocaleString('en-IN')} MRP
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Preview based on product MRP ₹{productMRP.toLocaleString('en-IN')}. Actual amount depends on UPA price at time of purchase.
            </p>
          </div>

          {/* Team Commission Split */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground mb-1">Team Commission Split</p>
            <p className="text-xs text-muted-foreground mb-3">Split team commission among 3 direct legs</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'Left',   value: leftLegPct,   setValue: setLeftLegPct },
                { label: 'Middle', value: middleLegPct, setValue: setMiddleLegPct },
                { label: 'Right',  value: rightLegPct,  setValue: setRightLegPct },
              ] as const).map(({ label, value, setValue }) => (
                <div key={label} className="rounded-lg border border-border/60 p-3 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">{label}</p>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full text-center text-xl font-bold text-purple-600 dark:text-purple-400 border-none bg-transparent focus:outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">% of pool</p>
                  <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                    ₹{(productMRP * Number(teamPct) / 100 * Number(value) / 100).toFixed(2)} / ₹{productMRP.toLocaleString('en-IN')} MRP
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Summary — always in edit mode, only after product selected in create mode */}
          {(isEdit || selectedProduct !== null) && (() => {
            const networkPool = productMRP * Number(networkPct) / 100;
            const teamPool    = productMRP * Number(teamPct) / 100;
            return (
              <>
                {/* Pool summary cards */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3">
                    <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase mb-1">
                      Network pool
                    </p>
                    <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                      ₹{networkPool.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                      {networkPct}% of ₹{productMRP.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
                    <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      Team pool
                    </p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">
                      ₹{teamPool.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-green-600/70 mt-0.5">
                      {teamPct}% of ₹{productMRP.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                      Company keeps
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ₹{(productMRP - networkPool - teamPool).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {(100 - Number(networkPct) - Number(teamPct)).toFixed(1)}% of MRP
                    </p>
                  </div>
                </div>

                {/* Network pool split by level */}
                <div className="rounded-lg border border-border/50 overflow-hidden mb-4">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Network pool ₹{networkPool.toFixed(2)} split by level
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {networkPct}% of ₹{productMRP.toLocaleString()} MRP
                    </p>
                  </div>
                  {levelPercentages.slice(0, levels).map((pct, i) => {
                    const amount = networkPool * pct / 100;
                    return (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 border-b border-border/40 last:border-0 text-sm">
                        <span
                          className="w-6 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: `hsl(${250 - i * 15}, 60%, ${40 + i * 5}%)` }}
                        >
                          L{i + 1}
                        </span>
                        <span className="flex-1 text-muted-foreground text-xs">
                          {i === 0 ? 'Direct parent' : `Level ${i + 1}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pct}% of ₹{networkPool.toFixed(0)}
                        </span>
                        <span className="font-semibold text-primary min-w-[60px] text-right">
                          ₹{amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Team pool split by leg */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { leg: 'Left',   pct: Number(leftLegPct),   color: 'text-green-600 dark:text-green-400' },
                    { leg: 'Middle', pct: Number(middleLegPct), color: 'text-teal-600 dark:text-teal-400'  },
                    { leg: 'Right',  pct: Number(rightLegPct),  color: 'text-blue-600 dark:text-blue-400'  },
                  ].map(({ leg, pct, color }) => {
                    const amount = teamPool * pct / 100;
                    return (
                      <div key={leg} className="rounded-lg border border-border/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{leg}</p>
                        <p className={`text-lg font-bold ${color}`}>₹{amount.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {pct}% of ₹{teamPool.toFixed(0)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {/* Use global defaults */}
          <button
            type="button"
            onClick={handleUseGlobalDefaults}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            ↺ Use global defaults
          </button>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
