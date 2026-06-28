import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import { deliveryService } from '@/services/deliveryService';
import type { PartnerAssignment, DeliveryStatus } from '@/types/delivery.types';
import {
  Package, Truck, CheckCircle, XCircle,
  Camera, LogOut, RefreshCw, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/* ── Status config ── */
const STATUS: Record<DeliveryStatus, { label: string; color: string }> = {
  assigned:  { label: 'Assigned',  color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  picked_up: { label: 'Picked Up', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  delivered: { label: 'Delivered', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  failed:    { label: 'Failed',    color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS[status] ?? STATUS.assigned;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.color)}>
      {cfg.label}
    </span>
  );
}

/* ── Modal: proof of delivery ── */
function ProofOfDeliveryModal({
  assignment, onClose, onDone,
}: { assignment: PartnerAssignment; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [proofTab, setProofTab] = useState<'photo' | 'otp'>('photo');
  const [proof, setProof]       = useState<File | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function submit() {
    if (proofTab === 'otp' && otpInput.trim().length !== 6) {
      setError('Please enter the 6-digit OTP shown on the customer\'s screen.');
      return;
    }
    setSaving(true); setError('');
    const fd = new FormData();
    fd.append('status', 'delivered');
    fd.append('notes', notes);
    if (proofTab === 'photo') {
      if (proof) fd.append('proof_image', proof);
    } else {
      fd.append('proof_type', 'otp');
      fd.append('otp_input', otpInput.trim());
    }
    try {
      await deliveryService.updateMyStatus(assignment.id, fd);
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to mark as delivered.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 shadow-2xl">
        <h2 className="text-sm font-semibold text-foreground mb-1">Confirm Delivery</h2>
        <p className="text-xs text-muted-foreground mb-4">{assignment.order_number} · {assignment.customer_name}</p>

        {/* Proof type tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-4">
          <button
            onClick={() => { setProofTab('photo'); setError(''); }}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              proofTab === 'photo' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50',
            )}>
            <Camera size={12} className="inline mr-1" />Photo
          </button>
          <button
            onClick={() => { setProofTab('otp'); setError(''); }}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              proofTab === 'otp' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50',
            )}>
            OTP
          </button>
        </div>

        <div className="space-y-3">
          {proofTab === 'photo' ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 py-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {proof ? (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">{proof.name}</p>
              ) : (
                <>
                  <Camera size={20} className="text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Upload delivery proof photo</p>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => setProof(e.target.files?.[0] ?? null)} />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground">Enter OTP shown on customer's screen</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-2xl font-bold tracking-widest text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="mt-1 text-[10px] text-muted-foreground text-center">Ask the customer to show you their order OTP</p>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <textarea rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="Left at door, etc." />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Confirm Delivered'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: mark failed ── */
function FailedModal({
  assignment, onClose, onDone,
}: { assignment: PartnerAssignment; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!reason.trim()) { setError('Please provide a failure reason.'); return; }
    setSaving(true); setError('');
    const fd = new FormData();
    fd.append('status', 'failed');
    fd.append('failure_reason', reason);
    fd.append('notes', notes);
    try {
      await deliveryService.updateMyStatus(assignment.id, fd);
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to report.');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 shadow-2xl">
        <h2 className="text-sm font-semibold text-foreground mb-1">Report Failed Delivery</h2>
        <p className="text-xs text-muted-foreground mb-4">{assignment.order_number} · {assignment.customer_name}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Reason *</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">Select reason…</option>
              <option value="customer_unavailable">Customer unavailable</option>
              <option value="wrong_address">Wrong address</option>
              <option value="refused_delivery">Customer refused delivery</option>
              <option value="access_denied">Access denied</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <textarea rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Report Failed'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Expandable assignment card ── */
function AssignmentCard({
  assignment, onRefresh,
}: { assignment: PartnerAssignment; onRefresh: () => void }) {
  const [expanded, setExpanded]         = useState(false);
  const [proofModal, setProofModal]     = useState(false);
  const [failedModal, setFailed]        = useState(false);
  const [pickingUp, setPickingUp]       = useState(false);

  async function markPickedUp() {
    setPickingUp(true);
    const fd = new FormData();
    fd.append('status', 'picked_up');
    try { await deliveryService.updateMyStatus(assignment.id, fd); onRefresh(); }
    catch { /* ignore */ }
    finally { setPickingUp(false); }
  }

  const done = assignment.status === 'delivered' || assignment.status === 'failed' || assignment.status === 'cancelled';

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
          <div>
            <p className="font-mono text-xs font-semibold text-foreground">{assignment.order_number}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {assignment.customer_name}{assignment.customer_phone ? ` · ${assignment.customer_phone}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={assignment.status} />
            <ChevronDown size={15} className={cn('text-muted-foreground transition-transform', expanded && 'rotate-180')} />
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-border/30 px-4 py-4 space-y-3">
            {/* Address */}
            <div className="flex items-start gap-2 rounded-md bg-muted/30 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
              📍 {assignment.delivery_address}
            </div>

            {/* Actions */}
            {!done && (
              <div className="flex gap-2">
                {assignment.status === 'assigned' && (
                  <button onClick={markPickedUp} disabled={pickingUp}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-400/40 h-10 text-sm font-medium text-amber-700 dark:text-amber-400 disabled:opacity-50">
                    <Truck size={14} /> {pickingUp ? 'Updating…' : 'Picked Up'}
                  </button>
                )}
                {assignment.status === 'picked_up' && (
                  <button onClick={() => setProofModal(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 border border-green-400/40 h-10 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle size={14} /> Delivered
                  </button>
                )}
                {assignment.status !== 'cancelled' && (
                  <button onClick={() => setFailed(true)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg border border-red-400/30 h-10 text-sm font-medium text-red-600 dark:text-red-400',
                      assignment.status === 'picked_up' ? 'flex-1' : 'px-4',
                    )}>
                    <XCircle size={14} /> Failed
                  </button>
                )}
              </div>
            )}

            {/* Timeline */}
            {assignment.logs.length > 0 && (
              <div className="border-t border-border/30 pt-3 space-y-1.5">
                {assignment.logs.map(log => (
                  <div key={log.id} className="flex justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{log.status.replace(/_/g, ' ')}</span>
                    <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {proofModal && (
        <ProofOfDeliveryModal assignment={assignment} onClose={() => setProofModal(false)}
          onDone={() => { setProofModal(false); onRefresh(); }} />
      )}
      {failedModal && (
        <FailedModal assignment={assignment} onClose={() => setFailed(false)}
          onDone={() => { setFailed(false); onRefresh(); }} />
      )}
    </>
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

/* ── Main dashboard ── */
export function DeliveryPartnerDashboard() {
  const { user, clearAuth }       = useAuthStore();
  const navigate                  = useNavigate();
  const [tab, setTab]             = useState<'active' | 'history'>('active');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [activeOrders, setActive] = useState<PartnerAssignment[]>([]);
  const [historyOrders, setHistory] = useState<PartnerAssignment[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { load(); }, [selectedDate]);

  function load() {
    setLoading(true);
    Promise.all([
      deliveryService.getMyAssignments({ status: 'assigned' }),
      deliveryService.getMyAssignments({ status: 'picked_up' }),
      deliveryService.getMyAssignments({ status: 'delivered' }),
      deliveryService.getMyAssignments({ status: 'failed' }),
      deliveryService.getMyAssignments({ status: 'cancelled' }),
    ]).then(([a, p, d, f, c]) => {
      setActive([...(a.data.results ?? []), ...(p.data.results ?? [])]);
      // Filter history by selectedDate based on assigned_at
      const allHistory = [...(d.data.results ?? []), ...(f.data.results ?? []), ...(c.data.results ?? [])];
      setHistory(allHistory.filter(h => h.assigned_at.startsWith(selectedDate)));
    }).catch(() => {}).finally(() => setLoading(false));
  }

  async function handleLogout() {
    const refresh = tokenStorage.getRefresh();
    try { if (refresh) await authService.logout(refresh); } catch { /**/ }
    clearAuth();
    navigate('/admin/login', { replace: true });
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  const isToday = selectedDate === todayIso();
  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Stats derived from active + today's history
  const todayActive    = activeOrders.filter(a => a.assigned_at.startsWith(selectedDate));
  const stats = {
    total:     todayActive.length + historyOrders.length,
    delivered: historyOrders.filter(h => h.status === 'delivered').length,
    pending:   activeOrders.length,
    failed:    historyOrders.filter(h => h.status === 'failed').length,
  };

  const displayOrders = tab === 'active' ? activeOrders : historyOrders;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-tight">{user?.full_name || user?.email}</p>
            <p className="text-[10px] text-muted-foreground">Delivery Partner</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <RefreshCw size={15} />
          </button>
          <button onClick={handleLogout} className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border/50 bg-card">
        {(['active', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 capitalize',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground',
            )}>
            {t === 'active' ? `Active (${activeOrders.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-center gap-3 py-3 border-b border-border/30 bg-card/50">
        <button onClick={() => setSelectedDate(d => shiftDate(d, -1))}
          className="p-1 rounded hover:bg-muted text-muted-foreground">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-foreground min-w-[100px] text-center">{dateLabel}</span>
        <button onClick={() => setSelectedDate(d => shiftDate(d, 1))}
          disabled={isToday}
          className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
        <input
          type="date"
          value={selectedDate}
          max={todayIso()}
          onChange={e => setSelectedDate(e.target.value)}
          className="ml-1 h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border/30">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-foreground' },
          { label: 'Delivered', value: stats.delivered, color: 'text-green-600 dark:text-green-400' },
          { label: 'Pending',   value: stats.pending,   color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Failed',    value: stats.failed,    color: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-muted/40 p-2 text-center">
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : displayOrders.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {tab === 'active' ? 'No active deliveries' : `No history for ${dateLabel}`}
            </p>
          </div>
        ) : (
          displayOrders.map(a => (
            <AssignmentCard key={a.id} assignment={a} onRefresh={load} />
          ))
        )}
      </div>
    </div>
  );
}
