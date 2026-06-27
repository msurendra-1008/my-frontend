import { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { deliveryService } from '@/services/deliveryService';
import type { DeliveryPartner } from '@/types/delivery.types';
import axiosInstance from '@/utils/axiosInstance';
import { Search, Truck, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OrderItem { id: string; order_number: string; address_pincode: string; address_city: string; }

interface Paginated<T> { count: number; results: T[]; }

export function DeliveryAssignPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orders, setOrders]         = useState<OrderItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<OrderItem | null>(null);
  const [partners, setPartners]     = useState<DeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [assigning, setAssigning]   = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');

  useEffect(() => { loadPackedOrders(); }, [search]);

  function loadPackedOrders() {
    setLoading(true);
    axiosInstance.get<Paginated<any>>('/api/v1/orders/admin/', {
      params: { order_status: 'packed', search: search || undefined },
    }).then(r => {
      const results = r.data.results ?? [];
      setOrders(results.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        address_pincode: o.address_pincode ?? '',
        address_city: o.address_city ?? '',
      })));
    }).catch(() => {}).finally(() => setLoading(false));
  }

  async function selectOrder(order: OrderItem) {
    setSelected(order);
    setPartners([]);
    setSuccess('');
    setError('');
    setLoadingPartners(true);
    try {
      const r = await deliveryService.suggestPartners(order.id);
      setPartners(r.data.eligible_partners ?? []);
    } catch { setError('Failed to load eligible partners.'); }
    finally { setLoadingPartners(false); }
  }

  async function doAssign(partnerId: string) {
    if (!selected) return;
    setAssigning(true);
    setError('');
    try {
      await deliveryService.assignPartner(selected.id, partnerId);
      setSuccess(`Assigned! Order ${selected.order_number} is now in transit.`);
      loadPackedOrders();
      setSelected(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Assignment failed.');
    } finally { setAssigning(false); }
  }

  async function doAutoAssign(order: OrderItem) {
    setAssigning(true);
    setError('');
    setSuccess('');
    try {
      await deliveryService.autoAssign(order.id);
      setSuccess(`Auto-assigned! Order ${order.order_number} is now in transit.`);
      loadPackedOrders();
      setSelected(null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'No eligible partner found.');
    } finally { setAssigning(false); }
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
            {/* Packed orders list */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
                  placeholder="Search packed orders…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No packed orders awaiting delivery</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {orders.map(o => (
                      <div
                        key={o.id}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors',
                          selected?.id === o.id && 'bg-primary/5',
                        )}
                      >
                        <button className="flex-1 text-left" onClick={() => selectOrder(o)}>
                          <span className="font-medium text-sm text-foreground">{o.order_number}</span>
                          <p className="text-xs text-muted-foreground">{o.address_city} · {o.address_pincode}</p>
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
              <div className="w-72 flex-shrink-0 space-y-3">
                <div className="rounded-lg border border-border/50 bg-card p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-1">Eligible Partners</h2>
                  <p className="text-xs text-muted-foreground mb-3">for {selected.order_number} · {selected.address_pincode}</p>
                  {loadingPartners && <p className="text-sm text-muted-foreground">Finding partners…</p>}
                  {!loadingPartners && partners.length === 0 && (
                    <p className="text-sm text-muted-foreground">No eligible partners for this pincode.</p>
                  )}
                  <div className="space-y-2">
                    {partners.map(p => (
                      <div key={p.id} className="rounded-md border border-border/50 bg-muted/30 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.vehicle_type} · {p.active_assignments} active</p>
                        </div>
                        <button
                          onClick={() => doAssign(p.id)}
                          disabled={assigning}
                          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
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
