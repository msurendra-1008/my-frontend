import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryAssignment, DeliveryStatus } from '@/types/delivery.types';
import { Package, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; icon: React.ReactNode; color: string }> = {
  assigned:  { label: 'Assigned',   icon: <Clock size={12} />,        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  picked_up: { label: 'Picked Up',  icon: <Package size={12} />,      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  delivered: { label: 'Delivered',  icon: <CheckCircle size={12} />,  color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  failed:    { label: 'Failed',     icon: <XCircle size={12} />,      color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  cancelled: { label: 'Cancelled',  icon: <XCircle size={12} />,      color: 'bg-muted text-muted-foreground' },
};

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.assigned;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.color)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function DeliveryTrackingPage() {
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [assignments, setAssignments]     = useState<DeliveryAssignment[]>([]);
  const [loading, setLoading]             = useState(true);
  const [statusFilter, setStatusFilter]   = useState('');
  const [selected, setSelected]           = useState<DeliveryAssignment | null>(null);

  useEffect(() => { load(); }, [statusFilter]);

  function load() {
    setLoading(true);
    deliveryService.getAssignments(statusFilter ? { status: statusFilter } : {})
      .then(r => setAssignments(r.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const STATUSES = ['', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled'];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/50 bg-card px-6 py-3 flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground">Delivery Tracking</h1>
          <p className="text-xs text-muted-foreground">Live status of all delivery assignments</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Filters */}
          <div className="mb-4 flex gap-2 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {s === '' ? 'All' : STATUS_CONFIG[s as DeliveryStatus]?.label ?? s}
              </button>
            ))}
          </div>

          <div className="flex gap-4">
            {/* Assignment list */}
            <div className="flex-1 rounded-lg border border-border/50 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
              ) : assignments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No assignments found</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {assignments.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                        selected?.id === a.id && 'bg-primary/5',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-sm text-foreground">{a.order_number}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{a.partner_name ?? 'Unassigned'}</p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="w-80 rounded-lg border border-border/50 bg-card p-4 space-y-4 flex-shrink-0 self-start">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">{selected.order_number}</h2>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs">Close</button>
                </div>
                <StatusBadge status={selected.status} />

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Customer: </span>
                    <span className="text-foreground">{selected.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address: </span>
                    <span className="text-foreground">{selected.delivery_address}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Partner: </span>
                    <span className="text-foreground">{selected.partner_name ?? '—'}</span>
                    {selected.partner_mobile && <span className="text-muted-foreground"> · {selected.partner_mobile}</span>}
                  </div>
                  <div>
                    <span className="text-muted-foreground">OTP: </span>
                    <span className="text-foreground font-mono font-semibold">{selected.otp}</span>
                  </div>
                  {selected.picked_up_at && (
                    <div>
                      <span className="text-muted-foreground">Picked up: </span>
                      <span className="text-foreground">{new Date(selected.picked_up_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selected.delivered_at && (
                    <div>
                      <span className="text-muted-foreground">Delivered: </span>
                      <span className="text-foreground">{new Date(selected.delivered_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selected.failure_reason && (
                    <div>
                      <span className="text-muted-foreground">Failure reason: </span>
                      <span className="text-red-600 dark:text-red-400">{selected.failure_reason}</span>
                    </div>
                  )}
                  {selected.proof_image && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Proof:</span>
                      <img src={selected.proof_image} alt="Delivery proof" className="rounded-md border border-border max-w-full" />
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {selected.logs.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">Timeline</h3>
                    <div className="space-y-2">
                      {selected.logs.map(log => (
                        <div key={log.id} className="flex gap-2">
                          <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground capitalize">{log.status.replace('_', ' ')}</p>
                            {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                            <p className="text-[10px] text-muted-foreground/60">{new Date(log.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
