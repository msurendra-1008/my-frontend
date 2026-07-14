import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, Trash2, CreditCard, Wallet } from 'lucide-react';
import { orderService } from '@/services/orderService';
import type { OrderListItem, Address } from '@/types/order.types';

const MOCK_MODE = import.meta.env.VITE_MOCK_PAYMENT_MODE === 'true';

type PaymentInfoItem = {
  id:               string | null;
  product_name:     string;
  variant_name:     string;
  quantity:         number;
  mrp:              string;
  upa_price:        string;
  upa_price_locked: string;
  line_total:       string;
  price_changed:    boolean;
  stock_quantity:   number;
  stock_ok:         boolean;
  stock_shortfall:  number;
  legacy?:          boolean;
};

type PaymentInfo = {
  order_id:            string;
  order_number:        string;
  price_locked:        boolean;
  hours_since_created: number;
  amount_payable:      string;
  items:               PaymentInfoItem[];
  wallet_balance:      string;
  addresses:           Address[];
  default_address_id:  string | null;
};

interface Props {
  order:    OrderListItem;
  onClose:  () => void;
  onSuccess: () => void;
}

export function CompletePaymentSheet({ order, onClose, onSuccess }: Props) {
  const [info,            setInfo]            = useState<PaymentInfo | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [removingId,      setRemovingId]      = useState<string | null>(null);
  const [selectedAddrId,  setSelectedAddrId]  = useState<string>('');
  const [useWallet,       setUseWallet]       = useState(false);
  const [walletInput,     setWalletInput]     = useState('');
  const [paying,          setPaying]          = useState(false);
  const [singleStockIssue, setSingleStockIssue] = useState(false);

  useEffect(() => {
    loadInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const loadInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await orderService.getPaymentInfo(order.id);
      const d = r.data;
      setInfo(d);
      setSelectedAddrId(d.default_address_id ?? d.addresses[0]?.id ?? '');
      setSingleStockIssue(d.items.length === 1 && !d.items[0].stock_ok);
    } catch {
      setError('Failed to load order details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!info) return;
    setRemovingId(itemId);
    try {
      const r = await orderService.removeOrderItem(order.id, itemId);
      if (r.data.order_cancelled) {
        await orderService.cancelOrder(order.id).catch(() => null);
        onSuccess();
        onClose();
        return;
      }
      await loadInfo();
    } catch {
      setError('Failed to remove item.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleClose = async () => {
    if (singleStockIssue && info) {
      try { await orderService.cancelOrder(order.id); } catch { /* ignore */ }
      onSuccess();
    }
    onClose();
  };

  const walletAmount = () => {
    if (!useWallet || !info) return 0;
    const input   = parseFloat(walletInput || '0') || 0;
    const balance = parseFloat(info.wallet_balance);
    const payable = parseFloat(info.amount_payable);
    return Math.min(input, balance, payable);
  };

  const razorpayAmount = () => {
    if (!info) return 0;
    return Math.max(0, parseFloat(info.amount_payable) - walletAmount());
  };

  const handlePay = async () => {
    if (!info || !selectedAddrId) return;
    setPaying(true);
    setError(null);
    try {
      const r = await orderService.retryPayment(order.id, walletAmount().toFixed(2));
      const { internal_order_id, razorpay_order_id, razorpay_key_id, razorpay_amount } = r.data;
      const amount = parseFloat(razorpay_amount);

      const confirm = async (paymentId: string, signature: string) => {
        await orderService.confirmCheckout({
          internal_order_id,
          address_id:          selectedAddrId,
          wallet_amount:       walletAmount().toFixed(2),
          razorpay_order_id,
          razorpay_payment_id: paymentId,
          razorpay_signature:  signature,
        });
        onSuccess();
        onClose();
      };

      if (amount <= 0) { await confirm('wallet_only', 'wallet_only'); return; }
      if (MOCK_MODE)   { await confirm(`mock_pay_${Date.now()}`, 'mock_sig'); return; }

      const options = {
        key:         razorpay_key_id,
        amount:      Math.round(amount * 100),
        currency:    'INR',
        order_id:    razorpay_order_id,
        name:        'Order Payment',
        description: `Order ${order.order_number}`,
        handler: async (res: { razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await confirm(res.razorpay_payment_id, res.razorpay_signature);
          } catch {
            setError('Payment received but confirmation failed. Please contact support.');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay(options).open();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string } }; message?: string };
      setError(err?.response?.data?.error ?? err?.response?.data?.detail ?? err?.message ?? 'Payment failed.');
      setPaying(false);
    }
  };

  const allStockOk = info ? info.items.every(i => i.stock_ok) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4">
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Complete Payment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{order.order_number}</p>
          </div>
          <button onClick={handleClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : error && !info ? (
            <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : info ? (
            <>
              {/* Price lock notice */}
              {!info.price_locked && (
                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                  <Info size={15} className="shrink-0 mt-0.5" />
                  <span>Prices have been updated since you started this order (over 24 hours ago). The amounts below reflect current prices.</span>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}><X size={13} /></button>
                </div>
              )}

              {/* Items */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
                {info.items.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 flex gap-3 items-start ${
                      !item.stock_ok ? 'border-red-400/40 bg-red-500/10' : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.variant_name} · Qty: {item.quantity}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">₹{item.upa_price}</span>
                        {item.price_changed && (
                          <span className="text-xs text-muted-foreground line-through">₹{item.upa_price_locked}</span>
                        )}
                        {!item.stock_ok && (
                          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle size={11} />
                            {item.stock_quantity === 0
                              ? 'Out of stock'
                              : `Only ${item.stock_quantity} left (need ${item.quantity})`}
                          </span>
                        )}
                        {item.stock_ok && (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle size={11} /> In stock
                          </span>
                        )}
                      </div>
                    </div>
                    {!item.stock_ok && info.items.length > 1 && item.id && (
                      <button
                        onClick={() => handleRemoveItem(item.id!)}
                        disabled={removingId === item.id}
                        className="shrink-0 rounded-md p-1.5 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                        title="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {!item.stock_ok && info.items.length === 1 && (
                      <span className="text-xs text-muted-foreground shrink-0 self-center">Cancel to remove</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Address picker */}
              {allStockOk && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delivery Address</p>
                    {info.addresses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No saved addresses. Please add one from your profile.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {info.addresses.map(addr => (
                          <label
                            key={addr.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              selectedAddrId === addr.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-border hover:bg-muted/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="pay-address"
                              value={addr.id}
                              checked={selectedAddrId === addr.id}
                              onChange={() => setSelectedAddrId(addr.id)}
                              className="mt-0.5 accent-purple-500"
                            />
                            <div className="text-sm">
                              <p className="font-medium text-foreground">{addr.name} · {addr.phone}</p>
                              <p className="text-xs text-muted-foreground">{addr.address_line}, {addr.city}, {addr.state} – {addr.pincode}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Wallet */}
                  {parseFloat(info.wallet_balance) > 0 && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet size={15} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">Use Wallet</span>
                          <span className="text-xs text-muted-foreground">(Balance: ₹{parseFloat(info.wallet_balance).toFixed(2)})</span>
                        </div>
                        <button
                          onClick={() => {
                            const next = !useWallet;
                            setUseWallet(next);
                            if (next && info) {
                              const max = Math.min(parseFloat(info.wallet_balance), parseFloat(info.amount_payable));
                              setWalletInput(max.toFixed(2));
                            } else {
                              setWalletInput('');
                            }
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors ${useWallet ? 'bg-purple-500' : 'bg-muted-foreground/25'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${useWallet ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      {useWallet && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(parseFloat(info.wallet_balance), parseFloat(info.amount_payable))}
                            value={walletInput}
                            onChange={e => setWalletInput(e.target.value)}
                            placeholder={`Max ₹${Math.min(parseFloat(info.wallet_balance), parseFloat(info.amount_payable)).toFixed(2)}`}
                            className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                          <button
                            onClick={() => setWalletInput(Math.min(parseFloat(info.wallet_balance), parseFloat(info.amount_payable)).toFixed(2))}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline whitespace-nowrap"
                          >
                            Use max
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total breakdown */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Order Total</span>
                      <span>₹{parseFloat(info.amount_payable).toFixed(2)}</span>
                    </div>
                    {walletAmount() > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Wallet</span>
                        <span>−₹{walletAmount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5 mt-1.5">
                      <span>{razorpayAmount() > 0 ? 'Via Razorpay' : 'Total'}</span>
                      <span>₹{razorpayAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Single-item stock issue guidance */}
              {singleStockIssue && info.items.length === 1 && (
                <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  This item is unavailable. Close this sheet to cancel the order automatically.
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {info && allStockOk && (
          <div className="px-5 py-4 border-t shrink-0">
            <button
              onClick={handlePay}
              disabled={paying || !selectedAddrId || info.addresses.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <CreditCard size={15} />
              {paying
                ? 'Processing…'
                : razorpayAmount() > 0
                  ? `Pay ₹${razorpayAmount().toFixed(2)} via Razorpay`
                  : `Pay via Wallet`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
