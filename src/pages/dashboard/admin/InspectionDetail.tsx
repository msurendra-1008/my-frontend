import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Download, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { inspectionService } from '@/services/inspectionService';
import { cn } from '@utils/cn';
import {
  REJECTION_REASON_KEYS,
  REJECTION_REASON_LABELS,
  type IncomingShipment,
  type InspectionReportWriteData,
  type RejectionBreakdown,
} from '@/types/inspection.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function formatMoney(v: string | number) {
  return `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 4000);
  };
  return { msg, show };
}

// ── Confirmation Dialog ───────────────────────────────────────────────────────

function ConfirmDialog({
  accepted, rejected, missing, hasRejections,
  onConfirm, onCancel, submitting,
}: {
  accepted: number; rejected: number; missing: number; hasRejections: boolean;
  onConfirm: () => void; onCancel: () => void; submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Submit inspection report?</h3>
        <p className="mb-4 text-sm text-muted-foreground">This cannot be undone.</p>
        <div className="mb-4 rounded-lg bg-muted/50 p-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span className="text-green-600 dark:text-green-400 font-medium">{accepted}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rejected</span><span className="text-red-600 dark:text-red-400 font-medium">{rejected}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Missing</span><span className="text-amber-600 dark:text-amber-400 font-medium">{missing}</span></div>
        </div>
        {hasRejections && (
          <p className="mb-4 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            A debit note will be generated for the rejected units.
          </p>
        )}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button className="flex-1 bg-primary text-primary-foreground" onClick={onConfirm} disabled={submitting}>
            {submitting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…</> : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Inspection Form (STATE A) ─────────────────────────────────────────────────

function InspectionForm({
  shipment, onSubmitted,
}: { shipment: IncomingShipment; onSubmitted: () => void }) {
  const expected = shipment.expected_quantity;

  const [received, setReceived]   = useState('');
  const [accepted, setAccepted]   = useState('');
  const [rejected, setRejected]   = useState('');
  const [breakdown, setBreakdown] = useState<RejectionBreakdown>(() =>
    Object.fromEntries(REJECTION_REASON_KEYS.map((k) => [k, 0])),
  );
  const [otherNotes, setOtherNotes] = useState('');
  const [genNotes, setGenNotes]     = useState('');
  const [error, setError]           = useState('');
  const [confirm, setConfirm]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { show } = useToast();

  const rcv = Number(received) || 0;
  const acc = Number(accepted) || 0;
  const rej = Number(rejected) || 0;
  const missing = expected - rcv;
  const bdSum = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const hasRej = rej > 0;

  const validate = (): string => {
    if (rcv < 0 || acc < 0 || rej < 0) return 'Quantities must be ≥ 0.';
    if (rcv > expected) return `Received (${rcv}) cannot exceed expected (${expected}).`;
    if (acc + rej !== rcv) return `Accepted (${acc}) + Rejected (${rej}) must equal Received (${rcv}).`;
    if (hasRej) {
      if (bdSum === 0) return 'Provide a rejection breakdown when rejected > 0.';
      if (bdSum !== rej) return `Breakdown total (${bdSum}) must equal Rejected (${rej}).`;
      if ((breakdown['other'] ?? 0) > 0 && otherNotes.trim().length < 10) {
        return 'Notes required (min 10 chars) when "Other" is selected.';
      }
    }
    return '';
  };

  const handleSubmitClick = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setConfirm(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    const data: InspectionReportWriteData = {
      received_quantity: rcv,
      accepted_quantity: acc,
      rejected_quantity: rej,
      general_notes: genNotes,
    };
    if (hasRej) {
      const bd: RejectionBreakdown = {};
      for (const [k, v] of Object.entries(breakdown)) {
        if (v > 0) bd[k] = v;
      }
      data.rejection_breakdown = bd;
      if (breakdown['other'] > 0) data.rejection_other_notes = otherNotes;
    }
    try {
      await inspectionService.submitReport(shipment.id, data);
      onSubmitted();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const d = err?.response?.data;
      const msg = d ? Object.values(d).flat().join(' ') : 'Submission failed.';
      show(msg, true);
    } finally {
      setSubmitting(false);
      setConfirm(false);
    }
  };

  return (
    <>
      {confirm && (
        <ConfirmDialog
          accepted={acc} rejected={rej} missing={missing} hasRejections={hasRej}
          onConfirm={handleConfirm} onCancel={() => setConfirm(false)} submitting={submitting}
        />
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6">
        <h2 className="text-lg font-semibold">Inspection Report</h2>

        {error && (
          <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Quantities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Expected (from PO)</span>
            <span className="font-semibold">{expected.toLocaleString()} units</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Received quantity *</label>
              <Input
                type="number" min={0} value={received}
                onChange={(e) => setReceived(e.target.value)}
                placeholder="e.g. 480"
              />
              <p className="mt-1 text-xs text-muted-foreground">Units that physically arrived</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Accepted quantity *</label>
              <Input
                type="number" min={0} value={accepted}
                onChange={(e) => setAccepted(e.target.value)}
                placeholder="e.g. 450"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Rejected quantity *</label>
              <Input
                type="number" min={0} value={rejected}
                onChange={(e) => setRejected(e.target.value)}
                placeholder="e.g. 30"
              />
              {rcv > 0 && (
                <p className={cn('mt-1 text-xs', acc + rej === rcv ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                  Total: {acc + rej} of {rcv}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Rejection breakdown */}
        {hasRej && (
          <div>
            <h3 className="mb-3 text-sm font-semibold">
              Rejection breakdown *
              <span className="ml-1 font-normal text-muted-foreground">(must total {rej} units)</span>
            </h3>
            <div className="space-y-2">
              {REJECTION_REASON_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-44 text-sm text-muted-foreground shrink-0">
                    {REJECTION_REASON_LABELS[key]}
                  </label>
                  <Input
                    type="number" min={0}
                    value={breakdown[key] === 0 ? '' : String(breakdown[key])}
                    onChange={(e) => setBreakdown((b) => ({ ...b, [key]: Number(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-28 text-sm"
                  />
                </div>
              ))}
            </div>
            <p className={cn('mt-2 text-xs', bdSum === rej ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
              {bdSum} of {rej} units allocated
            </p>

            {(breakdown['other'] ?? 0) > 0 && (
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium">Describe the issue (required) *</label>
                <textarea
                  rows={2}
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Min 10 characters…"
                />
              </div>
            )}
          </div>
        )}

        {/* General notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">General notes (optional)</label>
          <textarea
            rows={2}
            value={genNotes}
            onChange={(e) => setGenNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Any additional observations…"
          />
        </div>

        <Button onClick={handleSubmitClick} disabled={submitting}>
          Submit inspection report
        </Button>
      </div>
    </>
  );
}

// ── Inspection Ledger (STATE B) ───────────────────────────────────────────────

function InspectionLedger({
  shipment, onStockUpdated,
}: { shipment: IncomingShipment; onStockUpdated: () => void }) {
  const report = shipment.report!;
  const [updatingStock, setUpdatingStock] = useState(false);
  const [stockDialog, setStockDialog]     = useState(false);
  const [downloading, setDownloading]     = useState(false);
  const { msg, show } = useToast();

  const handleUpdateStock = async () => {
    setUpdatingStock(true);
    try {
      await inspectionService.updateStock(shipment.id);
      onStockUpdated();
    } catch {
      show('Failed to update stock.', true);
    } finally {
      setUpdatingStock(false);
      setStockDialog(false);
    }
  };

  const handleDownloadDebitNote = async () => {
    setDownloading(true);
    try {
      const resp = await inspectionService.downloadDebitNote(shipment.id);
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `DN-${shipment.po_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      show('Download failed.', true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {stockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold">Update product stock?</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add <span className="font-semibold">{report.accepted_quantity.toLocaleString()} units</span> to{' '}
              <span className="font-semibold">{shipment.product_name}</span>?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStockDialog(false)} disabled={updatingStock}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdateStock} disabled={updatingStock}>
                {updatingStock ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Updating…</> : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>{msg.text}</div>}

        {/* Ledger card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b bg-muted/30 px-6 py-4">
            <h2 className="font-semibold">Inspection Report</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              PO: {shipment.po_number} · {formatDateTime(report.inspected_at)}
            </p>
          </div>

          <div className="divide-y">
            {[
              { label: 'Expected',   value: shipment.expected_quantity, icon: null, color: '' },
              { label: 'Received',   value: report.received_quantity,   icon: null, color: '' },
              { label: 'Accepted',   value: report.accepted_quantity,   icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400' },
              { label: 'Rejected',   value: report.rejected_quantity,   icon: <XCircle className="h-4 w-4" />,    color: 'text-red-600 dark:text-red-400' },
              { label: 'Missing',    value: report.missing_quantity,    icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600 dark:text-amber-400' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="flex items-center justify-between px-6 py-3 text-sm">
                <div className={cn('flex items-center gap-2', color || 'text-muted-foreground')}>
                  {icon}
                  <span>{label}</span>
                </div>
                <span className={cn('font-medium', color)}>{value.toLocaleString()} units</span>
              </div>
            ))}
          </div>

          {/* Rejection breakdown */}
          {Object.keys(report.rejection_breakdown_labeled).length > 0 && (
            <div className="border-t px-6 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejection breakdown</p>
              <div className="space-y-1 text-sm">
                {Object.entries(report.rejection_breakdown_labeled).map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-red-600 dark:text-red-400">{count} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer meta */}
          <div className="border-t bg-muted/20 px-6 py-3 text-xs text-muted-foreground space-y-1">
            <div>Inspected by: <span className="font-medium text-foreground">{report.inspected_by_name}</span> · {formatDateTime(report.inspected_at)}</div>
            {report.general_notes && <div>Notes: {report.general_notes}</div>}
          </div>
        </div>

        {/* Debit note */}
        {report.rejected_quantity > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-3 font-semibold">Debit Note</h3>
            <div className="text-sm space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated debit value</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatMoney(Number(report.rejected_quantity) * Number(shipment.price_per_unit))}
                </span>
              </div>
              {report.debit_note_generated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated</span>
                  <span>{formatDateTime(report.debit_note_generated_at)}</span>
                </div>
              )}
            </div>
            {report.debit_note_url && (
              <Button size="sm" variant="outline" onClick={handleDownloadDebitNote} disabled={downloading}>
                {downloading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                Download debit note PDF
              </Button>
            )}
          </div>
        )}

        {/* Stock update section */}
        {report.stock_updated ? (
          <div className="rounded-xl border border-green-400/40 bg-green-500/10 p-5">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">
                {report.stock_updated_by_name ? 'Stock updated manually' : 'Stock automatically updated'}
              </span>
            </div>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400/80">
              Added {report.accepted_quantity.toLocaleString()} units to {shipment.product_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {report.stock_updated_at && formatDateTime(report.stock_updated_at)}
              {report.stock_updated_by_name && ` · By: ${report.stock_updated_by_name}`}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-5">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Stock update pending</span>
            </div>
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400/80">
              Review the report above, then update stock to complete this shipment.
            </p>
            <Button className="mt-3 bg-amber-600 text-white hover:bg-amber-700" onClick={() => setStockDialog(true)}>
              Update product stock
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<IncomingShipment | null>(null);
  const [loading, setLoading]   = useState(true);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await inspectionService.getShipment(id);
      setShipment(res.data);
    } catch {
      show('Failed to load shipment.', true);
    } finally {
      setLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Shipment not found.
      </div>
    );
  }

  const hasReport = shipment.report !== null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={() => navigate('/admin/inspection')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Inspection
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono font-semibold text-sm">{shipment.po_number}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {msg && <div className={cn('rounded-md px-4 py-3 text-sm', msg.err ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-400')}>{msg.text}</div>}

        {/* Shipment header card */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{shipment.product_name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {shipment.vendor_company} · PO: <span className="font-mono">{shipment.po_number}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-0.5 text-sm font-medium">
                Expected: {shipment.expected_quantity.toLocaleString()} units
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-medium',
                shipment.status === 'awaiting_inspection'
                  ? 'border-blue-400/40 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'border-green-400/40 bg-green-500/10 text-green-700 dark:text-green-400',
              )}>
                {shipment.status === 'awaiting_inspection' ? 'Awaiting inspection' : 'Completed'}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <span>Price: {formatMoney(shipment.price_per_unit)}/unit</span>
            <span>Total: {formatMoney(shipment.total_amount)}</span>
            <span>Created: {formatDate(shipment.created_at)}</span>
          </div>
        </div>

        {/* Main content */}
        {hasReport ? (
          <InspectionLedger shipment={shipment} onStockUpdated={load} />
        ) : (
          <InspectionForm shipment={shipment} onSubmitted={load} />
        )}
      </div>
    </div>
  );
}
