import { useState, useEffect, useCallback } from 'react';
import { Search, Package, ChevronRight, X } from 'lucide-react';
import { orderService } from '@/services/orderService';
import type { OrderListItem, Order, OrderStatus, PaymentStatus } from '@/types/order.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

// ── Badges ────────────────────────────────────────────────────────────────────

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  shipped:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ORDER_STATUS_CLASSES[status]}`}>
      {status}
    </span>
  );
}

function PaymentDot({ status }: { status: PaymentStatus }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${
      status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === 'paid' ? 'bg-green-500' : 'bg-red-500'
      }`} />
      {status}
    </span>
  );
}

// ── Order Detail Sheet ────────────────────────────────────────────────────────

function OrderDetailSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [order, setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getMyOrder(orderId)
      .then((r) => setOrder(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Order Details</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : order ? (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono font-semibold text-foreground">{order.order_number}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(order.created_at))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <OrderStatusBadge status={order.order_status} />
                <PaymentDot status={order.payment_status} />
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border">
              <div className="border-b px-4 py-2.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Items</p>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between px-4 py-3 border-b last:border-0 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_name} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold ml-3">₹{item.line_total}</span>
                </div>
              ))}
            </div>

            {/* Payment breakdown */}
            <div className="rounded-xl border p-4 space-y-2 text-sm">
              <p className="font-semibold mb-1">Payment</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              {parseFloat(order.upa_discount) > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>UPA Discount</span>
                  <span>−₹{order.upa_discount}</span>
                </div>
              )}
              {parseFloat(order.wallet_used) > 0 && (
                <div className="flex justify-between text-purple-600 dark:text-purple-400">
                  <span>Wallet</span>
                  <span>−₹{order.wallet_used}</span>
                </div>
              )}
              {parseFloat(order.razorpay_amount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Razorpay</span>
                  <span>₹{order.razorpay_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>₹{order.amount_payable}</span>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-xl border p-4 text-sm">
              <p className="font-semibold mb-1">Delivery Address</p>
              <p className="font-medium">{order.address_name}</p>
              <p className="text-muted-foreground">{order.address_phone}</p>
              <p className="text-muted-foreground leading-snug mt-0.5">
                {order.address_line}, {order.address_city}, {order.address_state} — {order.address_pincode}
              </p>
            </div>

            {/* Tracking */}
            {order.tracking_number && (
              <div className="rounded-xl border p-4 text-sm">
                <p className="font-semibold mb-1">Tracking</p>
                <p className="font-mono text-muted-foreground">{order.tracking_number}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">Failed to load order.</p>
        )}
      </div>
    </div>
  );
}

// ── Order Card ────────────────────────────────────────────────────────────────

function OrderCard({ order, onView }: { order: OrderListItem; onView: () => void }) {
  const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(order.created_at));
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-sm text-foreground">{order.order_number}</span>
            <OrderStatusBadge status={order.order_status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          <p className="text-sm text-muted-foreground mt-1.5 truncate">
            {order.item_count} {order.item_count === 1 ? 'item' : 'items'} · {order.first_item_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm">₹{order.amount_payable}</p>
          <PaymentDot status={order.payment_status} />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={onView}
          className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
        >
          View details <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── OrdersTab ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Status',  value: '' },
  { label: 'Pending',     value: 'pending'    },
  { label: 'Processing',  value: 'processing' },
  { label: 'Shipped',     value: 'shipped'    },
  { label: 'Delivered',   value: 'delivered'  },
  { label: 'Cancelled',   value: 'cancelled'  },
];

export function OrdersTab() {
  const [orders,  setOrders]  = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [next,    setNext]    = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,    setPage]    = useState(1);

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewId, setViewId]         = useState<string | null>(null);

  const fetchOrders = useCallback(async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const r = await orderService.getMyOrders(pg);
      setOrders((prev) => reset ? r.data.results : [...prev, ...r.data.results]);
      setNext(r.data.next);
      setPage(pg);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchOrders(1, true); }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.first_item_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.order_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
          <Package size={36} className="text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">Your orders will appear here once you shop.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onView={() => setViewId(order.id)} />
          ))}
        </div>
      )}

      {/* Load more */}
      {next && !loading && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchOrders(page + 1, false)}
            disabled={loadingMore}
            className="rounded-lg border px-5 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* Detail sheet */}
      {viewId && <OrderDetailSheet orderId={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}
