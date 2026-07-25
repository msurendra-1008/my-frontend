import { useState, useEffect, useMemo } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryPartner, UnassignedOrder, UnassignedExchange, UnassignedReturnPickup } from '@/types/delivery.types';
import { Search, Truck, CheckCircle, ArrowLeftRight, PackageX } from 'lucide-react';
import { cn } from '@/utils/cn';

type Tab = 'orders' | 'exchanges' | 'pickups';

export function DeliveryAssignPage() {
  const [mobileOpen, setMobileOpen]             = useState(false);
  const [tab, setTab]                           = useState<Tab>('orders');

  // Orders tab state
  const [orders, setOrders]                     = useState<UnassignedOrder[]>([]);
  const [ordersLoading, setOrdersLoading]       = useState(true);
  const [selectedOrder, setSelectedOrder]       = useState<UnassignedOrder | null>(null);
  const [eligiblePartners, setEligiblePartners] = useState<DeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners]   = useState(false);

  // Exchanges tab state
  const [exchanges, setExchanges]               = useState<UnassignedExchange[]>([]);
  const [exchangesLoading, setExchangesLoading] = useState(true);
  const [selectedExchange, setSelectedExchange] = useState<UnassignedExchange | null>(null);

  // Pickups tab state
  const [pickups, setPickups]                   = useState<UnassignedReturnPickup[]>([]);
  const [pickupsLoading, setPickupsLoading]     = useState(true);
  const [selectedPickup, setSelectedPickup]     = useState<UnassignedReturnPickup | null>(null);

  // Shared
  const [allPartners, setAllPartners]           = useState<DeliveryPartner[]>([]);
  const [manualPartnerId, setManualPartnerId]   = useState('');
  const [search, setSearch]                     = useState('');
  const [assigning, setAssigning]               = useState(false);
  const [success, setSuccess]                   = useState('');
  const [error, setError]                       = useState('');

  useEffect(() => {
    deliveryService.getPartners()
      .then(r => setAllPartners(r.data.results ?? []))
      .catch(() => {});
    loadOrders();
    loadExchanges();
    loadPickups();
  }, []);

  function loadOrders() {
    setOrdersLoading(true);
    deliveryService.getUnassignedOrders()
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }

  function loadExchanges() {
    setExchangesLoading(true);
    deliveryService.getUnassignedExchanges()
      .then(r => setExchanges(r.data))
      .catch(() => {})
      .finally(() => setExchangesLoading(false));
  }

  function loadPickups() {
    setPickupsLoading(true);
    deliveryService.getUnassignedReturnPickups()
      .then(r => setPickups(r.data))
      .catch(() => {})
      .finally(() => setPickupsLoading(false));
  }

  function clearPanel() {
    setSelectedOrder(null);
    setSelectedExchange(null);
    setSelectedPickup(null);
    setEligiblePartners([]);
    setManualPartnerId('');
    setSuccess('');
    setError('');
  }

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

  const filteredExchanges = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return exchanges;
    return exchanges.filter(e =>
      (e.order_number ?? '').toLowerCase().includes(q) ||
      (e.customer_name ?? '').toLowerCase().includes(q) ||
      (e.address_city ?? '').toLowerCase().includes(q) ||
      (e.address_pincode ?? '').includes(q) ||
      (e.product_name ?? '').toLowerCase().includes(q),
    );
  }, [exchanges, search]);

  const filteredPickups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pickups;
    return pickups.filter(p =>
      (p.order_number ?? '').toLowerCase().includes(q) ||
      (p.customer_name ?? '').toLowerCase().includes(q) ||
      (p.address_city ?? '').toLowerCase().includes(q) ||
      (p.address_pincode ?? '').includes(q) ||
      (p.product_name ?? '').toLowerCase().includes(q),
    );
  }, [pickups, search]);

  async function selectOrder(order: UnassignedOrder) {
    clearPanel();
    setSelectedOrder(order);
    setLoadingPartners(true);
    try {
      const r = await deliveryService.suggestPartners(order.order_id);
      setEligiblePartners(r.data.eligible_partners ?? []);
    } catch { setError('Failed to load eligible partners.'); }
    finally { setLoadingPartners(false); }
  }

  function selectExchange(ex: UnassignedExchange) {
    clearPanel();
    setSelectedExchange(ex);
  }

  function selectPickup(pu: UnassignedReturnPickup) {
    clearPanel();
    setSelectedPickup(pu);
  }

  async function doAssignOrder(partnerId: string) {
    if (!selectedOrder || !partnerId) return;
    setAssigning(true); setError('');
    try {
      await deliveryService.assignPartner(selectedOrder.order_id, partnerId);
      setSuccess(`Assigned — order ${selectedOrder.order_number} is now in transit.`);
      loadOrders();
      setSelectedOrder(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assignment failed.');
    } finally { setAssigning(false); }
  }

  async function doAssignExchange(partnerId: string) {
    if (!selectedExchange || !partnerId) return;
    setAssigning(true); setError('');
    try {
      await deliveryService.assignExchangePartner(selectedExchange.assignment_id, partnerId);
      setSuccess(`Assigned — exchange for ${selectedExchange.order_number} is now in transit.`);
      loadExchanges();
      setSelectedExchange(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assignment failed.');
    } finally { setAssigning(false); }
  }

  async function doAssignPickup(partnerId: string) {
    if (!selectedPickup || !partnerId) return;
    setAssigning(true); setError('');
    try {
      await deliveryService.assignReturnPickupPartner(selectedPickup.assignment_id, partnerId);
      setSuccess(`Assigned — return pickup for ${selectedPickup.order_number} is now scheduled.`);
      loadPickups();
      setSelectedPickup(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assignment failed.');
    } finally { setAssigning(false); }
  }

  async function doAutoAssign(order: UnassignedOrder) {
    setAssigning(true); setError(''); setSuccess('');
    try {
      await deliveryService.autoAssign(order.order_id);
      setSuccess(`Auto-assigned — order ${order.order_number} is now in transit.`);
      loadOrders();
      clearPanel();
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

  const activePartners = allPartners.filter(p => p.is_active);
  const hasSelection   = !!(selectedOrder || selectedExchange || selectedPickup);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen(o => !o)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/50 bg-card px-6 py-3 flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground">Assign Deliveries</h1>
          <p className="text-xs text-muted-foreground">Manually assign deliveries and return pickups to partners</p>
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

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border/50">
            <button
              onClick={() => { setTab('orders'); clearPanel(); }}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'orders'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              Orders
              {orders.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('exchanges'); clearPanel(); }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'exchanges'
                  ? 'border-violet-500 text-violet-700 dark:text-violet-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <ArrowLeftRight size={13} /> Exchanges
              {exchanges.length > 0 && (
                <span className="ml-0.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400">
                  {exchanges.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('pickups'); clearPanel(); }}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === 'pickups'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <PackageX size={13} /> Return Pickups
              {pickups.length > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                  {pickups.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-4">
            {/* List panel */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
                  placeholder={
                    tab === 'orders'    ? 'Search by order number, customer, city…' :
                    tab === 'exchanges' ? 'Search by order number, customer, product…' :
                    'Search by order number, customer, product…'
                  }
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-border/50 overflow-hidden">
                {/* Orders tab */}
                {tab === 'orders' && (
                  ordersLoading ? (
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
                            selectedOrder?.order_id === o.order_id && 'bg-primary/5',
                          )}
                        >
                          <button className="flex-1 text-left" onClick={() => selectOrder(o)}>
                            <span className="font-mono font-medium text-sm text-foreground">{o.order_number}</span>
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
                  )
                )}

                {/* Exchanges tab */}
                {tab === 'exchanges' && (
                  exchangesLoading ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                  ) : filteredExchanges.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No exchange deliveries awaiting assignment</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredExchanges.map(ex => (
                        <button
                          key={ex.assignment_id}
                          onClick={() => selectExchange(ex)}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                            selectedExchange?.assignment_id === ex.assignment_id && 'bg-violet-500/5',
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-400/40">
                              <ArrowLeftRight size={8} /> Exchange
                            </span>
                            <span className="font-mono font-medium text-sm text-foreground">{ex.order_number ?? '—'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {ex.customer_name} · {ex.address_city} · {ex.address_pincode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ex.product_name} · {ex.variant_name} × {ex.quantity}
                          </p>
                        </button>
                      ))}
                    </div>
                  )
                )}

                {/* Pickups tab */}
                {tab === 'pickups' && (
                  pickupsLoading ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                  ) : filteredPickups.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No return pickups awaiting assignment</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {filteredPickups.map(pu => (
                        <button
                          key={pu.assignment_id}
                          onClick={() => selectPickup(pu)}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                            selectedPickup?.assignment_id === pu.assignment_id && 'bg-amber-500/5',
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/40">
                              <PackageX size={8} /> Return
                            </span>
                            <span className="font-mono font-medium text-sm text-foreground">{pu.order_number ?? '—'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pu.customer_name} · {pu.address_city} · {pu.address_pincode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {pu.product_name} · {pu.variant_name} × {pu.quantity}
                          </p>
                          {pu.refund_amount && (
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              Refund: ₹{pu.refund_amount}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Partner selection panel */}
            {hasSelection && (
              <div className="w-80 flex-shrink-0 space-y-3">
                <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
                  {selectedOrder && (
                    <>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground mb-0.5">Eligible Partners</h2>
                        <p className="text-xs text-muted-foreground">
                          for {selectedOrder.order_number} · {selectedOrder.address_pincode}
                        </p>
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
                                onClick={() => doAssignOrder(p.id)}
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
                    </>
                  )}

                  {selectedExchange && (
                    <div>
                      <h2 className="text-sm font-semibold text-foreground mb-0.5">Assign Exchange Delivery</h2>
                      <p className="text-xs text-muted-foreground mb-3">
                        {selectedExchange.order_number} · {selectedExchange.product_name}
                      </p>
                      <div className="rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs text-violet-700 dark:text-violet-400 mb-3">
                        Partner will deliver the new item and collect the defective one.
                      </div>
                    </div>
                  )}

                  {selectedPickup && (
                    <div>
                      <h2 className="text-sm font-semibold text-foreground mb-0.5">Assign Return Pickup</h2>
                      <p className="text-xs text-muted-foreground mb-3">
                        {selectedPickup.order_number} · {selectedPickup.product_name}
                      </p>
                      <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 mb-3">
                        Partner will collect the item from the customer using an OTP, then hand it over to the company.
                        {selectedPickup.refund_amount && (
                          <span className="block mt-1 font-medium">Refund pending: ₹{selectedPickup.refund_amount}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback: choose any active partner */}
                  <div className={cn(selectedOrder && eligiblePartners.length > 0 && 'border-t border-border/40 pt-3')}>
                    {selectedOrder && (
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {eligiblePartners.length > 0 ? 'Or choose any partner:' : 'Choose any active partner:'}
                      </p>
                    )}
                    {(selectedExchange || selectedPickup) && (
                      <p className="text-xs font-medium text-muted-foreground mb-2">Choose a partner:</p>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={manualPartnerId}
                        onChange={e => setManualPartnerId(e.target.value)}
                        className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      >
                        <option value="">Select partner…</option>
                        {activePartners.map(p => (
                          <option key={p.id} value={p.id}>{partnerLabel(p)}</option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          selectedOrder    ? doAssignOrder(manualPartnerId)   :
                          selectedExchange ? doAssignExchange(manualPartnerId) :
                                            doAssignPickup(manualPartnerId)
                        }
                        disabled={assigning || !manualPartnerId}
                        className="flex-shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                    {activePartners.length === 0 && (
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
