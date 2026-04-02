import { useState, useEffect } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { tenderService } from '@/services/tenderService';
import { cn } from '@utils/cn';
import type { VendorTender, TenderItem } from '@/types/tender.types';

// ── Types ───────────────────────────────────────────────────────────────────────

interface BidItemForm {
  tender_item: string;
  supply_quantity: string;
  price_per_unit: string;
  dispatch_date: string;
  monthly_breakdown: { month: string; quantity: string }[];
  notes: string;
}

interface Props {
  open: boolean;
  tender: VendorTender | null;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VendorBidSheet({ open, tender, onClose, onSuccess }: Props) {
  const isUpdate = Boolean(tender?.own_bid);
  const [items, setItems] = useState<BidItemForm[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Initialise / reset form whenever the tender changes
  useEffect(() => {
    if (!tender) {
      setItems([]);
      setOverallNotes('');
      setError('');
      return;
    }

    const existingBid = tender.own_bid;
    setOverallNotes(existingBid?.overall_notes ?? '');

    setItems(
      tender.items.map((tItem: TenderItem) => {
        const existingItem = existingBid?.items.find(
          (bi) => bi.tender_item === tItem.id,
        );
        return {
          tender_item:      tItem.id,
          supply_quantity:  existingItem
            ? String(existingItem.supply_quantity)
            : String(tItem.required_quantity),
          price_per_unit:   existingItem ? String(existingItem.price_per_unit) : '',
          dispatch_date:    existingItem?.dispatch_date ?? '',
          monthly_breakdown: existingItem?.monthly_breakdown.map((b) => ({
            month:    b.month,
            quantity: String(b.quantity),
          })) ?? [],
          notes: existingItem?.notes ?? '',
        };
      }),
    );
    setError('');
  }, [tender]);

  // ── Item field helpers ─────────────────────────────────────────────────

  const updateItem = (idx: number, field: keyof BidItemForm, value: unknown) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );

  const addBreakdown = (idx: number) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, monthly_breakdown: [...it.monthly_breakdown, { month: '', quantity: '' }] }
          : it,
      ),
    );

  const removeBreakdown = (itemIdx: number, bIdx: number) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIdx
          ? { ...it, monthly_breakdown: it.monthly_breakdown.filter((_, j) => j !== bIdx) }
          : it,
      ),
    );

  const updateBreakdown = (
    itemIdx: number,
    bIdx: number,
    field: 'month' | 'quantity',
    val: string,
  ) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIdx
          ? {
              ...it,
              monthly_breakdown: it.monthly_breakdown.map((b, j) =>
                j === bIdx ? { ...b, [field]: val } : b,
              ),
            }
          : it,
      ),
    );

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!tender) return;
    setError('');

    for (const item of items) {
      const qty = Number(item.supply_quantity);
      if (!item.supply_quantity || qty < 1) {
        setError('Supply quantity is required and must be ≥ 1 for all products.');
        return;
      }
      if (!item.price_per_unit) {
        setError('Price per unit is required for all products.');
        return;
      }
      if (!item.dispatch_date) {
        setError('Dispatch date is required for all products.');
        return;
      }
      if (item.monthly_breakdown.length > 0) {
        const allocated = item.monthly_breakdown.reduce(
          (s, b) => s + (Number(b.quantity) || 0),
          0,
        );
        if (allocated !== qty) {
          setError(
            `Monthly breakdown total (${allocated}) must equal supply quantity (${qty}).`,
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        overall_notes: overallNotes,
        items: items.map((it) => ({
          tender_item:       it.tender_item,
          supply_quantity:   Number(it.supply_quantity),
          price_per_unit:    it.price_per_unit,
          dispatch_date:     it.dispatch_date,
          monthly_breakdown: it.monthly_breakdown.map((b) => ({
            month:    b.month,
            quantity: Number(b.quantity),
          })),
          notes: it.notes,
        })),
      };

      if (isUpdate) {
        await tenderService.updateBid(tender.id, payload);
      } else {
        await tenderService.submitBid(tender.id, payload);
      }
      onSuccess();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const d = err?.response?.data;
      const msg = d ? Object.values(d).flat().join(' ') : 'Something went wrong.';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !tender) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[580px] flex-col bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-semibold">
              {isUpdate ? 'Update Bid' : 'Submit Bid'}
            </h2>
            <p className="text-sm text-muted-foreground">{tender.tender_number}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Tender info */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-medium">{tender.title}</p>
            {tender.description && (
              <p className="mt-1 text-sm text-muted-foreground">{tender.description}</p>
            )}
            {tender.bidding_deadline && (
              <p className="mt-1 text-xs text-muted-foreground">
                Bidding deadline: {formatDate(tender.bidding_deadline)}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Per-product bid forms */}
          {items.map((form, idx) => {
            const tItem = tender.items[idx];
            const qty = Number(form.supply_quantity) || 0;
            const allocated = form.monthly_breakdown.reduce(
              (s, b) => s + (Number(b.quantity) || 0),
              0,
            );

            return (
              <div key={form.tender_item} className="rounded-xl border bg-card p-4 space-y-4">
                {/* Product header */}
                <div className="flex items-start gap-3">
                  {tItem.product_image && (
                    <img
                      src={tItem.product_image}
                      alt=""
                      className="h-10 w-10 rounded-md border object-cover shrink-0"
                    />
                  )}
                  <div>
                    <p className="font-medium text-sm">{tItem.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Required: {tItem.required_quantity.toLocaleString()} units
                      {tItem.target_price && ` \u00b7 Target: \u20b9${tItem.target_price}/unit`}
                    </p>
                  </div>
                </div>

                {/* Main bid fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Supply Qty *</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.supply_quantity}
                      onChange={(e) => updateItem(idx, 'supply_quantity', e.target.value)}
                      placeholder={String(tItem.required_quantity)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Price / Unit (\u20b9) *</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price_per_unit}
                      onChange={(e) => updateItem(idx, 'price_per_unit', e.target.value)}
                      placeholder="e.g. 450"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium">Dispatch Date *</label>
                    <Input
                      type="date"
                      value={form.dispatch_date}
                      onChange={(e) => updateItem(idx, 'dispatch_date', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Monthly breakdown */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium">
                      Monthly Breakdown{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addBreakdown(idx)}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Add Month
                    </button>
                  </div>

                  {form.monthly_breakdown.map((b, bIdx) => (
                    <div key={bIdx} className="mb-2 flex items-center gap-2">
                      <Input
                        type="month"
                        value={b.month}
                        onChange={(e) => updateBreakdown(idx, bIdx, 'month', e.target.value)}
                        className="flex-1 text-xs"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={b.quantity}
                        onChange={(e) => updateBreakdown(idx, bIdx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-20 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeBreakdown(idx, bIdx)}
                        className="text-destructive hover:text-destructive/70"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {form.monthly_breakdown.length > 0 && qty > 0 && (
                    <p
                      className={cn(
                        'text-xs',
                        allocated === qty
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {allocated} of {qty} units allocated
                    </p>
                  )}
                </div>

                {/* Item notes */}
                <div>
                  <label className="mb-1 block text-xs font-medium">Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                    placeholder="Any notes for this product\u2026"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            );
          })}

          {/* Overall notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Overall Bid Notes{' '}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Any overall notes for this bid\u2026"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUpdate ? 'Updating\u2026' : 'Submitting\u2026'}
              </>
            ) : (
              isUpdate ? 'Update Bid' : 'Submit Bid'
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
