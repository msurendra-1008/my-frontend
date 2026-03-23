import { useState, useEffect, useCallback } from 'react';
import { Search, Package, ChevronRight, X, RotateCcw } from 'lucide-react';
import { orderService } from '@/services/orderService';
import { returnsService } from '@/services/returnsService';
import { productService } from '@/services/productService';
import type { OrderListItem, Order, OrderStatus, PaymentStatus, OrderItem } from '@/types/order.types';
import type { ReturnSettings, ReturnRequestType } from '@/types/returns.types';
import type { ProductVariant } from '@/types/product.types';
import { OrderItemStatusBadge } from '@/components/orders/OrderItemStatusBadge';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

// ── Badges ────────────────────────────────────────────────────────────────────

const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  packed:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

// ── Raise Return Sheet (nested, z-60) ─────────────────────────────────────────

function RaiseReturnSheet({
  item,
  settings,
  onClose,
  onSuccess,
}: {
  item:      OrderItem;
  settings:  ReturnSettings;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [type,       setType]       = useState<ReturnRequestType>('return');
  const [qty,        setQty]        = useState(1);
  const [reason,     setReason]     = useState('');
  const [notes,      setNotes]      = useState('');
  const [exVariant,  setExVariant]  = useState('');
  const [variants,   setVariants]   = useState<ProductVariant[]>([]);
  const [photos,     setPhotos]     = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Load exchange variants when type = exchange
  useEffect(() => {
    if (type === 'exchange' && item.product_slug && item.variant_id) {
      productService.getProduct(item.product_slug)
        .then((r) => setVariants(
          r.data.variants.filter(
            (v) => v.id !== item.variant_id && v.is_active && v.stock_quantity > 0,
          ),
        ))
        .catch(() => {});
    }
  }, [type, item.product_slug, item.variant_id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files].slice(0, 3));
  };

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason.'); return; }
    if (type === 'exchange' && !exVariant) { setError('Please select an exchange variant.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const resp = await returnsService.createRequest({
        order_item_id:       item.id,
        request_type:        type,
        return_qty:          qty,
        exchange_variant_id: type === 'exchange' ? exVariant : undefined,
        reason,
        notes,
      });
      // Upload photos
      for (const file of photos) {
        try { await returnsService.uploadPhoto(resp.data.id, file); } catch { /**/ }
      }
      onSuccess();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string; order_item_id?: string[] } } })
        ?.response?.data;
      setError(
        detail?.detail ??
        detail?.order_item_id?.[0] ??
        'Failed to raise request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold">Return / Exchange</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Item summary */}
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium">{item.product_name}</p>
            <p className="text-xs text-muted-foreground">{item.variant_name} × {item.quantity}</p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Request Type</p>
            <div className="flex gap-3">
              {(['return', 'exchange'] as ReturnRequestType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors capitalize ${
                    type === t
                      ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity (only if qty > 1) */}
          {item.quantity > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Quantity to {type} (max {item.quantity})
              </label>
              <input
                type="number"
                min={1}
                max={item.quantity}
                value={qty}
                onChange={(e) => setQty(Math.min(item.quantity, Math.max(1, Number(e.target.value))))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          )}

          {/* Exchange variant */}
          {type === 'exchange' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Exchange For</label>
              {variants.length === 0 ? (
                <p className="text-xs text-muted-foreground">No other variants available for exchange.</p>
              ) : (
                <select
                  value={exVariant}
                  onChange={(e) => setExVariant(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">Select variant…</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — ₹{v.upa_price.upa_price} (stock: {v.stock_quantity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Select reason…</option>
              {settings.predefined_reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Additional notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details…"
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Photos (optional, max 3)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="text-sm text-muted-foreground"
            />
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {photos.map((f, i) => (
                  <div key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover border"
                    />
                    <button
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center"
                    >
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Raise Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order Detail Sheet ────────────────────────────────────────────────────────

function OrderDetailSheet({
  orderId,
  returnWindowDays,
  onClose,
}: {
  orderId:          string;
  returnWindowDays: number;
  onClose:          () => void;
}) {
  const [order,        setOrder]        = useState<Order | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [retSettings,  setRetSettings]  = useState<ReturnSettings | null>(null);
  const [returnItemId, setReturnItemId] = useState<string | null>(null);
  const [successMsg,   setSuccessMsg]   = useState('');

  useEffect(() => {
    orderService.getMyOrder(orderId)
      .then((o) => setOrder(o.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    returnsService.getSettings()
      .then((s) => setRetSettings(s.data))
      .catch(() => {});
  }, [orderId]);

  const returnItem = order?.items.find((i) => i.id === returnItemId) ?? null;

  const handleReturnSuccess = () => {
    setReturnItemId(null);
    setSuccessMsg('Return request raised successfully.');
    // Refresh order so badge updates
    orderService.getMyOrder(orderId).then((r) => setOrder(r.data)).catch(() => {});
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="relative z-10 w-full max-w-sm bg-background shadow-2xl flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Order Details</h3>
            <button onClick={onClose} className="rounded-md p-1 hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>

          {successMsg && (
            <div className="mx-5 mt-3 rounded-lg bg-foreground px-3 py-2 text-xs text-white">{successMsg}</div>
          )}

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
                {order.items.map((item) => {
                  const rejCount = item.return_rejection_count ?? 0;
                  const eligible = (() => {
                    try {
                      if (rejCount >= 2) return false;
                      if (item.status !== 'delivered') return false;
                      if (!item.delivered_at) return false;
                      const deliveredDate = new Date(item.delivered_at);
                      const windowEnd = new Date(deliveredDate);
                      windowEnd.setDate(windowEnd.getDate() + returnWindowDays);
                      return new Date() <= windowEnd;
                    } catch {
                      return false;
                    }
                  })();
                  return (
                    <div key={item.id} className="px-4 py-3 border-b last:border-0 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.variant_name} × {item.quantity}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <OrderItemStatusBadge status={item.status} />
                            {eligible && rejCount > 0 && rejCount < 2 && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                Previous request rejected. You can raise 1 more request.
                              </span>
                            )}
                            {eligible && (
                              <button
                                onClick={() => setReturnItemId(item.id)}
                                className="flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 hover:underline"
                              >
                                <RotateCcw size={9} /> Return/Exchange
                              </button>
                            )}
                            {!eligible && rejCount >= 2 && item.status === 'delivered' && (
                              <span className="text-[10px] text-muted-foreground">
                                Maximum return attempts reached
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-semibold ml-3">₹{item.line_total}</span>
                      </div>

                      {/* Under review — amber info box */}
                      {item.return_status === 'under_review' && item.return_admin_notes && (
                        <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                          <span className="font-semibold">Admin needs more info:</span> {item.return_admin_notes}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Raise-return nested sheet */}
      {returnItem && retSettings && (
        <RaiseReturnSheet
          item={returnItem}
          settings={retSettings}
          onClose={() => setReturnItemId(null)}
          onSuccess={handleReturnSuccess}
        />
      )}
    </>
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
  { label: 'All Status', value: ''          },
  { label: 'Pending',    value: 'pending'   },
  { label: 'Confirmed',  value: 'confirmed' },
  { label: 'Packed',     value: 'packed'    },
  { label: 'Shipped',    value: 'shipped'   },
  { label: 'Delivered',  value: 'delivered' },
  { label: 'Cancelled',  value: 'cancelled' },
];

export function OrdersTab() {
  const [orders,           setOrders]           = useState<OrderListItem[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [next,             setNext]             = useState<string | null>(null);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [page,             setPage]             = useState(1);
  const [returnWindowDays, setReturnWindowDays] = useState(7);

  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewId,       setViewId]       = useState<string | null>(null);

  useEffect(() => {
    returnsService.getSettings()
      .then((res) => setReturnWindowDays(res.data.return_window_days))
      .catch(() => setReturnWindowDays(7));
  }, []);

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
      {viewId && (
        <OrderDetailSheet
          orderId={viewId}
          returnWindowDays={returnWindowDays}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  );
}
