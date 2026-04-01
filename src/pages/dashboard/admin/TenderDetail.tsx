import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle, MessageSquare, X } from 'lucide-react';
import { Button } from '@components/ui/Button';
import { tenderService } from '@/services/tenderService';
import { cn } from '@utils/cn';
import type { Tender, TenderStatus, BidStatus, BidComparison } from '@/types/tender.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(iso));
}

function formatMoney(v: string | number) {
  return `\u20B9${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function deadlineLabel(iso: string | null): { text: string; urgent: boolean } {
  if (!iso) return { text: 'No deadline', urgent: false };
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: 'Deadline passed', urgent: true };
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 48) return { text: `${hours}h remaining`, urgent: true };
  const days = Math.floor(diff / 86_400_000);
  return { text: `${days}d remaining`, urgent: false };
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 4000);
  };
  return { msg, show };
}

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<TenderStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100   text-gray-600   border-gray-300' },
  open:      { label: 'Open',      className: 'bg-green-100  text-green-800  border-green-300' },
  closed:    { label: 'Closed',    className: 'bg-blue-100   text-blue-800   border-blue-300' },
  awarded:   { label: 'Awarded',   className: 'bg-purple-100 text-purple-800 border-purple-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100    text-red-800    border-red-300' },
};

const BID_STATUS_CFG: Record<BidStatus, { label: string; className: string }> = {
  bid_submitted:     { label: 'Bid Submitted',     className: 'bg-blue-100   text-blue-800   border-blue-300' },
  under_negotiation: { label: 'Under Negotiation', className: 'bg-amber-100  text-amber-800  border-amber-300' },
  bid_revised:       { label: 'Bid Revised',       className: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  awarded:           { label: 'Awarded',           className: 'bg-green-100  text-green-800  border-green-300' },
  not_awarded:       { label: 'Not Awarded',       className: 'bg-gray-100   text-gray-600   border-gray-300' },
};

// ── Cancel Dialog ─────────────────────────────────────────────────────────────

function CancelDialog({
  onConfirm, onCancel, loading,
}: { onConfirm: (reason: string) => void; onCancel: () => void; loading: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Cancel tender?</h3>
        <p className="mb-4 text-sm text-muted-foreground">This cannot be undone.</p>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancellation (optional)\u2026"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Keep</Button>
          <Button
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onConfirm(reason)}
            disabled={loading}
          >
            {loading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Cancelling\u2026</> : 'Confirm Cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Award Confirm Dialog ──────────────────────────────────────────────────────

function AwardDialog({
  itemCount, onConfirm, onCancel, loading,
}: { itemCount: number; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold">Confirm award?</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          You are awarding {itemCount} product{itemCount !== 1 ? 's' : ''} to the selected vendors.
          Purchase orders will be generated automatically.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Awarding\u2026</> : 'Confirm Award'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Negotiate Panel ───────────────────────────────────────────────────────────

function NegotiatePanel({
  tenderId, bidId, vendorName, onDone, onClose,
}: {
  tenderId: string;
  bidId: string;
  vendorName: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!notes.trim()) { setError('Please enter negotiation notes.'); return; }
    setSaving(true);
    try {
      await tenderService.negotiate(tenderId, bidId, notes);
      onDone();
    } catch {
      setError('Failed to send negotiation notes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-md border border-amber-400/40 bg-amber-500/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Negotiate with {vendorName}
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Enter your negotiation notes for the vendor\u2026"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <MessageSquare className="mr-1 h-3 w-3" />}
          Send
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Tab 1: Products & Bids ────────────────────────────────────────────────────

function ProductsBidsTab({
  tender,
  comparison,
  onRefresh,
}: {
  tender: Tender;
  comparison: BidComparison[];
  onRefresh: () => void;
}) {
  const [negotiatingBid, setNegotiatingBid] = useState<{
    tenderId: string;
    bidId: string;
    vendor: string;
  } | null>(null);

  const canNegotiate = tender.status === 'open' || tender.status === 'closed';

  if (comparison.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        No bids received yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comparison.map((item) => {
        const { tender_item, bids } = item;
        return (
          <div key={tender_item.id} className="rounded-xl border bg-card overflow-hidden">
            {/* Item header */}
            <div className="border-b bg-muted/30 px-5 py-3">
              <h3 className="font-semibold">{tender_item.product_name}</h3>
              <p className="text-xs text-muted-foreground">
                Required: {tender_item.required_quantity.toLocaleString()} units
                {tender_item.target_price && ` \u00b7 Target: ${formatMoney(tender_item.target_price)}/unit`}
              </p>
            </div>

            {bids.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">No bids for this item.</p>
            ) : (
              <div className="divide-y">
                {bids.map((bid) => {
                  const bidCfg = BID_STATUS_CFG[bid.bid_status];
                  const isNeg = negotiatingBid?.bidId === bid.bid_id;
                  const vsTarget = bid.vs_target;
                  const vsClass =
                    vsTarget === null
                      ? ''
                      : vsTarget <= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400';

                  return (
                    <div key={bid.bid_id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{bid.vendor_name}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-sm">
                            <span>Qty: {bid.supply_quantity.toLocaleString()}</span>
                            <span>Price: {formatMoney(bid.price_per_unit)}/unit</span>
                            <span>Total: {formatMoney(bid.total_value)}</span>
                            {vsTarget !== null && (
                              <span className={cn('font-medium', vsClass)}>
                                {vsTarget > 0 ? '+' : ''}{vsTarget.toFixed(1)}% vs target
                              </span>
                            )}
                            <span className="text-muted-foreground">
                              Dispatch: {formatDate(bid.dispatch_date)}
                            </span>
                          </div>
                          {bid.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{bid.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${bidCfg.className}`}
                          >
                            {bidCfg.label}
                          </span>
                          {canNegotiate &&
                            bid.bid_status !== 'awarded' &&
                            bid.bid_status !== 'not_awarded' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setNegotiatingBid(
                                    isNeg
                                      ? null
                                      : {
                                          tenderId: tender.id,
                                          bidId: bid.bid_id,
                                          vendor: bid.vendor_name,
                                        },
                                  )
                                }
                              >
                                <MessageSquare className="mr-1 h-3 w-3" />
                                Negotiate
                              </Button>
                            )}
                        </div>
                      </div>

                      {isNeg && negotiatingBid && (
                        <NegotiatePanel
                          tenderId={negotiatingBid.tenderId}
                          bidId={negotiatingBid.bidId}
                          vendorName={negotiatingBid.vendor}
                          onDone={() => {
                            setNegotiatingBid(null);
                            onRefresh();
                          }}
                          onClose={() => setNegotiatingBid(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 2: Award ──────────────────────────────────────────────────────────────

function AwardTab({
  tender,
  comparison,
  onAwarded,
}: {
  tender: Tender;
  comparison: BidComparison[];
  onAwarded: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const { msg, show } = useToast();

  const canAward = tender.status === 'closed';
  const isAlreadyAwarded = tender.status === 'awarded';
  const selectedCount = Object.keys(selections).length;
  const totalItems = comparison.length;

  const handleAward = async () => {
    setAwarding(true);
    try {
      await tenderService.awardTender(tender.id, { awards: selections });
      setShowConfirm(false);
      onAwarded();
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } };
      const d = err?.response?.data;
      const errMsg = d ? Object.values(d).flat().join(' ') : 'Failed to award tender.';
      show(String(errMsg), true);
      setShowConfirm(false);
    } finally {
      setAwarding(false);
    }
  };

  if (comparison.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
        No bids to award.
      </div>
    );
  }

  return (
    <>
      {showConfirm && (
        <AwardDialog
          itemCount={selectedCount}
          onConfirm={handleAward}
          onCancel={() => setShowConfirm(false)}
          loading={awarding}
        />
      )}

      <div className="space-y-6">
        {msg && (
          <div
            className={cn(
              'rounded-md px-4 py-3 text-sm',
              msg.err
                ? 'bg-destructive/10 text-destructive'
                : 'bg-green-500/10 text-green-700 dark:text-green-400',
            )}
          >
            {msg.text}
          </div>
        )}

        {isAlreadyAwarded && (
          <div className="rounded-xl border border-green-400/40 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Tender Awarded</span>
            </div>
            {tender.awarded_at && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400/80">
                Awarded on {formatDate(tender.awarded_at)}
              </p>
            )}
          </div>
        )}

        {comparison.map((item) => {
          const { tender_item, bids } = item;
          const selected = selections[tender_item.id];
          const awardedBid = isAlreadyAwarded
            ? bids.find((b) => b.bid_status === 'awarded')
            : null;

          return (
            <div key={tender_item.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b bg-muted/30 px-5 py-3">
                <h3 className="font-semibold">{tender_item.product_name}</h3>
                <p className="text-xs text-muted-foreground">
                  Required: {tender_item.required_quantity.toLocaleString()} units
                  {tender_item.target_price &&
                    ` \u00b7 Target: ${formatMoney(tender_item.target_price)}/unit`}
                </p>
              </div>

              {isAlreadyAwarded ? (
                <div className="px-5 py-4">
                  {awardedBid ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="font-medium">{awardedBid.vendor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {awardedBid.supply_quantity.toLocaleString()} units
                          {' \u00b7 '}
                          {formatMoney(awardedBid.price_per_unit)}/unit
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not awarded</p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {bids.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">
                      No bids for this item.
                    </p>
                  ) : (
                    bids.map((bid) => {
                      const isSelected = selected === bid.bid_id;
                      const vsTarget = bid.vs_target;
                      const vsClass =
                        vsTarget === null
                          ? ''
                          : vsTarget <= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400';

                      return (
                        <label
                          key={bid.bid_id}
                          className={cn(
                            'flex items-start gap-3 px-5 py-4 transition-colors',
                            canAward ? 'cursor-pointer' : 'cursor-default',
                            isSelected ? 'bg-primary/5' : canAward ? 'hover:bg-muted/40' : '',
                          )}
                        >
                          {canAward ? (
                            <input
                              type="radio"
                              name={tender_item.id}
                              value={bid.bid_id}
                              checked={isSelected}
                              onChange={() =>
                                setSelections((s) => ({
                                  ...s,
                                  [tender_item.id]: bid.bid_id,
                                }))
                              }
                              className="mt-1 h-4 w-4 text-primary"
                            />
                          ) : (
                            <div className="mt-1 h-4 w-4 rounded-full border-2 border-border shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{bid.vendor_name}</p>
                            <div className="mt-0.5 flex flex-wrap gap-3 text-sm">
                              <span>Qty: {bid.supply_quantity.toLocaleString()}</span>
                              <span>Price: {formatMoney(bid.price_per_unit)}/unit</span>
                              <span>Total: {formatMoney(bid.total_value)}</span>
                              {vsTarget !== null && (
                                <span className={cn('font-medium', vsClass)}>
                                  {vsTarget > 0 ? '+' : ''}{vsTarget.toFixed(1)}% vs target
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="mt-1 h-5 w-5 text-primary shrink-0" />
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}

        {canAward && (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-semibold">Award Summary</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedCount} of {totalItems} product{totalItems !== 1 ? 's' : ''} selected
            </p>
            {selectedCount > 0 && (
              <div className="mb-4 space-y-2 text-sm">
                {comparison.map((item) => {
                  const bidId = selections[item.tender_item.id];
                  if (!bidId) return null;
                  const bid = item.bids.find((b) => b.bid_id === bidId);
                  if (!bid) return null;
                  return (
                    <div key={item.tender_item.id} className="flex justify-between">
                      <span className="text-muted-foreground">{item.tender_item.product_name}</span>
                      <span className="font-medium">
                        {bid.vendor_name} \u2014 {formatMoney(bid.total_value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              disabled={selectedCount === 0 || selectedCount < totalItems}
              onClick={() => setShowConfirm(true)}
            >
              Confirm Award ({selectedCount}/{totalItems})
            </Button>
            {selectedCount > 0 && selectedCount < totalItems && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Select a bid for all {totalItems} products to proceed.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TenderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tender, setTender] = useState<Tender | null>(null);
  const [comparison, setComparison] = useState<BidComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bids' | 'award'>('bids');
  const [acting, setActing] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const { msg, show } = useToast();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        tenderService.getTender(id),
        tenderService.getComparison(id),
      ]);
      setTender(tRes.data);
      setComparison(cRes.data);
    } catch {
      show('Failed to load tender.', true);
    } finally {
      setLoading(false);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    if (!tender) return;
    setActing(true);
    try {
      await tenderService.openTender(tender.id);
      show('Tender opened for bidding.');
      load();
    } catch {
      show('Failed to open tender.', true);
    } finally {
      setActing(false);
    }
  };

  const handleClose = async () => {
    if (!tender) return;
    setActing(true);
    try {
      await tenderService.closeTender(tender.id);
      show('Tender closed.');
      setActiveTab('award');
      load();
    } catch {
      show('Failed to close tender.', true);
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!tender) return;
    setActing(true);
    try {
      await tenderService.cancelTender(tender.id, reason);
      show('Tender cancelled.');
      setShowCancel(false);
      load();
    } catch {
      show('Failed to cancel tender.', true);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Tender not found.
      </div>
    );
  }

  const statusCfg = STATUS_CFG[tender.status];
  const deadline = deadlineLabel(tender.bidding_deadline);
  const showAwardTab = tender.status === 'closed' || tender.status === 'awarded';

  return (
    <div className="min-h-screen bg-background">
      {showCancel && (
        <CancelDialog
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
          loading={acting}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/admin/tender')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tender
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono font-semibold text-sm">{tender.tender_number}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
          >
            {statusCfg.label}
          </span>
          {tender.bidding_deadline && (
            <span
              className={cn(
                'text-xs',
                deadline.urgent ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
              )}
            >
              {deadline.text}
            </span>
          )}

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-2">
            {acting && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            {tender.status === 'draft' && (
              <>
                <Button size="sm" onClick={handleOpen} disabled={acting}>
                  Open for Bidding
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancel(true)}
                  disabled={acting}
                >
                  Cancel
                </Button>
              </>
            )}
            {tender.status === 'open' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  disabled={acting}
                >
                  Close Bidding
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCancel(true)}
                  disabled={acting}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {msg && (
          <div
            className={cn(
              'rounded-md px-4 py-3 text-sm',
              msg.err
                ? 'bg-destructive/10 text-destructive'
                : 'bg-green-500/10 text-green-700 dark:text-green-400',
            )}
          >
            {msg.text}
          </div>
        )}

        {/* Tender info card */}
        <div className="rounded-xl border bg-card p-6">
          <h1 className="text-xl font-bold">{tender.title}</h1>
          {tender.description && (
            <p className="mt-1 text-sm text-muted-foreground">{tender.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Items: {tender.items.length}</span>
            <span>Bids: {tender.bids.length}</span>
            {tender.bidding_deadline && (
              <span>Deadline: {formatDate(tender.bidding_deadline)}</span>
            )}
            {tender.closed_at && <span>Closed: {formatDate(tender.closed_at)}</span>}
            {tender.awarded_at && <span>Awarded: {formatDate(tender.awarded_at)}</span>}
            {tender.cancellation_reason && (
              <span>Reason: {tender.cancellation_reason}</span>
            )}
            <span>Created: {formatDate(tender.created_at)}</span>
          </div>
        </div>

        {/* Awarded banner */}
        {tender.status === 'awarded' && (
          <div className="rounded-xl border border-green-400/40 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Tender Successfully Awarded</span>
            </div>
            {tender.awarded_at && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400/80">
                Awarded on {formatDate(tender.awarded_at)} \u00b7 Purchase orders have been generated.
              </p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('bids')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'bids'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Products & Bids
          </button>
          {showAwardTab && (
            <button
              onClick={() => setActiveTab('award')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'award'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Award
            </button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'bids' && (
          <ProductsBidsTab
            tender={tender}
            comparison={comparison}
            onRefresh={load}
          />
        )}
        {activeTab === 'award' && showAwardTab && (
          <AwardTab
            tender={tender}
            comparison={comparison}
            onAwarded={() => {
              load();
              setActiveTab('bids');
            }}
          />
        )}
      </div>
    </div>
  );
}
