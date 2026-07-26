import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@utils/cn';
import { commissionService } from '@/services/commissionService';
import type {
  VariantCommissionRule,
  VariantCommissionStatus,
  ProductCommissionRule,
  CommissionDirection,
} from '@/types/commission.types';

interface Props {
  variantStatus: VariantCommissionStatus;
  existingRule:  VariantCommissionRule | null;
  productRule:   ProductCommissionRule;
  onSave:        (rule: VariantCommissionRule) => void;
  onClose:       () => void;
}

const LEVEL_COLORS = [
  '#3C3489','#534AB7','#6B63C9','#8078D4','#9A90DF',
  '#B3ABEA','#CCC7F2','#E0DCFA','#EEEDFE','#F5F4FF',
];

export function VariantCommissionModal({
  variantStatus, existingRule, productRule, onSave, onClose,
}: Props) {
  const isEdit = existingRule !== null;

  const defaultFrom = isEdit ? existingRule! : productRule;

  const [form, setForm] = useState({
    is_active:               defaultFrom.is_active,
    direction:               defaultFrom.direction as CommissionDirection,
    max_upline_levels:       defaultFrom.max_upline_levels,
    use_max_levels:          defaultFrom.use_max_levels,
    level_percentages:       [...defaultFrom.level_percentages],
    network_commission_pct:  defaultFrom.network_commission_pct,
    team_commission_pct:     defaultFrom.team_commission_pct,
    social_work_pct:         defaultFrom.social_work_pct,
    company_pct:             defaultFrom.company_pct,
    self_commission_enabled: defaultFrom.self_commission_enabled,
    self_commission_pct:     defaultFrom.self_commission_pct,
    delivery_packaging_pct:  defaultFrom.delivery_packaging_pct,
    left_leg_pct:            defaultFrom.left_leg_pct,
    middle_leg_pct:          defaultFrom.middle_leg_pct,
    right_leg_pct:           defaultFrom.right_leg_pct,
  });

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (key: string, val: unknown) => setForm(prev => ({ ...prev, [key]: val }));

  // Keep level_percentages length in sync with max_upline_levels
  useEffect(() => {
    setForm(prev => {
      const next = [...prev.level_percentages];
      while (next.length < prev.max_upline_levels) next.push(0);
      return { ...prev, level_percentages: next.slice(0, prev.max_upline_levels) };
    });
  }, [form.max_upline_levels]);

  // Derived amounts — use variant pricing if available, else fall back to ₹100 preview
  const pricing   = variantStatus.rule?.variant_pricing ?? existingRule?.variant_pricing ?? null;
  const upaProfit = pricing?.upa_profit ?? 100;

  const networkPool  = upaProfit * Number(form.network_commission_pct) / 100;
  const teamPool     = upaProfit * Number(form.team_commission_pct) / 100;
  const socialPool   = upaProfit * Number(form.social_work_pct) / 100;
  const companyPool  = upaProfit * Number(form.company_pct) / 100;
  const selfPool     = form.self_commission_enabled ? upaProfit * Number(form.self_commission_pct) / 100 : 0;
  const deliveryPool = upaProfit * Number(form.delivery_packaging_pct) / 100;
  const totalPct     = Number(form.network_commission_pct) + Number(form.team_commission_pct)
                     + Number(form.social_work_pct) + Number(form.company_pct)
                     + (form.self_commission_enabled ? Number(form.self_commission_pct) : 0)
                     + Number(form.delivery_packaging_pct);
  const remaining = upaProfit - networkPool - teamPool - socialPool - companyPool - selfPool - deliveryPool;

  const displayPercentages = form.direction === 'ancestor_first'
    ? [...form.level_percentages].reverse()
    : form.level_percentages;

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        variant:                 variantStatus.variant_id,
        is_active:               form.is_active,
        direction:               form.direction,
        max_upline_levels:       form.max_upline_levels,
        use_max_levels:          form.use_max_levels,
        level_percentages:       form.level_percentages,
        network_commission_pct:  form.network_commission_pct,
        team_commission_pct:     form.team_commission_pct,
        social_work_pct:         form.social_work_pct,
        company_pct:             form.company_pct,
        self_commission_enabled: form.self_commission_enabled,
        self_commission_pct:     form.self_commission_pct,
        delivery_packaging_pct:  form.delivery_packaging_pct,
        left_leg_pct:            form.left_leg_pct,
        middle_leg_pct:          form.middle_leg_pct,
        right_leg_pct:           form.right_leg_pct,
      };
      const r = isEdit
        ? await commissionService.updateVariantRule(existingRule!.id, payload)
        : await commissionService.createVariantRule(payload);
      onSave(r.data);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border bg-card shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                Variant Override
              </span>
              <h3 className="font-semibold text-foreground text-sm">
                {isEdit ? 'Edit Override' : 'Set Override'} — {variantStatus.variant_name}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              SKU: {variantStatus.variant_sku} · MRP ₹{Number(variantStatus.variant_mrp).toLocaleString()}
              {variantStatus.variant_profit !== null && (
                <span className="ml-1.5 text-primary font-medium">
                  · Profit ≈ ₹{variantStatus.variant_profit.toLocaleString()}
                </span>
              )}
            </p>
            {!isEdit && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Pre-filled from product rule. Adjust as needed.
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Override active</p>
              <p className="text-xs text-muted-foreground">Disable to fall back to product rule</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                form.is_active ? 'bg-primary' : 'bg-muted-foreground/30',
              )}>
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                form.is_active ? 'translate-x-4' : 'translate-x-0.5',
              )} />
            </button>
          </div>

          {/* Pricing reference */}
          {pricing ? (
            <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-3">
                Variant Pricing Reference
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  { label: 'Purchase price', value: `₹${pricing.purchase_price.toLocaleString()}` },
                  { label: 'MRP (selling)',   value: `₹${pricing.selling_price.toLocaleString()}` },
                  { label: 'UPA price',       value: `₹${pricing.upa_price.toLocaleString()}` },
                  { label: 'Other charges',   value: `₹${pricing.other_charges.toLocaleString()}` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs col-span-1">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 mt-2 pt-2 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  UPA profit <span className="text-[9px] bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold ml-1">Commission base</span>
                </span>
                <span className="text-sm font-bold text-primary">₹{pricing.upa_profit.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-500/10 border border-amber-400/40 px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠ Variant pricing not configured. Commission amounts shown as preview (₹100 base).
              </p>
            </div>
          )}

          {/* Commission pools */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Commission Pools</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                % of UPA profit ₹{upaProfit.toLocaleString()}{!pricing && ' (preview)'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'network_commission_pct', title: '↑ Network',     color: 'text-primary',                       bg: 'bg-primary/5 border-primary/20',         amt: networkPool },
                { key: 'team_commission_pct',    title: '↓ Team',        color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/5 border-green-500/20',     amt: teamPool },
                { key: 'social_work_pct',        title: '♥ Social',      color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/5 border-amber-500/20',     amt: socialPool },
                { key: 'company_pct',            title: '🏢 Company',    color: 'text-muted-foreground',               bg: 'bg-muted/40 border-border/50',           amt: companyPool },
                { key: 'delivery_packaging_pct', title: '📦 Delivery',   color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/5 border-blue-500/20',       amt: deliveryPool },
              ].map(pool => (
                <div key={pool.key} className={cn('rounded-xl border p-3', pool.bg)}>
                  <p className={cn('text-[10px] font-bold uppercase tracking-wide mb-1.5', pool.color)}>
                    {pool.title}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min={0} max={100} step="0.01"
                      value={form[pool.key as keyof typeof form] as string}
                      onChange={e => set(pool.key, e.target.value)}
                      className="w-20 h-7 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className={cn('text-xs font-semibold', pool.color)}>₹{pool.amt.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              {/* Self Commission */}
              <div className={cn('rounded-xl border p-3',
                form.self_commission_enabled ? 'bg-purple-500/5 border-purple-500/20' : 'bg-muted/30 border-border/40 opacity-70')}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600 dark:text-purple-400">
                    ✦ Self
                  </p>
                  <button type="button"
                    onClick={() => set('self_commission_enabled', !form.self_commission_enabled)}
                    className={cn('relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
                      form.self_commission_enabled ? 'bg-purple-600' : 'bg-muted-foreground/30')}>
                    <span className={cn('inline-block h-3 w-3 rounded-full bg-white transition-transform',
                      form.self_commission_enabled ? 'translate-x-3.5' : 'translate-x-0.5')} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} max={100} step="0.01"
                    value={form.self_commission_pct}
                    onChange={e => set('self_commission_pct', e.target.value)}
                    disabled={!form.self_commission_enabled}
                    className="w-20 h-7 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-50" />
                  <span className="text-xs text-muted-foreground">%</span>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">₹{selfPool.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining ({(100 - totalPct).toFixed(1)}%)</span>
              <span className="font-semibold">₹{remaining.toFixed(2)} stays with company</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              <div style={{ width: `${Math.max(0, Number(form.network_commission_pct))}%` }} className="bg-primary transition-all" />
              <div style={{ width: `${Math.max(0, Number(form.team_commission_pct))}%` }} className="bg-green-500 transition-all" />
              <div style={{ width: `${Math.max(0, Number(form.social_work_pct))}%` }} className="bg-amber-500 transition-all" />
              <div style={{ width: `${Math.max(0, Number(form.company_pct))}%` }} className="bg-gray-400 transition-all" />
              <div style={{ width: `${Math.max(0, Number(form.delivery_packaging_pct))}%` }} className="bg-blue-500 transition-all" />
              <div style={{ width: `${Math.max(0, form.self_commission_enabled ? Number(form.self_commission_pct) : 0)}%` }} className="bg-purple-500 transition-all" />
              <div style={{ width: `${Math.max(0, 100 - totalPct)}%` }} className="bg-muted transition-all" />
            </div>
          </div>

          {/* Network level split */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Network Split (₹{networkPool.toFixed(2)} up the chain)
            </p>
            <div className="flex border border-border/60 rounded-lg overflow-hidden">
              <button onClick={() => set('direction', 'direct_first')}
                className={cn('flex-1 h-8 text-xs font-medium transition-colors',
                  form.direction === 'direct_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                ↓ Direct parent gets most
              </button>
              <button onClick={() => set('direction', 'ancestor_first')}
                className={cn('flex-1 h-8 text-xs font-medium border-l border-border/60 transition-colors',
                  form.direction === 'ancestor_first' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                ↑ Top ancestor gets most
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Max levels</label>
              <input type="number" min={1} max={10}
                value={form.max_upline_levels}
                onChange={e => set('max_upline_levels', Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-20 h-7 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              {Array.from({ length: form.max_upline_levels }, (_, i) => {
                const pct = displayPercentages[i] ?? 0;
                const amt = networkPool * pct / 100;
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
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
                        const newLevels = [...form.level_percentages];
                        const idx = form.direction === 'ancestor_first' ? form.max_upline_levels - 1 - i : i;
                        newLevels[idx] = Number(e.target.value);
                        set('level_percentages', newLevels);
                      }}
                      className="w-16 h-6 rounded-lg border bg-background px-2 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-muted-foreground">%</span>
                    <span className="text-xs font-semibold text-primary w-14 text-right">₹{amt.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team leg split */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Team Split (₹{teamPool.toFixed(2)} to direct legs)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { leg: 'Left',   key: 'left_leg_pct'   },
                { leg: 'Middle', key: 'middle_leg_pct' },
                { leg: 'Right',  key: 'right_leg_pct'  },
              ] as const).map(({ leg, key }) => {
                const pct = Number(form[key]) || 0;
                const amt = teamPool * pct / 100;
                return (
                  <div key={leg} className="rounded-xl border border-border/50 p-2 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{leg}</p>
                    <input type="number" min={0} max={100} step="0.01"
                      value={pct}
                      onChange={e => set(key, e.target.value)}
                      className="w-full text-center text-lg font-bold text-green-600 dark:text-green-400 border-none bg-transparent focus:outline-none" />
                    <p className="text-[10px] text-muted-foreground">% → ₹{amt.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Update variant override' : 'Create variant override'}
          </button>
        </div>
      </div>
    </div>
  );
}
