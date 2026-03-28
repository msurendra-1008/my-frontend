import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, Package, FileText } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { FilterToolbar } from '@/components/admin/FilterToolbar';
import { Button } from '@components/ui/Button';
import { CreateRequirementSheet } from '@/components/procurement/CreateRequirementSheet';
import { procurementService } from '@/services/procurementService';
import { cn } from '@utils/cn';
import type {
  ProcurementListItem, ProcurementRequirement, ProcurementStats,
  PurchaseOrder, RequirementStatus, POStatus,
} from '@/types/procurement.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3500);
  };
  return { msg, show };
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

function formatMoney(v: string | number | null | undefined) {
  if (v == null) return '—';
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold', color ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

const REQ_STATUS_CFG: Record<RequirementStatus, { label: string; className: string }> = {
  draft:            { label: 'Draft',              className: 'bg-gray-100 text-gray-600 border-gray-300' },
  sent:             { label: 'Awaiting Response',  className: 'bg-blue-100 text-blue-800 border-blue-300' },
  vendor_responded: { label: 'Response Received',  className: 'bg-amber-100 text-amber-800 border-amber-300' },
  negotiating:      { label: 'Negotiating',        className: 'bg-purple-100 text-purple-800 border-purple-300' },
  po_generated:     { label: 'PO Generated',       className: 'bg-green-100 text-green-800 border-green-300' },
  cancelled:        { label: 'Cancelled',           className: 'bg-red-100 text-red-800 border-red-300' },
};

const PO_STATUS_CFG: Record<POStatus, { label: string; className: string }> = {
  generated:         { label: 'Generated',         className: 'bg-blue-100 text-blue-800 border-blue-300' },
  acknowledged:      { label: 'Acknowledged',      className: 'bg-amber-100 text-amber-800 border-amber-300' },
  dispatched:        { label: 'Dispatched',         className: 'bg-purple-100 text-purple-800 border-purple-300' },
  inspection_pending:{ label: 'Inspection Pending',className: 'bg-orange-100 text-orange-800 border-orange-300' },
  completed:         { label: 'Completed',          className: 'bg-green-100 text-green-800 border-green-300' },
  cancelled:         { label: 'Cancelled',           className: 'bg-red-100 text-red-800 border-red-300' },
};

function ReqBadge({ s }: { s: RequirementStatus }) {
  const cfg = REQ_STATUS_CFG[s];
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cfg.className)}>{cfg.label}</span>;
}
function POBadge({ s }: { s: POStatus }) {
  const cfg = PO_STATUS_CFG[s];
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cfg.className)}>{cfg.label}</span>;
}

// ── ActionAlertDialog ─────────────────────────────────────────────────────────

type DialogType = 'send' | 'negotiate' | 'confirm' | 'cancel';

function ActionAlertDialog({
  type, notes, acting, onNotesChange, onConfirm, onCancel,
  requirement,
}: {
  type: DialogType; notes: string; acting: boolean;
  onNotesChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
  requirement?: ProcurementRequirement | null;
}) {
  const cfg = {
    send:      { title: 'Send to vendor?',          body: 'Vendor will be notified and can submit a response.', btnLabel: 'Send', btnClass: 'bg-blue-600 text-white hover:bg-blue-700', needsNotes: false, minNotes: 0 },
    negotiate: { title: 'Send back for revision?',  body: 'Vendor will see your notes and update their response.', btnLabel: 'Send Back', btnClass: 'bg-amber-500 text-white hover:bg-amber-600', needsNotes: true,  minNotes: 10 },
    confirm:   { title: 'Confirm & generate PO?',   body: requirement?.vendor_response ? `This will generate a PO for ${requirement.vendor_response.supply_quantity} units at ₹${requirement.vendor_response.price_per_unit}/unit. Total: ₹${(Number(requirement.vendor_response.supply_quantity) * Number(requirement.vendor_response.price_per_unit)).toLocaleString('en-IN')}.` : '', btnLabel: 'Confirm & Generate PO', btnClass: 'bg-green-600 text-white hover:bg-green-700', needsNotes: false, minNotes: 0 },
    cancel:    { title: 'Cancel requirement?',      body: 'This cannot be undone.', btnLabel: 'Cancel Requirement', btnClass: 'bg-destructive text-white hover:bg-destructive/90', needsNotes: true, minNotes: 5 },
  }[type];

  const notesOk = !cfg.needsNotes || notes.trim().length >= cfg.minNotes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">{cfg.title}</h3>
        {cfg.body && <p className="mb-4 text-sm text-muted-foreground">{cfg.body}</p>}
        {cfg.needsNotes && (
          <textarea
            className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={3}
            placeholder={type === 'negotiate' ? 'Negotiation notes (min 10 chars)…' : 'Cancellation reason (min 5 chars)…'}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <button
            disabled={acting || !notesOk}
            onClick={onConfirm}
            className={cn('rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50', cfg.btnClass)}
          >
            {acting ? 'Working…' : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Requirement Detail Sheet ──────────────────────────────────────────────────

function RequirementDetailSheet({
  reqId, onClose, onUpdated,
}: { reqId: string; onClose: () => void; onUpdated: () => void }) {
  const [req, setReq]       = useState<ProcurementRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const [notes, setNotes]   = useState('');
  const [acting, setActing] = useState(false);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    try {
      const r = await procurementService.getRequirement(reqId);
      setReq(r.data);
    } finally { setLoading(false); }
  }, [reqId]);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!req || !dialog) return;
    setActing(true);
    try {
      if (dialog === 'send')      await procurementService.sendRequirement(req.id);
      if (dialog === 'negotiate') await procurementService.negotiateRequirement(req.id, notes);
      if (dialog === 'confirm')   await procurementService.confirmRequirement(req.id);
      if (dialog === 'cancel')    await procurementService.cancelRequirement(req.id, notes);
      show('Done.');
      setDialog(null);
      setNotes('');
      await load();
      onUpdated();
    } catch { show('Action failed.', true); }
    finally { setActing(false); }
  };

  const s = req?.status;
  const isDraft     = s === 'draft';
  const isActable   = s === 'vendor_responded' || s === 'negotiating';

  return (
    <>
      {dialog && (
        <ActionAlertDialog
          type={dialog} notes={notes} acting={acting} requirement={req}
          onNotesChange={setNotes}
          onConfirm={handleAction}
          onCancel={() => { setDialog(null); setNotes(''); }}
        />
      )}

      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative flex w-full max-w-xl flex-col bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{req?.product_name ?? 'Loading…'}</h2>
                {req && <ReqBadge s={req.status} />}
              </div>
              {req && <p className="text-xs text-muted-foreground">by {req.vendor_company} · {formatDate(req.created_at)}</p>}
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : req ? (
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>{msg.text}</div>}

              {/* Requirement details */}
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requirement</h3>
                {req.product_image && (
                  <img src={req.product_image} alt="" className="mb-3 h-20 w-20 rounded-md border object-cover" />
                )}
                <dl className="space-y-2 text-sm">
                  <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Required Qty</dt><dd className="font-medium">{req.required_quantity.toLocaleString()}</dd></div>
                  <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Required By</dt><dd>{formatDate(req.required_by_date)}</dd></div>
                  {req.target_price && <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Target Price</dt><dd>{formatMoney(req.target_price)}/unit</dd></div>}
                  {req.notes && <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Notes</dt><dd className="flex-1">{req.notes}</dd></div>}
                </dl>
              </section>

              {/* Vendor response */}
              {req.vendor_response && (
                <section>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vendor Response</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Supply Qty</dt><dd className="font-medium">{req.vendor_response.supply_quantity.toLocaleString()}</dd></div>
                    <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Price / Unit</dt><dd>{formatMoney(req.vendor_response.price_per_unit)}</dd></div>
                    <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Total Value</dt><dd className="font-medium">{formatMoney(String(Number(req.vendor_response.supply_quantity) * Number(req.vendor_response.price_per_unit)))}</dd></div>
                    <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Dispatch Date</dt><dd>{formatDate(req.vendor_response.dispatch_date)}</dd></div>
                  </dl>
                  {req.vendor_response.monthly_breakdown.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-md border">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b bg-muted/50"><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-right">Quantity</th></tr></thead>
                        <tbody className="divide-y">
                          {req.vendor_response.monthly_breakdown.map((b) => (
                            <tr key={b.month}><td className="px-3 py-2">{b.month}</td><td className="px-3 py-2 text-right">{b.quantity.toLocaleString()}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {req.vendor_response.notes && <p className="mt-2 text-sm text-muted-foreground">{req.vendor_response.notes}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Updated {req.vendor_response.update_count} time(s)</p>

                  {/* Price comparison */}
                  {req.target_price && (() => {
                    const target = Number(req.target_price);
                    const vendor = Number(req.vendor_response.price_per_unit);
                    const diff   = vendor - target;
                    const higher = diff > 0;
                    const diffStr = `${higher ? '+' : diff < 0 ? '-' : ''}₹${Math.abs(diff).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/unit`;
                    return (
                      <div className={cn(
                        'mt-3 rounded-md border px-4 py-3 text-sm',
                        higher ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50',
                      )}>
                        <p className="mb-2 font-medium">Price Comparison</p>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Target</p>
                            <p className="font-medium">₹{target.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/unit</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Vendor</p>
                            <p className="font-medium">₹{vendor.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/unit</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Difference</p>
                            <p className={cn('font-semibold', higher ? 'text-red-700' : 'text-green-700')}>{diffStr}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </section>
              )}

              {/* Negotiation notes */}
              {s === 'negotiating' && req.negotiation_notes && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">Your negotiation notes:</p>
                  <p>{req.negotiation_notes}</p>
                </div>
              )}

              {/* PO link */}
              {req.po && (
                <div className="rounded-md border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-medium text-green-800">PO Generated: <span className="font-mono">{req.po.po_number}</span></p>
                  <p className="text-xs text-green-700 mt-1">Qty: {req.po.quantity} × {formatMoney(req.po.price_per_unit)} = {formatMoney(req.po.total_amount)}</p>
                </div>
              )}

              {/* Cancellation */}
              {s === 'cancelled' && req.cancellation_reason && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-medium">Cancelled</p>
                  <p>{req.cancellation_reason}</p>
                </div>
              )}

              {/* Actions */}
              {isDraft && (
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={() => setDialog('send')}>
                  Send to Vendor →
                </Button>
              )}
              {isActable && (
                <div className="space-y-2">
                  <Button className="w-full bg-green-600 text-white hover:bg-green-700" onClick={() => setDialog('confirm')}>
                    Confirm &amp; Generate PO
                  </Button>
                  <Button className="w-full bg-amber-500 text-white hover:bg-amber-600" onClick={() => setDialog('negotiate')}>
                    Send Back for Revision
                  </Button>
                  <Button variant="danger" className="w-full" onClick={() => setDialog('cancel')}>
                    Cancel Requirement
                  </Button>
                </div>
              )}
              {!isDraft && !isActable && s !== 'po_generated' && s !== 'cancelled' && (
                <Button variant="danger" className="w-full" onClick={() => setDialog('cancel')}>
                  Cancel Requirement
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">Not found.</div>
          )}
        </div>
      </div>
    </>
  );
}

// ── PO Detail Sheet ───────────────────────────────────────────────────────────

function PODetailSheet({ poId, onClose }: { poId: string; onClose: () => void; onUpdated: () => void }) {
  const [po, setPo]         = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { msg } = useToast();

  useEffect(() => {
    procurementService.getPO(poId)
      .then((r) => { setPo(r.data); setAdminNotes(r.data.admin_notes ?? ''); })
      .finally(() => setLoading(false));
  }, [poId]);

  const saveNotes = async (v: string) => {
    if (!po) return;
    try { await procurementService.adminUpdatePOStatus(po.id, po.status, v); } catch { /* ignore */ }
  };

  const handleNotesChange = (v: string) => {
    setAdminNotes(v);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveNotes(v), 1500);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-xl flex-col bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-lg font-semibold">{po?.po_number ?? 'Loading…'}</h2>
              {po && <POBadge s={po.status} />}
            </div>
            {po && <p className="text-xs text-muted-foreground">by {po.vendor_company} · {formatDate(po.generated_at)}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : po ? (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>{msg.text}</div>}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">PO Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Product</dt><dd className="font-medium">{po.product_name}</dd></div>
                <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Quantity</dt><dd>{po.quantity.toLocaleString()}</dd></div>
                <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Price / Unit</dt><dd>{formatMoney(po.price_per_unit)}</dd></div>
                <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Total Amount</dt><dd className="font-medium">{formatMoney(po.total_amount)}</dd></div>
                <div className="flex gap-2"><dt className="w-40 text-muted-foreground">Dispatch Date</dt><dd>{formatDate(po.dispatch_date)}</dd></div>
              </dl>
            </section>
            {po.monthly_breakdown.length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Monthly Breakdown</h3>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-right">Quantity</th></tr></thead>
                    <tbody className="divide-y">
                      {po.monthly_breakdown.map((b) => (
                        <tr key={b.month}><td className="px-3 py-2">{b.month}</td><td className="px-3 py-2 text-right">{b.quantity.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {/* Timeline */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>Generated: {formatDate(po.generated_at)}</div>
                {po.acknowledged_at && <div>Acknowledged: {formatDate(po.acknowledged_at)}</div>}
                {po.dispatched_at && <div>Dispatched: {formatDate(po.dispatched_at)}</div>}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Internal Notes</h3>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={3}
                placeholder="Admin-only notes (auto-saved)…"
                value={adminNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={() => saveNotes(adminNotes)}
              />
            </section>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">Not found.</div>
        )}
      </div>
    </div>
  );
}

// ── Requirements Tab ──────────────────────────────────────────────────────────

function RequirementsTab() {
  const [items, setItems]           = useState<ProcurementListItem[]>([]);
  const [stats, setStats]           = useState<ProcurementStats | null>(null);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { msg, show } = useToast();

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const r = await procurementService.listRequirements(params);
      setItems(r.data.results);
      setTotal(r.data.count);
      setStats(r.data.stats);
      setPage(p);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(1); }, [fetch]);

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {showCreate && (
        <CreateRequirementSheet
          onClose={() => setShowCreate(false)}
          onSaved={(sent) => {
            setShowCreate(false);
            show(sent ? 'Requirement created and sent.' : 'Requirement saved as draft.');
            fetch(1);
          }}
        />
      )}
      {selectedId && (
        <RequirementDetailSheet
          reqId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => fetch(page)}
        />
      )}

      <div className="space-y-4">
        {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-800')}>{msg.text}</div>}

        {stats && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total"                    value={stats.total} />
            <StatCard label="Awaiting Response"        value={stats.sent}                  color="text-blue-600" />
            <StatCard label="Awaiting Confirmation"    value={stats.awaiting_confirmation} color="text-amber-600" />
            <StatCard label="POs Generated"            value={stats.po_generated}          color="text-green-600" />
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <FilterToolbar
            searchPlaceholder="Search product or vendor…"
            searchValue={search}
            onSearchChange={(v) => setSearch(v)}
            filters={[{
              id: 'status', placeholder: 'All Statuses', value: statusFilter, onChange: setStatusFilter,
              options: [
                { value: 'draft',            label: 'Draft' },
                { value: 'sent',             label: 'Awaiting Response' },
                { value: 'vendor_responded', label: 'Response Received' },
                { value: 'negotiating',      label: 'Negotiating' },
                { value: 'po_generated',     label: 'PO Generated' },
                { value: 'cancelled',        label: 'Cancelled' },
              ],
            }]}
          />
          <Button size="sm" onClick={() => setShowCreate(true)} className="shrink-0">
            + Create
          </Button>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 w-12"></th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3">Required By</th>
                  <th className="px-4 py-3">Target Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <Package className="mx-auto mb-2 h-10 w-10 opacity-30" />No requirements found
                  </td></tr>
                ) : items.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(r.id)}>
                    <td className="px-4 py-3">
                      {r.product_image ? <img src={r.product_image} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.vendor_company}</td>
                    <td className="px-4 py-3 text-center">{r.required_quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.required_by_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.target_price ? formatMoney(r.target_price) : '—'}</td>
                    <td className="px-4 py-3"><ReqBadge s={r.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetch(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetch(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Purchase Orders Tab ───────────────────────────────────────────────────────

function PurchaseOrdersTab() {
  const [pos, setPos]               = useState<PurchaseOrder[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const fetch = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p) };
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const r = await procurementService.listPOs(params);
      setPos(r.data.results);
      setTotal(r.data.count);
      setPage(p);
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetch(1); }, [fetch]);

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {selectedPoId && (
        <PODetailSheet
          poId={selectedPoId}
          onClose={() => setSelectedPoId(null)}
          onUpdated={() => fetch(page)}
        />
      )}

      <div className="space-y-4">
        <FilterToolbar
          searchPlaceholder="Search PO number or vendor…"
          searchValue={search}
          onSearchChange={(v) => setSearch(v)}
          filters={[{
            id: 'status', placeholder: 'All Statuses', value: statusFilter, onChange: setStatusFilter,
            options: [
              { value: 'generated',          label: 'Generated' },
              { value: 'acknowledged',       label: 'Acknowledged' },
              { value: 'dispatched',         label: 'Dispatched' },
              { value: 'inspection_pending', label: 'Inspection Pending' },
              { value: 'completed',          label: 'Completed' },
              { value: 'cancelled',          label: 'Cancelled' },
            ],
          }]}
        />

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Dispatch</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={8} className="py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></td></tr>
                ) : pos.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />No purchase orders yet
                  </td></tr>
                ) : pos.map((po) => (
                  <tr key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPoId(po.id)}>
                    <td className="px-4 py-3 font-mono font-medium">{po.po_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{po.vendor_company}</td>
                    <td className="px-4 py-3">{po.product_name}</td>
                    <td className="px-4 py-3 text-center">{po.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3">{formatMoney(po.total_amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(po.dispatch_date)}</td>
                    <td className="px-4 py-3"><POBadge s={po.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(po.generated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetch(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetch(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageTab = 'Requirements' | 'Purchase Orders';

export function AdminProcurementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState<PageTab>('Requirements');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h1 className="font-semibold">Procurement</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold">Procurement</h1>
            <p className="text-sm text-muted-foreground">Manage procurement requirements and purchase orders</p>
          </div>

          <div className="mb-6 flex gap-1 border-b">
            {(['Requirements', 'Purchase Orders'] as PageTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >{tab}</button>
            ))}
          </div>

          {activeTab === 'Requirements'    && <RequirementsTab />}
          {activeTab === 'Purchase Orders' && <PurchaseOrdersTab />}
        </main>
      </div>
    </div>
  );
}
