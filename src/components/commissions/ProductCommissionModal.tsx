import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '@utils/cn';
import { commissionService } from '@/services/commissionService';
import { productService } from '@/services/productService';
import type { ProductCommissionRule, CommissionDirection, ProductPricing } from '@/types/commission.types';
import type { ProductListItem } from '@/types/product.types';

interface Props {
  rule:            ProductCommissionRule | null;
  initialProduct?: ProductListItem | null;
  onSave:          (r: ProductCommissionRule) => void;
  onClose:         () => void;
}

const LEVEL_COLORS = [
  '#3C3489','#534AB7','#6B63C9','#8078D4','#9A90DF',
  '#B3ABEA','#CCC7F2','#E0DCFA','#EEEDFE','#F5F4FF',
];

export function ProductCommissionModal({ rule, initialProduct = null, onSave, onClose }: Props) {
  const isEdit = rule !== null;

  // Product selection (create mode)
  const [productId,       setProductId]       = useState(rule?.product ?? initialProduct?.id ?? '');
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(initialProduct);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState<ProductListItem[]>([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [dropdownOpen,    setDropdownOpen]    = useState(false);

  // Pricing data from API
  const [pricing, setPricing] = useState<ProductPricing | null>(rule?.product_pricing ?? null);

  // Commission form state
  const [formData, setFormData] = useState({
    is_active:              rule?.is_active              ?? true,
    direction:              (rule?.direction             ?? 'direct_first') as CommissionDirection,
    max_upline_levels:      rule?.max_upline_levels      ?? 3,
    use_max_levels:         rule?.use_max_levels         ?? false,
    level_percentages:      rule?.level_percentages      ?? [40, 25, 15, 10, 5],
    network_commission_pct: rule?.network_commission_pct ?? '7.00',
    team_commission_pct:    rule?.team_commission_pct    ?? '3.00',
    social_work_pct:        rule?.social_work_pct        ?? '0.00',
    company_pct:            rule?.company_pct            ?? '0.00',
    left_leg_pct:           rule?.left_leg_pct           ?? '40.00',
    middle_leg_pct:         rule?.middle_leg_pct         ?? '30.00',
    right_leg_pct:          rule?.right_leg_pct          ?? '30.00',
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const searchRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setField = (key: string, val: unknown) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  // Pre-fill from global settings when creating
  useEffect(() => {
    commissionService.getSettings().then(r => {
      if (!isEdit) {
        const s = r.data;
        setFormData(prev => ({
          ...prev,
          direction:              s.direction,
          max_upline_levels:      s.max_upline_levels,
          level_percentages:      s.level_percentages.slice(0, s.max_upline_levels),
          network_commission_pct: s.network_commission_pct,
          team_commission_pct:    s.team_commission_pct,
          social_work_pct:        s.social_work_pct,
          company_pct:            s.company_pct,
          left_leg_pct:           s.left_leg_pct,
          middle_leg_pct:         s.middle_leg_pct,
          right_leg_pct:          s.right_leg_pct,
        }));
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced product search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setDropdownOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      productService.listProducts({ search: searchQuery.trim() })
        .then(r => { setSearchResults(r.data.results ?? []); setDropdownOpen(true); })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // Sync level_percentages length with max_upline_levels
  useEffect(() => {
    setFormData(prev => {
      const next = [...prev.level_percentages];
      while (next.length < prev.max_upline_levels) next.push(0);
      return { ...prev, level_percentages: next.slice(0, prev.max_upline_levels) };
    });
  }, [formData.max_upline_levels]);

  const handleSelectProduct = (p: ProductListItem) => {
    setSelectedProduct(p);
    setProductId(p.id);
    setSearchQuery(''); setDropdownOpen(false); setSearchResults([]);
    // pricing comes from commission rule API on rule fetch, not product API
  };

  const handleSave = async () => {
    if (!isEdit && !productId) { setError('Please select a product.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        is_active:              formData.is_active,
        direction:              formData.direction,
        max_upline_levels:      formData.max_upline_levels,
        use_max_levels:         formData.use_max_levels,
        level_percentages:      formData.level_percentages,
        network_commission_pct: formData.network_commission_pct,
        team_commission_pct:    formData.team_commission_pct,
        social_work_pct:        formData.social_work_pct,
        company_pct:            formData.company_pct,
        left_leg_pct:           formData.left_leg_pct,
        middle_leg_pct:         formData.middle_leg_pct,
        right_leg_pct:          formData.right_leg_pct,
        ...(!isEdit && { product: productId }),
      };
      const r = isEdit
        ? await commissionService.updateProductRule(rule.id, payload)
        : await commissionService.createProductRule(payload);
      onSave(r.data);
    } catch {
      setError('Failed to save rule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const upaProfit   = pricing?.upa_profit ?? 100;
  const networkPool = upaProfit * Number(formData.network_commission_pct) / 100;
  const teamPool    = upaProfit * Number(formData.team_commission_pct) / 100;
  const socialPool  = upaProfit * Number(formData.social_work_pct) / 100;
  const companyPool = upaProfit * Number(formData.company_pct) / 100;
  const totalPct    = Number(formData.network_commission_pct) + Number(formData.team_commission_pct)
                    + Number(formData.social_work_pct) + Number(formData.company_pct);
  const remaining   = upaProfit * (100 - totalPct) / 100;

  const displayPercentages = formData.direction === 'ancestor_first'
    ? [...formData.level_percentages].reverse()
    : formData.level_percentages;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-foreground">
              {isEdit ? `Edit Rule — ${rule.product_name}` : 'Add Product Rule'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? `${rule.max_upline_levels} levels · Commission based on UPA profit` : 'Set commission based on product profit'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Product search (create only) ────────────────────────────────── */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Product</label>
              {selectedProduct ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  </div>
                  <button onClick={() => { setSelectedProduct(null); setProductId(''); setPricing(null); }}
                    className="ml-2 rounded p-1 hover:bg-muted text-muted-foreground"><X size={14} /></button>
                </div>
              ) : (
                <div ref={searchRef} className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input type="text" value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setDropdownOpen(true)}
                      placeholder="Search by name or SKU…"
                      className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    {searchLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                  </div>
                  {dropdownOpen && searchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border bg-card shadow-lg max-h-52 overflow-y-auto">
                      {searchResults.map(p => (
                        <button key={p.id} onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors">
                          <span className="text-sm truncate">{p.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground flex-shrink-0">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 1 — Pricing Summary */}
          {pricing ? (
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">Pricing Summary</p>
              {([
                { label: 'Purchase price',   value: `₹${pricing.purchase_price.toLocaleString()}` },
                { label: 'Selling price (MRP)', value: `₹${pricing.selling_price.toLocaleString()}` },
                { label: 'Other charges',    value: `₹${pricing.other_charges.toLocaleString()}` },
              ] as const).map(r => (
                <div key={r.label} className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
              {pricing.gst_percentage > 0 && (
                <div className="flex justify-between text-xs py-1">
                  <span className="text-muted-foreground">GST ({pricing.gst_percentage}%)</span>
                  <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                    ₹{pricing.gst_amount.toLocaleString()} → govt
                  </span>
                </div>
              )}
              <div className="border-t border-border/40 mt-2 pt-2 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Regular profit</span>
                  <span className="font-semibold">₹{pricing.regular_profit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-muted-foreground">UPA profit</span>
                    <span className="ml-1.5 text-[9px] bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">Commission base</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">₹{pricing.upa_profit.toLocaleString()}</span>
                    <div className="text-[10px] text-primary/60 mt-0.5">
                      UPA pays ₹{pricing.upa_price.toLocaleString()} ({pricing.upa_discount_pct}% off ₹{pricing.selling_price.toLocaleString()} = −₹{pricing.upa_discount_amt.toLocaleString()})
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      (₹{pricing.upa_price.toLocaleString()} + ₹{pricing.other_charges}) − ₹{pricing.purchase_price.toLocaleString()} = ₹{pricing.upa_profit.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (isEdit || selectedProduct) ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠ Pricing not configured for this product. Commission will be based on MRP until pricing is set.
              </p>
            </div>
          ) : null}

          {/* SECTION 2 — Commission Pools */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Commission Pools</p>
              <p className="text-xs text-muted-foreground mt-0.5">from UPA profit ₹{upaProfit.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'network_commission_pct', title: '↑ Network',     desc: 'Goes UP the chain',   color: 'text-primary',                       bg: 'bg-primary/5 border-primary/20',           amount: networkPool },
                { key: 'team_commission_pct',    title: '↓ Team',        desc: 'Goes to direct legs', color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/5 border-green-500/20',       amount: teamPool },
                { key: 'social_work_pct',        title: '♥ Social Work', desc: 'Social fund',         color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/5 border-amber-500/20',       amount: socialPool },
                { key: 'company_pct',            title: '🏢 Company',    desc: 'Stays with company',  color: 'text-muted-foreground',               bg: 'bg-muted/40 border-border/50',             amount: companyPool },
              ].map(pool => (
                <div key={pool.key} className={cn('rounded-xl border p-3', pool.bg)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-2', pool.color)}>{pool.title}</p>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} step="0.01"
                      value={formData[pool.key as keyof typeof formData] as string}
                      onChange={e => setField(pool.key, e.target.value)}
                      className="w-14 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-sm text-muted-foreground">%</span>
                    <span className={cn('text-sm font-semibold', pool.color)}>= ₹{pool.amount.toFixed(0)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{pool.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining ({(100 - totalPct).toFixed(1)}% of profit)</span>
              <span className="font-semibold text-foreground">₹{remaining.toFixed(2)} stays with company</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div style={{ width: `${Math.max(0, Number(formData.network_commission_pct))}%` }} className="bg-primary transition-all" />
              <div style={{ width: `${Math.max(0, Number(formData.team_commission_pct))}%` }} className="bg-green-500 transition-all" />
              <div style={{ width: `${Math.max(0, Number(formData.social_work_pct))}%` }} className="bg-amber-500 transition-all" />
              <div style={{ width: `${Math.max(0, Number(formData.company_pct))}%` }} className="bg-gray-400 transition-all" />
              <div style={{ width: `${Math.max(0, 100 - totalPct)}%` }} className="bg-muted transition-all" />
            </div>
          </div>

          {/* SECTION 3 — Network Breakdown */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Network breakdown (₹{networkPool.toFixed(2)} up the chain)
            </p>

            {/* Direction toggle */}
            <div className="flex border border-border/60 rounded-lg overflow-hidden">
              <button onClick={() => setField('direction', 'direct_first')}
                className={cn('flex-1 h-9 text-xs font-medium transition-colors',
                  formData.direction === 'direct_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                ↓ Direct parent gets most
              </button>
              <button onClick={() => setField('direction', 'ancestor_first')}
                className={cn('flex-1 h-9 text-xs font-medium transition-colors border-l border-border/60',
                  formData.direction === 'ancestor_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                ↑ Top ancestor gets most
              </button>
            </div>

            {/* Max levels */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Max levels</label>
              <input type="number" min={1} max={10}
                value={formData.max_upline_levels}
                onChange={e => setField('max_upline_levels', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-16 h-8 rounded-lg border bg-background px-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {/* Level rows */}
            <div>
              {Array.from({ length: formData.max_upline_levels }, (_, i) => {
                const pct = displayPercentages[i] ?? 0;
                const amt = networkPool * pct / 100;
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
                      onChange={e => {
                        const newLevels = [...formData.level_percentages];
                        const idx = formData.direction === 'ancestor_first' ? formData.max_upline_levels - 1 - i : i;
                        newLevels[idx] = Number(e.target.value);
                        setField('level_percentages', newLevels);
                      }}
                      className="w-14 h-7 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className="text-xs font-semibold text-primary min-w-[60px] text-right">₹{amt.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4 — Team Breakdown */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Team breakdown (₹{teamPool.toFixed(2)} to direct legs)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { leg: 'Left',   key: 'left_leg_pct'   },
                { leg: 'Middle', key: 'middle_leg_pct' },
                { leg: 'Right',  key: 'right_leg_pct'  },
              ] as const).map(({ leg, key }) => {
                const pct = Number(formData[key]) || 0;
                const amt = teamPool * pct / 100;
                return (
                  <div key={leg} className="rounded-xl border border-border/50 p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{leg}</p>
                    <input type="number" min={0} max={100} step="0.01"
                      value={pct}
                      onChange={e => setField(key, e.target.value)}
                      className="w-full text-center text-xl font-bold text-green-600 dark:text-green-400 border-none bg-transparent focus:outline-none" />
                    <p className="text-[10px] text-muted-foreground">% of ₹{teamPool.toFixed(0)}</p>
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">= ₹{amt.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">💡 Vacant legs receive no commission. That amount stays with company.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Update commission rule' : 'Save commission rule'}
          </button>
        </div>
      </div>
    </div>
  );
}
