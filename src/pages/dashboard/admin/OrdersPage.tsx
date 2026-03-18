import { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, ChevronRight, Search } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { orderService } from '@/services/orderService';
import type { OrderListItem, Order, OrderStatus, PaymentStatus, OrderItemStatus } from '@/types/order.types';
import { cn } from '@utils/cn';

// ── Helpers ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  shipped:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase', ORDER_STATUS_CLASSES[status])}>
      {status}
    </span>
  );
}

function PaymentDot({ status }: { status: PaymentStatus }) {
  const paid = status === 'paid';
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', paid ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', paid ? 'bg-green-500' : 'bg-red-500')} />
      {status}
    </span>
  );
}

// ── Item Status Badge ─────────────────────────────────────────────────────────

function itemStatusClass(s: OrderItemStatus): string {
  if (s === 'delivered')                              return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (s === 'return_requested' || s === 'exchange_requested') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (s === 'return_approved'  || s === 'exchange_approved')  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
  if (s === 'return_rejected'  || s === 'exchange_rejected')  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (s === 'refunded' || s === 'exchanged')          return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

function ItemStatusBadge({ status }: { status: OrderItemStatus }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide', itemStatusClass(status))}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Order Detail Sheet ────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderDetailSheet({
  orderId,
  onClose,
  onUpdated,
}: {
  orderId:   string;
  onClose:   () => void;
  onUpdated: (order: Order) => void;
}) {
  const toast = useToast();
  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus,  setNewStatus]  = useState<OrderStatus>('pending');
  const [tracking,   setTracking]   = useState('');
  const [updating,   setUpdating]   = useState(false);

  useEffect(() => {
    orderService.getAdminOrder(orderId)
      .then((r) => {
        setOrder(r.data);
        setNewStatus(r.data.order_status);
        setTracking(r.data.tracking_number ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleUpdate = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const payload: { order_status?: string; tracking_number?: string } = { order_status: newStatus };
      if (newStatus === 'shipped') payload.tracking_number = tracking;
      const r = await orderService.adminUpdateOrder(order.id, payload);
      setOrder(r.data);
      onUpdated(r.data);
      toast.show('Order updated');
    } catch {
      toast.show('Update failed', true);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold">Order Details</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Toast */}
        {toast.msg && (
          <div className={cn('mx-5 mt-3 rounded-lg px-3 py-2 text-xs text-white', toast.msg.err ? 'bg-red-500' : 'bg-foreground')}>
            {toast.msg.text}
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : order ? (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono font-semibold">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <OrderStatusBadge status={order.order_status} />
                <PaymentDot status={order.payment_status} />
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-xl border p-4 text-sm space-y-0.5">
              <p className="font-semibold mb-1">Customer</p>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-muted-foreground">{order.customer_mobile}</p>
            </div>

            {/* Items */}
            <div className="rounded-xl border">
              <div className="border-b px-4 py-2.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Items</p>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-3 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.variant_name} × {item.quantity}</p>
                    <div className="mt-1">
                      <ItemStatusBadge status={item.status} />
                    </div>
                  </div>
                  <span className="font-semibold">₹{item.line_total}</span>
                </div>
              ))}
            </div>

            {/* Payment */}
            <div className="rounded-xl border p-4 space-y-1.5 text-sm">
              <p className="font-semibold mb-1">Payment</p>
              {[
                ['Subtotal', `₹${order.subtotal}`],
                parseFloat(order.upa_discount) > 0 && ['UPA Discount', `-₹${order.upa_discount}`],
                parseFloat(order.wallet_used) > 0 && ['Wallet', `-₹${order.wallet_used}`],
                parseFloat(order.razorpay_amount) > 0 && ['Razorpay', `₹${order.razorpay_amount}`],
                ['Total', `₹${order.amount_payable}`],
              ].filter(Boolean).map((row, i) => {
                const [label, val] = row as string[];
                const isTotal = label === 'Total';
                return (
                  <div key={i} className={cn('flex justify-between', isTotal && 'border-t pt-1.5 font-semibold mt-1')}>
                    <span className={!isTotal ? 'text-muted-foreground' : ''}>{label}</span>
                    <span>{val}</span>
                  </div>
                );
              })}
            </div>

            {/* Address */}
            <div className="rounded-xl border p-4 text-sm">
              <p className="font-semibold mb-1">Delivery Address</p>
              <p className="font-medium">{order.address_name}</p>
              <p className="text-muted-foreground">{order.address_phone}</p>
              <p className="text-muted-foreground leading-snug">
                {order.address_line}, {order.address_city}, {order.address_state} — {order.address_pincode}
              </p>
            </div>

            {/* Admin actions */}
            <div className="rounded-xl border p-4 space-y-3">
              <p className="font-semibold text-sm">Update Order</p>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>

              {newStatus === 'shipped' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tracking Number</label>
                  <input
                    type="text"
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              )}

              <button
                onClick={handleUpdate}
                disabled={updating}
                className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {updating ? 'Updating…' : 'Update Order'}
              </button>
            </div>
          </div>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">Failed to load order.</p>
        )}
      </div>
    </div>
  );
}

// ── Admin Orders Table ─────────────────────────────────────────────────────────

export function AdminOrdersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  const [orders,  setOrders]  = useState<OrderListItem[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [next,    setNext]    = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search,         setSearch]         = useState('');
  const [orderStatus,    setOrderStatus]    = useState('');
  const [paymentStatus,  setPaymentStatus]  = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [viewId,         setViewId]         = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async (pg = 1, reset = true) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const params: Record<string, string> = { page: String(pg) };
    if (search)        params.search         = search;
    if (orderStatus)   params.order_status   = orderStatus;
    if (paymentStatus) params.payment_status = paymentStatus;
    if (dateFrom)      params.date_from      = dateFrom;
    if (dateTo)        params.date_to        = dateTo;

    try {
      const r = await orderService.getAdminOrders(params);
      setOrders((prev) => reset ? r.data.results : [...prev, ...r.data.results]);
      setTotal(r.data.count);
      setNext(r.data.next);
      setPage(pg);
    } catch {
      toast.show('Failed to load orders', true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, orderStatus, paymentStatus, dateFrom, dateTo]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOrders(1, true), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchOrders]);

  const handleOrderUpdated = (updated: Order) => {
    setOrders((prev) =>
      prev.map((o) => o.id === updated.id ? { ...o, order_status: updated.order_status } : o)
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar mobileOpen={sidebarOpen} onMobileToggle={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="flex h-[52px] items-center gap-3 border-b px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md p-1.5 hover:bg-muted">
            <Menu size={18} />
          </button>
          <span className="font-semibold">Orders</span>
        </header>

        <main className="flex-1 px-4 py-6 space-y-5 max-w-full">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-foreground">Orders</h1>
          </div>

          {/* Toast */}
          {toast.msg && (
            <div className={cn('rounded-lg px-4 py-2.5 text-sm text-white', toast.msg.err ? 'bg-red-500' : 'bg-foreground')}>
              {toast.msg.text}
            </div>
          )}

          {/* Filter toolbar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Order no or mobile…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Order Status */}
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">All Status</option>
                {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>

              {/* Payment Status */}
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Date From */}
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {!loading && (
              <p className="text-xs text-muted-foreground">
                Showing {orders.length} of {total} orders
              </p>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground text-sm">
              No orders found.
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Order', 'Customer', 'Amount', 'Payment', 'Status', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold text-foreground">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(order.created_at))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{order.customer_mobile}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold">₹{order.amount_payable}</td>
                      <td className="px-4 py-3"><PaymentDot status={order.payment_status} /></td>
                      <td className="px-4 py-3"><OrderStatusBadge status={order.order_status} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setViewId(order.id)}
                          className="flex items-center gap-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        </main>
      </div>

      {/* Detail sheet */}
      {viewId && (
        <OrderDetailSheet
          orderId={viewId}
          onClose={() => setViewId(null)}
          onUpdated={handleOrderUpdated}
        />
      )}
    </div>
  );
}
