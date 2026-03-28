import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, XCircle, AlertTriangle, FileText, Package,
  LogOut, Upload, Pencil, Download, Trash2, Loader2, X, Plus, CheckCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { vendorService } from '@/services/vendorService';
import { productService } from '@/services/productService';
import { procurementService } from '@/services/procurementService';
import { AddVendorProductSheet } from '@/components/vendor/AddVendorProductSheet';
import type { VendorProfile, VendorDocument, VendorProductListItem, VendorProduct, VendorProductStatus } from '@/types/vendor.types';
import type { ProcurementRequirement, PurchaseOrder, POStatus, RequirementStatus, MonthlyBreakdown, VendorResponseWriteData } from '@/types/procurement.types';
import type { Category } from '@/types/product.types';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:       { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved:      { label: 'Approved',       className: 'bg-green-100 text-green-800 border-green-300' },
  rejected:      { label: 'Rejected',       className: 'bg-red-100 text-red-800 border-red-300' },
  docs_requested:{ label: 'Docs Requested', className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

const TABS = ['My Products', 'Requirements', 'Purchase Orders', 'Tenders', 'Chat', 'Profile'] as const;
type Tab = typeof TABS[number];

// ── My Products Tab ───────────────────────────────────────────────────────────

const VP_STATUS_BADGE: Record<VendorProductStatus, { label: string; className: string }> = {
  pending_approval: { label: 'Pending Review', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved:         { label: 'Approved',       className: 'bg-green-100 text-green-800 border-green-300' },
  rejected:         { label: 'Rejected',       className: 'bg-red-100 text-red-800 border-red-300' },
  not_continued:    { label: 'Deactivated',    className: 'bg-gray-100 text-gray-600 border-gray-300' },
};

function MyProductsTab() {
  const [products, setProducts] = useState<VendorProductListItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editProduct, setEditProduct] = useState<VendorProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorService.listMyProducts();
      setProducts(res.data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleEdit = async (id: string) => {
    try {
      const res = await vendorService.getProduct(id);
      setEditProduct(res.data);
      setShowSheet(true);
    } catch { /* ignore */ }
  };

  const handleSaved = () => {
    setShowSheet(false);
    setEditProduct(null);
    load();
  };

  return (
    <>
      {showSheet && (
        <AddVendorProductSheet
          product={editProduct}
          onClose={() => { setShowSheet(false); setEditProduct(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">My Product Submissions</h3>
          <Button size="sm" onClick={() => { setEditProduct(null); setShowSheet(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Product
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />
            No products submitted yet. Click "Add Product" to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 w-12"></th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">SKU</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Variants</th>
                  <th className="pb-3 pr-4">MRP Range</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => {
                  const badge = VP_STATUS_BADGE[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-muted/40">
                      <td className="py-3 pr-4">
                        {p.primary_image ? (
                          <img src={p.primary_image} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-medium">{p.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.sku}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.category_name ?? '—'}</td>
                      <td className="py-3 pr-4 text-center">{p.variant_count}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {p.mrp_range ? `₹${p.mrp_range.min}${p.mrp_range.min !== p.mrp_range.max ? ` – ₹${p.mrp_range.max}` : ''}` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.status !== 'not_continued' && (
                          <button
                            onClick={() => handleEdit(p.id)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Procurement Helpers ───────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

const REQ_STATUS_CFG: Record<RequirementStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',              className: 'bg-gray-100 text-gray-600 border-gray-300' },
  sent:             { label: 'Awaiting Response',  className: 'bg-blue-100 text-blue-800 border-blue-300' },
  vendor_responded: { label: 'Response Submitted', className: 'bg-green-100 text-green-800 border-green-300' },
  negotiating:      { label: 'Revision Requested', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  po_generated:     { label: 'PO Generated',       className: 'bg-green-100 text-green-800 border-green-300' },
  cancelled:        { label: 'Cancelled',           className: 'bg-red-100 text-red-800 border-red-300' },
};

const PO_STATUS_CFG: Record<POStatus, { label: string; className: string }> = {
  generated:         { label: 'Awaiting Acknowledgement', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  acknowledged:      { label: 'Acknowledged',             className: 'bg-amber-100 text-amber-800 border-amber-300' },
  dispatched:        { label: 'Dispatched',                className: 'bg-purple-100 text-purple-800 border-purple-300' },
  inspection_pending:{ label: 'Inspection Pending',       className: 'bg-orange-100 text-orange-800 border-orange-300' },
  completed:         { label: 'Completed',                 className: 'bg-green-100 text-green-800 border-green-300' },
  cancelled:         { label: 'Cancelled',                  className: 'bg-red-100 text-red-800 border-red-300' },
};

// ── Response Form ─────────────────────────────────────────────────────────────

function VendorResponseForm({
  req, onDone,
}: { req: ProcurementRequirement; onDone: () => void }) {
  const isUpdate = req.vendor_response !== null;
  const existing = req.vendor_response;

  // Start in edit mode for new responses or when admin requests revision
  const [isEditMode, setIsEditMode] = useState(() => !isUpdate || req.status === 'negotiating');

  // Smart pre-fills: new response uses admin values; update uses submitted values
  const [qty, setQty]             = useState(
    isUpdate ? existing!.supply_quantity.toString() : req.required_quantity.toString(),
  );
  const [price, setPrice]         = useState<string>(
    isUpdate ? String(existing!.price_per_unit) : (req.target_price ? String(req.target_price) : ''),
  );
  const [dispatchDate, setDispatch] = useState(existing?.dispatch_date ?? '');
  const [breakdown, setBreakdown] = useState<MonthlyBreakdown[]>(existing?.monthly_breakdown ?? []);
  const [notes, setNotes]         = useState(existing?.notes ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const addMonth = () => setBreakdown((b) => [...b, { month: '', quantity: 0 }]);
  const removeMonth = (i: number) => setBreakdown((b) => b.filter((_, j) => j !== i));
  const updateMonth = (i: number, field: 'month' | 'quantity', val: string) =>
    setBreakdown((b) => b.map((x, j) => j === i ? { ...x, [field]: field === 'quantity' ? Number(val) : val } : x));

  const allocated = breakdown.reduce((s, b) => s + b.quantity, 0);
  const totalQty  = Number(qty) || 0;

  const handleSubmit = async () => {
    setError('');
    if (!qty || totalQty < 1) { setError('Supply quantity is required.'); return; }
    if (!price)               { setError('Price per unit is required.'); return; }
    if (!dispatchDate)        { setError('Dispatch date is required.'); return; }
    if (breakdown.length > 0 && allocated !== totalQty) {
      setError(`Monthly breakdown total (${allocated}) must equal supply quantity (${totalQty}).`);
      return;
    }

    const data: VendorResponseWriteData = {
      supply_quantity: totalQty,
      price_per_unit: price,
      dispatch_date: dispatchDate,
      monthly_breakdown: breakdown,
      notes,
    };

    setSaving(true);
    try {
      if (isUpdate) {
        await procurementService.updateResponse(req.id, data);
      } else {
        await procurementService.submitResponse(req.id, data);
      }
      onDone();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const d = e?.response?.data;
      if (d && typeof d === 'object') {
        setError(Object.values(d).flat().join(' ') || 'Something went wrong.');
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Section 1: What admin requested */}
      <div className="rounded-md border bg-muted/40 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What admin requested</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Required Qty</span>
          <span className="font-medium">{req.required_quantity.toLocaleString()}</span>
          <span className="text-muted-foreground">Required By</span>
          <span>{formatDate(req.required_by_date)}</span>
          <span className="text-muted-foreground">Target Price</span>
          <span>{req.target_price ? `₹${req.target_price}/unit` : 'Not specified'}</span>
          {req.notes && (
            <>
              <span className="text-muted-foreground">Notes</span>
              <span>{req.notes}</span>
            </>
          )}
        </div>
      </div>

      {/* Section 2: Vendor response */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Your Response</h4>
          {isUpdate && !isEditMode && (
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Edit response
            </button>
          )}
        </div>

        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

        {!isEditMode && existing ? (
          /* Read-only view of submitted response */
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Supply Qty</span>
            <span className="font-medium">{existing.supply_quantity.toLocaleString()}</span>
            <span className="text-muted-foreground">Price / Unit</span>
            <span>₹{existing.price_per_unit}/unit</span>
            <span className="text-muted-foreground">Dispatch Date</span>
            <span>{formatDate(existing.dispatch_date)}</span>
            {existing.notes && (
              <>
                <span className="text-muted-foreground">Notes</span>
                <span>{existing.notes}</span>
              </>
            )}
            <span className="col-span-2 text-xs text-muted-foreground">Updated {existing.update_count}×</span>
          </div>
        ) : (
          /* Editable form */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Supply Quantity *</label>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="500" className="text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Price / Unit (₹) *</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="480" className="text-sm" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium">Dispatch Date *</label>
                <Input type="date" value={dispatchDate} onChange={(e) => setDispatch(e.target.value)} className="text-sm" />
              </div>
            </div>

            {/* Monthly breakdown */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Monthly Breakdown</span>
                <button type="button" onClick={addMonth} className="text-xs font-medium text-primary hover:underline">+ Add Month</button>
              </div>
              {breakdown.map((b, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <Input
                    type="month"
                    value={b.month}
                    onChange={(e) => updateMonth(i, 'month', e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Input
                    type="number"
                    value={b.quantity.toString()}
                    onChange={(e) => updateMonth(i, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-24 text-sm"
                  />
                  <button type="button" onClick={() => removeMonth(i)} className="text-destructive hover:text-destructive/70">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {breakdown.length > 0 && (
                <p className={`text-xs ${allocated === totalQty ? 'text-green-600' : 'text-amber-600'}`}>
                  {allocated} of {totalQty} qty allocated
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {isUpdate ? 'Update Response' : 'Submit Response'}
              </Button>
              {isUpdate && (
                <Button size="sm" variant="outline" onClick={() => setIsEditMode(false)} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Requirements Tab ──────────────────────────────────────────────────────────

function RequirementsTab() {
  const [requirements, setRequirements] = useState<ProcurementRequirement[]>([]);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementService.getVendorRequirements();
      setRequirements(res.data.results as unknown as ProcurementRequirement[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (requirements.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
        No procurement requirements yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requirements.map((req) => {
        const cfg        = REQ_STATUS_CFG[req.status];
        const canRespond = req.status === 'sent' || req.status === 'negotiating';
        const isExpanded = expandedId === req.id;

        return (
          <div key={req.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                {req.product_image && (
                  <img src={req.product_image} alt="" className="h-12 w-12 rounded-md border object-cover" />
                )}
                <div>
                  <p className="font-medium">{req.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty: {req.required_quantity.toLocaleString()} · Due {formatDate(req.required_by_date)}
                    {req.target_price && ` · Target: ₹${req.target_price}/unit`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                  {cfg.label}
                </span>
                {canRespond && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Status banners */}
            {req.status === 'sent' && (
              <div className="mt-3 rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-400">
                Admin is requesting supply — expand to respond.
              </div>
            )}
            {req.status === 'negotiating' && req.negotiation_notes && (
              <div className="mt-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Admin has requested revision:</p>
                <p>{req.negotiation_notes}</p>
              </div>
            )}
            {req.status === 'vendor_responded' && (
              <div className="mt-3 rounded-md border border-green-400/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="inline mr-1 h-4 w-4" />
                Response submitted — awaiting admin confirmation.
              </div>
            )}
            {req.status === 'po_generated' && (
              <div className="mt-3 rounded-md border border-green-400/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="inline mr-1 h-4 w-4" />
                PO generated — check Purchase Orders tab.
              </div>
            )}
            {req.status === 'cancelled' && (
              <div className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                Requirement cancelled.
              </div>
            )}

            {/* Response form: collapsible for sent/negotiating; always shown for vendor_responded */}
            {canRespond && isExpanded && (
              <VendorResponseForm req={req} onDone={() => { setExpandedId(null); load(); }} />
            )}
            {req.status === 'vendor_responded' && req.vendor_response && (
              <VendorResponseForm req={req} onDone={load} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Purchase Orders Tab (Procurement) ─────────────────────────────────────────

function POsTab() {
  const [pos, setPos]         = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await procurementService.getVendorPOs();
      setPos(res.data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAcknowledge = async (poId: string) => {
    await procurementService.acknowledgePO(poId);
    load();
  };

  const handleDispatch = async (poId: string) => {
    await procurementService.dispatchPO(poId);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (pos.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
        No purchase orders yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pos.map((po) => {
        const cfg        = PO_STATUS_CFG[po.status];
        const isExpanded = expandedId === po.id;

        return (
          <div key={po.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                {po.product_image && (
                  <img src={po.product_image} alt="" className="h-12 w-12 rounded-md border object-cover" />
                )}
                <div>
                  <p className="font-mono font-semibold text-sm">{po.po_number}</p>
                  <p className="font-medium">{po.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {po.quantity.toLocaleString()} units · ₹{po.price_per_unit}/unit · Total: ₹{Number(po.total_amount).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">Dispatch by {formatDate(po.dispatch_date)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                  {cfg.label}
                </span>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : po.id)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Monthly Breakdown {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {isExpanded && po.monthly_breakdown.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-md border text-xs">
                <table className="w-full">
                  <thead><tr className="border-b bg-muted/50"><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-right">Quantity</th></tr></thead>
                  <tbody className="divide-y">
                    {po.monthly_breakdown.map((b) => (
                      <tr key={b.month}><td className="px-3 py-2">{b.month}</td><td className="px-3 py-2 text-right">{b.quantity.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              {po.status === 'generated' && (
                <Button size="sm" onClick={() => handleAcknowledge(po.id)}>
                  <CheckCircle className="mr-1 h-4 w-4" /> Acknowledge PO
                </Button>
              )}
              {po.status === 'acknowledged' && (
                <Button size="sm" onClick={() => handleDispatch(po.id)}>
                  Mark as Dispatched
                </Button>
              )}
              {po.status === 'dispatched' && (
                <span className="inline-flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" /> Dispatched — awaiting inspection
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stub Tables ───────────────────────────────────────────────────────────────

function TendersTab() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4">Tender ID</th>
              <th className="pb-3 pr-4">Product</th>
              <th className="pb-3 pr-4">Qty</th>
              <th className="pb-3 pr-4">Deadline</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="py-12 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-10 w-10 opacity-30" />
                No tenders assigned yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChatTab() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="py-12 text-center text-muted-foreground">
        <AlertTriangle className="mx-auto mb-2 h-10 w-10 opacity-30" />
        No active negotiations
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({
  profile,
  onRefresh,
}: {
  profile: VendorProfile;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [form, setForm] = useState({
    contact_name:  profile.contact_name,
    address_line1: profile.address_line1,
    address_line2: profile.address_line2,
    city:          profile.city,
    state:         profile.state,
    pincode:       profile.pincode,
  });
  const [saving, setSaving]       = useState(false);
  const [docLabel, setDocLabel]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    productService.listCategories().then((r) => setCategories(r.data.results));
    setSelectedCats(profile.categories.map((c) => c.id));
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await vendorService.updateProfile({ ...form, category_ids: selectedCats });
      setEditing(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const label = docLabel.trim() || file.name;
    setUploading(true);
    try {
      await vendorService.uploadDocument(label, file);
      setDocLabel('');
      onRefresh();
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleDeleteDoc = async (docId: string) => {
    await vendorService.deleteDocument(docId);
    setDeleteConfirm(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Info card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Company & Contact</h3>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Contact Person</label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Address Line 1</label>
              <Input
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Address Line 2</label>
              <Input
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">City</label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">State</label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pincode</label>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">Categories</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCats((prev) =>
                        prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selectedCats.includes(cat.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{profile.company_name}</dd></div>
            <div><dt className="text-muted-foreground">GST Number</dt><dd className="font-medium">{profile.gst_number}</dd></div>
            <div><dt className="text-muted-foreground">Contact Person</dt><dd className="font-medium">{profile.contact_name}</dd></div>
            <div><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium">{profile.mobile || '—'}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{profile.email || '—'}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">
                {profile.address_line1}{profile.address_line2 ? `, ${profile.address_line2}` : ''},{' '}
                {profile.city}, {profile.state} — {profile.pincode}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Categories</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {profile.categories.map((c) => (
                  <span key={c.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{c.name}</span>
                ))}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Documents</h3>

        {profile.documents.length > 0 ? (
          <ul className="mb-4 divide-y">
            {profile.documents.map((doc: VendorDocument) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href={doc.file_url} download target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  {deleteConfirm === doc.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="danger" onClick={() => handleDeleteDoc(doc.id)}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}

        <div className="flex gap-2">
          <Input
            value={docLabel}
            onChange={(e) => setDocLabel(e.target.value)}
            placeholder="Document name (e.g. PAN Card)"
            className="flex-1"
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
            <input type="file" className="hidden" onChange={handleUploadDoc} disabled={uploading} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function VendorDashboard() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Tenders');

  const fetchProfile = useCallback(async () => {
    try {
      const res = await vendorService.getMe();
      setProfile(res.data);
    } catch {
      // token invalid — logout
      clearAuth();
      navigate('/vendor/login', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [clearAuth, navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleLogout = () => {
    clearAuth();
    navigate('/vendor/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null;

  const badge = STATUS_BADGE[profile.status];

  // ── Status Gate ───────────────────────────────────────────────────────────

  const renderGate = () => {
    if (profile.status === 'pending') {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-amber-500" />
            <h2 className="mb-2 text-xl font-bold">Application Under Review</h2>
            <p className="text-muted-foreground">
              We're reviewing your registration. You'll be notified once approved. This usually
              takes 1–2 business days.
            </p>
            {profile.documents.length > 0 && (
              <div className="mt-6 text-left">
                <p className="mb-2 text-sm font-medium">Uploaded documents:</p>
                <ul className="space-y-1">
                  {profile.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" /> {doc.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (profile.status === 'docs_requested') {
      return (
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3">
            <p className="font-medium text-amber-700 dark:text-amber-400">Admin has requested additional documents</p>
            {profile.admin_notes && (
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">{profile.admin_notes}</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 font-semibold">Upload Requested Documents</h3>
            <ProfileTab profile={profile} onRefresh={fetchProfile} />
          </div>
        </div>
      );
    }

    if (profile.status === 'rejected') {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center">
            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
            <h2 className="mb-2 text-xl font-bold">Application Rejected</h2>
            {profile.rejection_reason && (
              <div className="mb-3 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {profile.rejection_reason}
              </div>
            )}
            <p className="text-muted-foreground">
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }

    return null; // approved — render tabs
  };

  const gate = renderGate();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{profile.company_name}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {/* Status gate — non-approved */}
      {gate}

      {/* Approved — full dashboard */}
      {profile.status === 'approved' && (
        <main className="mx-auto max-w-6xl px-4 py-6">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'My Products'     && <MyProductsTab />}
          {activeTab === 'Requirements'    && <RequirementsTab />}
          {activeTab === 'Purchase Orders' && <POsTab />}
          {activeTab === 'Tenders'         && <TendersTab />}
          {activeTab === 'Chat'            && <ChatTab />}
          {activeTab === 'Profile'         && (
            <ProfileTab profile={profile} onRefresh={fetchProfile} />
          )}
        </main>
      )}
    </div>
  );
}
