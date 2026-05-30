import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@utils/cn';
import { commissionService } from '@/services/commissionService';
import type { ProductCommissionRule } from '@/types/commission.types';

interface Props {
  rule:    ProductCommissionRule | null;  // null = create mode
  onSave:  (r: ProductCommissionRule) => void;
  onClose: () => void;
}

export function ProductCommissionModal({ rule, onSave, onClose }: Props) {
  const isEdit = rule !== null;

  const [productId,        setProductId]        = useState(rule?.product ?? '');
  const [isEnabled,        setIsEnabled]        = useState(rule?.is_enabled ?? true);
  const [direction,        setDirection]        = useState<'upline' | 'downline'>(rule?.direction ?? 'upline');
  const [levels,           setLevels]           = useState(rule?.levels ?? 3);
  const [levelPercentages, setLevelPercentages] = useState<number[]>(
    rule?.level_percentages ?? Array(3).fill(0),
  );
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Keep levelPercentages array in sync with levels count
  useEffect(() => {
    setLevelPercentages((prev) => {
      const next = [...prev];
      while (next.length < levels) next.push(0);
      return next.slice(0, levels);
    });
  }, [levels]);

  const handleUseGlobalDefaults = async () => {
    try {
      const r = await commissionService.getSettings();
      const s = r.data;
      setDirection(s.direction);
      setLevels(s.levels);
      setLevelPercentages(s.level_percentages.slice(0, s.levels));
    } catch {
      setError('Failed to fetch global settings');
    }
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const payload: Partial<ProductCommissionRule> = {
        is_enabled:        isEnabled,
        direction,
        levels,
        level_percentages: levelPercentages,
      };
      if (!isEdit) payload.product = productId.trim();

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
      setError('Failed to save rule. Please check the product ID and try again.');
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
          <h3 className="font-semibold text-foreground">
            {isEdit ? `Edit Rule — ${rule.product_name}` : 'Add Product Rule'}
          </h3>
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

          {/* Product ID (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Product ID (UUID)
              </label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Enter product UUID"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
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
              {(['upline', 'downline'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors',
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
                  <span className="w-28 text-xs text-muted-foreground">
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
          </div>

          {/* Use global defaults */}
          <button
            type="button"
            onClick={handleUseGlobalDefaults}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Use global defaults
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
