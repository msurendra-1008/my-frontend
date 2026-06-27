import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/axiosInstance';
import { deliveryService } from '@/services/deliveryService';
import type { PartnerAssignment, DeliveryStatus } from '@/types/delivery.types';
import {
  Package, Truck, CheckCircle, XCircle, Clock,
  Camera, AlertTriangle, LogOut, RefreshCw,
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

/* ── Modal: mark delivered ── */
function DeliveredModal({
  assignment,
  onClose,
  onDone,
}: {
  assignment: PartnerAssignment;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [proof, setProof]   = useState<File | null>(null);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    setSaving(true);
    setError('');
    const fd = new FormData();
    fd.append('status', 'delivered');
    fd.append('notes', notes);
    if (proof) fd.append('proof_image', proof);
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
        <h2 className="text-sm font-semibold text-foreground mb-1">Mark as Delivered</h2>
        <p className="text-xs text-muted-foreground mb-4">{assignment.order_number} · {assignment.customer_name}</p>

        <div className="space-y-3">
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => setProof(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Left at door, etc."
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-md bg-green-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm Delivered'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal: mark failed ── */
function FailedModal({
  assignment,
  onClose,
  onDone,
}: {
  assignment: PartnerAssignment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!reason.trim()) { setError('Please provide a failure reason.'); return; }
    setSaving(true);
    setError('');
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
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
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
            <textarea
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm text-muted-foreground">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Report Failed'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Assignment card ── */
function AssignmentCard({
  assignment,
  onRefresh,
}: {
  assignment: PartnerAssignment;
  onRefresh: () => void;
}) {
  const [deliveredModal, setDeliveredModal] = useState(false);
  const [failedModal, setFailedModal]       = useState(false);
  const [pickingUp, setPickingUp]           = useState(false);

  const statusCfg = STATUS[assignment.status] ?? STATUS.assigned;

  async function markPickedUp() {
    setPickingUp(true);
    const fd = new FormData();
    fd.append('status', 'picked_up');
    try {
      await deliveryService.updateMyStatus(assignment.id, fd);
      onRefresh();
    } catch { /* ignore */ }
    finally { setPickingUp(false); }
  }

  return (
    <>
      <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-foreground">{assignment.order_number}</p>
            <p className="text-xs text-muted-foreground">{assignment.customer_name} · {assignment.customer_phone}</p>
          </div>
          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium', statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground border border-border/40 rounded-md px-3 py-2 bg-muted/30">
          📍 {assignment.delivery_address}
        </p>

        {/* OTP */}
        {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
          <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">Delivery OTP:</span>
            <span className="font-mono text-lg font-bold text-primary tracking-widest">{assignment.otp}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {assignment.status === 'assigned' && (
            <button
              onClick={markPickedUp}
              disabled={pickingUp}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-400/40 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 disabled:opacity-50"
            >
              <Truck size={14} /> {pickingUp ? 'Updating…' : 'Picked Up'}
            </button>
          )}
          {assignment.status === 'picked_up' && (
            <>
              <button
                onClick={() => setDeliveredModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 border border-green-400/40 py-2 text-sm font-medium text-green-600 dark:text-green-400"
              >
                <CheckCircle size={14} /> Delivered
              </button>
              <button
                onClick={() => setFailedModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 border border-red-400/40 py-2 text-sm font-medium text-red-600 dark:text-red-400"
              >
                <XCircle size={14} /> Failed
              </button>
            </>
          )}
        </div>

        {/* Timeline */}
        {assignment.logs.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/30">
            {assignment.logs.slice(0, 3).map(log => (
              <div key={log.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="capitalize">{log.status.replace('_', ' ')}</span>
                <span className="ml-auto">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {deliveredModal && (
        <DeliveredModal
          assignment={assignment}
          onClose={() => setDeliveredModal(false)}
          onDone={() => { setDeliveredModal(false); onRefresh(); }}
        />
      )}
      {failedModal && (
        <FailedModal
          assignment={assignment}
          onClose={() => setFailedModal(false)}
          onDone={() => { setFailedModal(false); onRefresh(); }}
        />
      )}
    </>
  );
}

/* ── Main dashboard ── */
export function DeliveryPartnerDashboard() {
  const { user, clearAuth }   = useAuthStore();
  const navigate              = useNavigate();
  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'active' | 'history'>('active');

  useEffect(() => { load(); }, [tab]);

  function load() {
    setLoading(true);
    const params = tab === 'active'
      ? { status: 'assigned,picked_up' }
      : { status: 'delivered,failed,cancelled' };
    // For active: fetch both assigned and picked_up separately
    if (tab === 'active') {
      Promise.all([
        deliveryService.getMyAssignments({ status: 'assigned' }),
        deliveryService.getMyAssignments({ status: 'picked_up' }),
      ]).then(([a, p]) => {
        setAssignments([...(a.data.results ?? []), ...(p.data.results ?? [])]);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      Promise.all([
        deliveryService.getMyAssignments({ status: 'delivered' }),
        deliveryService.getMyAssignments({ status: 'failed' }),
        deliveryService.getMyAssignments({ status: 'cancelled' }),
      ]).then(([d, f, c]) => {
        setAssignments([...(d.data.results ?? []), ...(f.data.results ?? []), ...(c.data.results ?? [])]);
      }).catch(() => {}).finally(() => setLoading(false));
    }
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
          <button
            onClick={load}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border/50 bg-card">
        <button
          onClick={() => setTab('active')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors border-b-2',
            tab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground',
          )}
        >
          Active
        </button>
        <button
          onClick={() => setTab('history')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors border-b-2',
            tab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground',
          )}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {tab === 'active' ? 'No active deliveries' : 'No completed deliveries'}
            </p>
          </div>
        ) : (
          assignments.map(a => (
            <AssignmentCard key={a.id} assignment={a} onRefresh={load} />
          ))
        )}
      </div>
    </div>
  );
}
