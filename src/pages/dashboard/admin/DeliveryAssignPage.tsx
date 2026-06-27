import { useState, useEffect, useMemo } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryPartner, UnassignedOrder } from '@/types/delivery.types';
import { Search, Truck, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export function DeliveryAssignPage() {
  const [mobileOpen, setMobileOpen]             = useState(false);
  const [orders, setOrders]                     = useState<UnassignedOrder[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState('');
  const [selected, setSelected]                 = useState<UnassignedOrder | null>(null);
  const [eligiblePartners, setEligiblePartners] = useState<DeliveryPartner[]>([]);
  const [allPartners, setAllPartners]           = useState<DeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners]   = useState(false);
  const [manualPartnerId, setManualPartnerId]   = useState('');
  const [assigning, setAssigning]               = useState(false);
  const [success, setSuccess]                   = useState('');
  const [error, setError]                       = useState('');

  useEffect(() => {
    deliveryService.getPartners()
      .then(r => setAllPartners(r.data.results ?? []))
      .catch(() => {});
    loadUnassigned();
  }, []);

  function loadUnassigned() {
    setLoading(true);
    deliveryService.getUnassignedOrders()
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Client-side search filter
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o =>
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.address_city.toLowerCase().includes(q) ||
      o.address_pincode.includes(q),
    );
  }, [orders, search]);

  async function selectOrder(order: UnassignedOrder) {
    setSelected(order);
    setEligiblePartners([]);
    setManualPartnerId('');
    setSuccess('');
    setError('');
    setLoadingPartners(true);
    try {
      const r = await deliveryService.suggestPartners(order.order_id);
      setEligiblePartners(r.data.eligible_partners ?? []);
    } catch { setError('Failed to load eligible partners.'); }
    finally { setLoadingPartners(false); }
  }

  async function doAssign(partnerId: string) {
    if (!selected || !partnerId) return;
    setAssigning(true);
    setError('');
    try {
      await deliveryService.assignPartner(selected.order_id, partnerId);
      setSuccess(`Assigned! Order ${selected.order_number} is now in transit.`);
      loadUnassigned();
      setSelected(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assignment failed.');
    } finally { setAssigning(false); }
  }

  async function doAutoAssign(order: UnassignedOrder) {
    setAssigning(true);
    setError('');
    setSuccess('');
    try {
      await deliveryService.autoAssign(order.order_id);
      setSuccess(`Auto-assigned! Order ${order.order_number} is now in transit.`);
      loadUnassigned();
      setSelected(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'No eligible partner found.');
    } finally { setAssigning(false); }
  }

  function partnerLabel(p: DeliveryPartner) {
    const parts = [p.full_name];
    if (p.mobile) parts.push(p.mobile);
    parts.push(p.vehicle_type);
    parts.push(`${p.active_assignments} active`);
    return parts.join(' · ');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/50 bg-card px-6 py-3 flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground">Assign Deliveries</h1>
          <p className="text-xs text-muted-foreground">Manually assign packed orders to delivery partners</p>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {success && (
            <div className="mb-4 rounded-md border border-green-400/40 bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <CheckCircle size={14} /> {success}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            {/* Unassigned orders list */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
                  placeholder="Search by order number, customer, city…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No packed orders awaiting delivery</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {filteredOrders.map(o => (
                      <div
                        key={o.order_id}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors',
                          selected?.order_id === o.order_id && 'bg-primary/5',
                        )}
                      >
                        <button className="flex-1 text-left" onClick={() => selectOrder(o)}>
                          <span className="font-medium text-sm text-foreground">{o.order_number}</span>
                          <p className="text-xs text-muted-foreground">
                            {o.customer_name} · {o.address_city} · {o.address_pincode}
                          </p>
                          <p className="text-xs text-muted-foreground">{o.item_count} item{o.item_count !== 1 ? 's' : ''}</p>
                        </button>
                        <button
                          onClick={() => doAutoAssign(o)}
                          disabled={assigning}
                          className="ml-2 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                        >
                          <Truck size={11} /> Auto
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Partner selection panel */}
            {selected && (
              <div className="w-80 flex-shrink-0 space-y-3">
                <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground mb-0.5">Eligible Partners</h2>
                    <p className="text-xs text-muted-foreground">for {selected.order_number} · {selected.address_pincode}</p>
                  </div>

                  {loadingPartners && <p className="text-sm text-muted-foreground">Finding partners…</p>}

                  {!loadingPartners && eligiblePartners.length > 0 && (
                    <div className="space-y-2">
                      {eligiblePartners.map(p => (
                        <div key={p.id} className="rounded-md border border-border/50 bg-muted/30 p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {p.vehicle_type}{p.vehicle_number ? ` · ${p.vehicle_number}` : ''} · {p.active_assignments} active
                            </p>
                            {p.mobile && <p className="text-xs text-muted-foreground">{p.mobile}</p>}
                          </div>
                          <button
                            onClick={() => doAssign(p.id)}
                            disabled={assigning}
                            className="flex-shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!loadingPartners && eligiblePartners.length === 0 && (
                    <p className="text-xs text-muted-foreground">No zone-matched partners for this pincode.</p>
                  )}

                  {/* Fallback: choose any active partner */}
                  <div className="border-t border-border/40 pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {eligiblePartners.length > 0 ? 'Or choose any partner:' : 'Choose any active partner:'}
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={manualPartnerId}
                        onChange={e => setManualPartnerId(e.target.value)}
                        className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="">Select partner…</option>
                        {allPartners
                          .filter(p => p.is_active)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {partnerLabel(p)}
                            </option>
                          ))
                        }
                      </select>
                      <button
                        onClick={() => doAssign(manualPartnerId)}
                        disabled={assigning || !manualPartnerId}
                        className="flex-shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                    {allPartners.filter(p => p.is_active).length === 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">No active partners available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
