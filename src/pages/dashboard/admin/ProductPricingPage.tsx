import { useState, useEffect, useCallback } from 'react';
import { Search, X, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { productService } from '@/services/productService';
import type { ProductListItem, Product, ProductVariant } from '@/types/product.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

// ── Pricing Modal (Sheet from right) ─────────────────────────────────────────

interface PricingFormData {
  purchase_price:    string;
  gst_percentage:    string;
  other_charges:     string;
  other_charges_type: 'flat' | 'percent';
  upa_discount:      string;
}

type VariantPriceEntry = { purchase_price?: string; selling_price?: string };

function PricingModal({
  product,
  onClose,
  onSaved,
}: {
  product:  ProductListItem;
  onClose:  () => void;
  onSaved:  (updated: Product) => void;
}) {
  const [form, setForm] = useState<PricingFormData>({
    purchase_price:     product.purchase_price ?? '',
    gst_percentage:     '0',
    other_charges:      '0',
    other_charges_type: 'flat',
    upa_discount:       '0',
  });

  const [hasGst,          setHasGst]          = useState(false);
  const [hasOtherCharges, setHasOtherCharges] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [variants,        setVariants]        = useState<ProductVariant[]>([]);
  const [variantPrices,   setVariantPrices]   = useState<Record<string, VariantPriceEntry>>({});

  // Always fetch full product detail to get variants + pre-fill existing pricing
  useEffect(() => {
    productService.getProduct(product.slug).then((r) => {
      const p = r.data;
      setForm({
        purchase_price:     p.purchase_price ?? '',
        gst_percentage:     p.gst_percentage ?? '0',
        other_charges:      p.other_charges ?? '0',
        other_charges_type: p.other_charges_type ?? 'flat',
        upa_discount:       p.upa_discount_override ?? '0',
      });
      setHasGst(parseFloat(p.gst_percentage ?? '0') > 0);
      setHasOtherCharges(parseFloat(p.other_charges ?? '0') > 0);
      setVariants(p.variants ?? []);
      const prices: Record<string, VariantPriceEntry> = {};
      p.variants?.forEach((v) => {
        prices[v.id] = {
          purchase_price: v.purchase_price ? String(v.purchase_price) : '',
          selling_price:  v.mrp ? String(v.mrp) : '',
        };
      });
      setVariantPrices(prices);
    }).catch(() => {});
  }, [product.slug]);

  const set = (field: keyof PricingFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setVariantField = (id: string, field: keyof VariantPriceEntry, value: string) =>
    setVariantPrices((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  // ── Shared derived values ────────────────────────────────────────────────────
  const gstPct       = hasGst ? (Number(form.gst_percentage) || 0) : 0;
  const otherRaw     = hasOtherCharges ? (Number(form.other_charges) || 0) : 0;
  const upaDiscount  = Number(form.upa_discount) || 0;

  const variantPricesPayload = Object.entries(variantPrices)
    .map(([id, vp]) => ({
      id,
      ...(vp.purchase_price && Number(vp.purchase_price) > 0 && { purchase_price: Number(vp.purchase_price) }),
      ...(vp.selling_price  && Number(vp.selling_price)  > 0 && { selling_price:  Number(vp.selling_price)  }),
    }))
    .filter((vp) => vp.purchase_price !== undefined || vp.selling_price !== undefined);

  const handleSave = async () => {
    const hasProductPrice = form.purchase_price && Number(form.purchase_price) > 0;
    const hasVariantData  = variantPricesPayload.length > 0;
    if (!hasProductPrice && !hasVariantData) {
      setError('Set a purchase price for the product or at least one variant.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const r = await productService.setPricing(product.slug, {
        purchase_price:        hasProductPrice ? Number(form.purchase_price) : undefined,
        gst_percentage:        hasGst ? (Number(form.gst_percentage) || 0) : 0,
        other_charges:         hasOtherCharges ? (Number(form.other_charges) || 0) : 0,
        other_charges_type:    form.other_charges_type,
        upa_discount_override: upaDiscount,
        variant_prices:        variantPricesPayload,
      });
      onSaved(r.data);
    } catch {
      setError('Failed to save pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Set Pricing</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[280px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">

          {/* ── CHARGES ──────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Charges & Discount</p>

            {/* GST toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasGst} onChange={(e) => setHasGst(e.target.checked)}
                  className="h-4 w-4 rounded accent-purple-600" />
                <span className="text-sm font-medium text-foreground">This product has GST</span>
              </label>
              {hasGst && (
                <div className="ml-6 space-y-1.5">
                  <div className="relative">
                    <input type="number" min={0} max={100} step="0.01" value={form.gst_percentage}
                      onChange={(e) => set('gst_percentage', e.target.value)} placeholder="0"
                      className="w-full rounded-lg border bg-background pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Charged to customer — goes to government. Not included in profit.</p>
                </div>
              )}
            </div>

            {/* Other charges toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={hasOtherCharges} onChange={(e) => setHasOtherCharges(e.target.checked)}
                  className="h-4 w-4 rounded accent-purple-600" />
                <span className="text-sm font-medium text-foreground">Add other charges (shipping/packaging)</span>
              </label>
              {hasOtherCharges && (
                <div className="ml-6 space-y-2">
                  <div className="flex gap-2">
                    {(['flat', 'percent'] as const).map((t) => (
                      <button key={t} onClick={() => set('other_charges_type', t)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                          form.other_charges_type === t
                            ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}>
                        {t === 'flat' ? 'Flat amount' : 'Percentage'}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {form.other_charges_type === 'flat' ? '₹' : '%'}
                    </span>
                    <input type="number" min={0} step="0.01" value={form.other_charges}
                      onChange={(e) => set('other_charges', e.target.value)} placeholder="0.00"
                      className="w-full rounded-lg border bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Company keeps this — included in profit</p>
                </div>
              )}
            </div>

            {/* UPA Discount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">UPA Discount %</label>
              <p className="text-[11px] text-muted-foreground">Discount given to UPA users on selling price</p>
              <div className="flex items-center gap-2">
                <div className="relative w-28">
                  <input type="number" min={0} max={100} step="0.01" value={form.upa_discount}
                    onChange={(e) => set('upa_discount', e.target.value)} placeholder="e.g. 10"
                    className="w-full h-9 rounded-lg border bg-background pl-3 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <span className="text-xs text-muted-foreground">off selling price</span>
              </div>
            </div>
          </div>

          {/* ── VARIANT PRICING ──────────────────────────────────────────── */}
          {variants.length > 0 ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Variant Pricing</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set purchase &amp; selling price per variant. GST and other charges apply from above.
                </p>
              </div>
              <div className="space-y-3">
                {variants.map((variant) => {
                  const vp       = variantPrices[variant.id] ?? {};
                  const selling  = Number(vp.selling_price)  || 0;
                  const purchase = Number(vp.purchase_price) || 0;
                  const upaDisc  = upaDiscount;

                  const otherAmt     = form.other_charges_type === 'flat'
                    ? (hasOtherCharges ? otherRaw : 0)
                    : selling * (hasOtherCharges ? otherRaw : 0) / 100;
                  const upaPrice     = selling * (1 - upaDisc / 100);
                  const upaOther     = form.other_charges_type === 'flat'
                    ? (hasOtherCharges ? otherRaw : 0)
                    : upaPrice * (hasOtherCharges ? otherRaw : 0) / 100;
                  const gstOnSelling = hasGst ? selling   * gstPct / 100 : 0;
                  const gstOnUpa     = hasGst ? upaPrice  * gstPct / 100 : 0;
                  const profit       = (selling  + otherAmt) - purchase;
                  const upaProfit    = (upaPrice + upaOther) - purchase;
                  const regularPays  = selling  + otherAmt + gstOnSelling;
                  const upaPays      = upaPrice + upaOther + gstOnUpa;

                  return (
                    <div key={variant.id} className="rounded-xl border border-border/60 overflow-hidden">
                      {/* Variant header */}
                      <div className="flex items-start justify-between px-4 pt-4 pb-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{variant.name}</p>
                          <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          {purchase > 0 && selling > 0 && (
                            <>
                              <span className={cn(
                                'text-xs font-semibold px-2.5 py-1 rounded-full',
                                profit >= 0
                                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                                  : 'bg-red-500/10 text-red-500'
                              )}>
                                Profit ₹{Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </span>
                              {upaDisc > 0 && (
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">
                                  UPA profit ₹{upaProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Two-column inputs */}
                      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Purchase price *</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                            <input type="number" min={0} step="0.01"
                              value={vp.purchase_price ?? ''}
                              onChange={(e) => setVariantField(variant.id, 'purchase_price', e.target.value)}
                              placeholder="e.g. 40000"
                              className="w-full h-8 rounded-lg border bg-background pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Selling price (MRP) *</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                            <input type="number" min={0} step="0.01"
                              value={vp.selling_price ?? ''}
                              onChange={(e) => setVariantField(variant.id, 'selling_price', e.target.value)}
                              placeholder="e.g. 50000"
                              className="w-full h-8 rounded-lg border bg-background pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          </div>
                        </div>
                      </div>

                      {/* Dual breakup boxes */}
                      {(purchase > 0 || selling > 0) && (
                        <div className="grid grid-cols-2 gap-2 px-4 pb-4">

                          {/* Regular Customer */}
                          <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                              👤 Regular
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Selling</span>
                                <span className="font-medium">₹{selling.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                              </div>
                              {otherAmt > 0 && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">+ Other</span>
                                  <span className="font-medium">₹{otherAmt.toFixed(0)}</span>
                                </div>
                              )}
                              {hasGst && gstPct > 0 && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">+ GST {gstPct}%</span>
                                  <span className="font-medium">₹{gstOnSelling.toFixed(0)}</span>
                                </div>
                              )}
                              <div className="border-t border-border/40 pt-1 flex justify-between text-xs font-bold">
                                <span>Pays</span>
                                <span>₹{regularPays.toFixed(0)}</span>
                              </div>
                              <div className="border-t border-border/40 pt-1 flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Profit</span>
                                <span className={cn('font-bold', profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                                  ₹{profit.toFixed(0)}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground bg-background/60 rounded px-1.5 py-1 leading-relaxed">
                                (₹{selling.toFixed(0)} + ₹{otherAmt.toFixed(0)}) − ₹{purchase.toFixed(0)}
                              </div>
                            </div>
                          </div>

                          {/* UPA Customer */}
                          <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-purple-600/70 dark:text-purple-400/70 mb-2">
                              ⭐ UPA
                            </p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-purple-600/60 dark:text-purple-400/60">
                                  {upaDisc > 0 ? `UPA (${upaDisc}% off)` : 'UPA price'}
                                </span>
                                <span className="font-medium text-purple-600 dark:text-purple-400">
                                  ₹{upaPrice.toFixed(0)}
                                </span>
                              </div>
                              {upaOther > 0 && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-purple-600/60 dark:text-purple-400/60">+ Other</span>
                                  <span className="font-medium text-purple-600 dark:text-purple-400">₹{upaOther.toFixed(0)}</span>
                                </div>
                              )}
                              {hasGst && gstPct > 0 && (
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-purple-600/60 dark:text-purple-400/60">+ GST {gstPct}%</span>
                                  <span className="font-medium text-purple-600 dark:text-purple-400">₹{gstOnUpa.toFixed(0)}</span>
                                </div>
                              )}
                              <div className="border-t border-purple-500/20 pt-1 flex justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                                <span>Pays</span>
                                <span>₹{upaPays.toFixed(0)}</span>
                              </div>
                              <div className="border-t border-purple-500/20 pt-1 flex justify-between text-[11px]">
                                <span className="text-purple-600/60 dark:text-purple-400/60">Profit</span>
                                <span className={cn('font-bold', upaProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
                                  ₹{upaProfit.toFixed(0)}
                                </span>
                              </div>
                              <div className="text-[10px] text-purple-600/50 dark:text-purple-400/50 bg-purple-500/5 rounded px-1.5 py-1 leading-relaxed">
                                (₹{upaPrice.toFixed(0)} + ₹{upaOther.toFixed(0)}) − ₹{purchase.toFixed(0)}
                              </div>
                              {upaDisc === 0 ? (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  No UPA discount set — same as regular price
                                </div>
                              ) : (
                                <span className="inline-block text-[9px] bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-semibold mt-1">
                                  ✓ Commission from this profit
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── PRODUCT-LEVEL PRICING (no variants) ─────────────────────── */
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Purchase price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input type="number" min={0} step="0.01" value={form.purchase_price}
                    onChange={(e) => set('purchase_price', e.target.value)} placeholder="0.00"
                    className="w-full rounded-lg border bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
                <p className="text-[11px] text-muted-foreground">What the company pays to procure this product</p>
              </div>
            </div>
          )}

          {/* ── PROFIT PREVIEW (product-level only, when no variants) ─────── */}
          {variants.length === 0 && (() => {
            const sellingPrice = Number(product.mrp) || 0;
            const purchasePrice = Number(form.purchase_price) || 0;
            const otherCharges  = form.other_charges_type === 'flat'
              ? (hasOtherCharges ? otherRaw : 0)
              : sellingPrice * (hasOtherCharges ? otherRaw : 0) / 100;
            const gstAmount   = sellingPrice * gstPct / 100;
            const grossRevenue = sellingPrice + otherCharges;
            const netProfit   = grossRevenue - purchasePrice;
            const customerPays = sellingPrice + gstAmount + otherCharges;
            return (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profit Calculation</p>
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling price</span>
                    <span>₹{fmt(sellingPrice)}</span>
                  </div>
                  {otherCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Other charges</span>
                      <span>₹{fmt(otherCharges)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">Gross revenue</span>
                    <span>₹{fmt(grossRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">− Purchase price</span>
                    <span>₹{fmt(purchasePrice)}</span>
                  </div>
                  <div className={`flex justify-between border-t border-border/50 pt-2 font-semibold text-base ${
                    netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    <span>NET PROFIT</span>
                    <span>₹{fmt(netProfit)}</span>
                  </div>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm font-mono">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground font-sans mb-3">Customer pays</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selling price</span>
                    <span>₹{fmt(sellingPrice)}</span>
                  </div>
                  {gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ GST ({gstPct}%)</span>
                      <span>₹{fmt(gstAmount)}</span>
                    </div>
                  )}
                  {otherCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">+ Other charges</span>
                      <span>₹{fmt(otherCharges)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/50 pt-2 font-semibold">
                    <span>Total</span>
                    <span>₹{fmt(customerPays)}</span>
                  </div>
                </div>
                {hasGst && gstAmount > 0 && (
                  <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
                    GST of ₹{fmt(gstAmount)} is collected from the customer but paid to the government. Not part of profit.
                  </div>
                )}
              </div>
            );
          })()}

          {error && (
            <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-5 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save pricing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PricingFilter = '' | 'configured' | 'pending';

export function ProductPricingPage() {
  const [products,     setProducts]     = useState<ProductListItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [next,         setNext]         = useState<string | null>(null);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState<PricingFilter>('');
  const [pricingTarget, setPricingTarget] = useState<ProductListItem | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchProducts = useCallback(async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const r = await productService.listProducts({ page: pg });
      setProducts((prev) => reset ? r.data.results : [...prev, ...r.data.results]);
      setNext(r.data.next);
      setPage(pg);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchProducts(1, true); }, [fetchProducts]);

  const handleSaved = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              pricing_configured: updated.pricing_configured,
              purchase_price:     updated.purchase_price,
              profit_amount:      updated.profit_amount,
            }
          : p,
      ),
    );
    setPricingTarget(null);
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === '' ? true :
      filter === 'configured' ? p.pricing_configured :
      !p.pricing_configured;
    return matchSearch && matchFilter;
  });

  const total      = products.length;
  const configured = products.filter((p) => p.pricing_configured).length;
  const pending    = total - configured;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:px-6">
          <button
            className="rounded-md p-1.5 hover:bg-muted md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Product Pricing</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Set purchase price, GST and charges for each product
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total products',      value: total,      icon: DollarSign,    color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-500/10' },
              { label: 'Pricing configured',  value: configured, icon: CheckCircle2,  color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-500/10'  },
              { label: 'Pricing pending',     value: pending,    icon: Clock,         color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/10'  },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter toolbar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as PricingFilter)}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">All status</option>
              <option value="configured">Configured</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">SKU</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">MRP</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Purchase</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Profit</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No products found.
                      </td>
                    </tr>
                  ) : filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.primary_image ? (
                            <img src={p.primary_image} alt="" className="h-9 w-9 rounded-lg object-cover border shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg border bg-muted/50 flex items-center justify-center shrink-0">
                              <DollarSign size={14} className="text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground truncate max-w-[160px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{p.sku}</td>
                      <td className="px-4 py-3 font-medium">₹{fmt(Number(p.mrp))}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {p.purchase_price ? `₹${fmt(Number(p.purchase_price))}` : '—'}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {p.profit_amount != null ? (
                          <span className={p.profit_amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            ₹{fmt(p.profit_amount)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.pricing_configured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setPricingTarget(p)}
                          className="rounded-lg border border-purple-500/40 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          Set pricing
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more */}
          {next && !loading && (
            <div className="flex justify-center">
              <button
                onClick={() => fetchProducts(page + 1, false)}
                disabled={loadingMore}
                className="rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Pricing modal */}
      {pricingTarget && (
        <PricingModal
          product={pricingTarget}
          onClose={() => setPricingTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
