import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import type { Order } from '@/types/order.types';

export function OrderSuccessPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const order     = (location.state as { order?: Order } | null)?.order;

  if (!order) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const walletUsed  = parseFloat(order.wallet_used);
  const rzpAmount   = parseFloat(order.razorpay_amount);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-lg p-8 text-center space-y-5">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 size={36} className="text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground">Order placed!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thank you for your purchase. We'll get your order ready soon.
          </p>
        </div>

        {/* Order number */}
        <div className="rounded-lg bg-muted/50 px-4 py-2.5">
          <p className="text-xs text-muted-foreground mb-1">Order number</p>
          <p className="font-mono font-semibold text-foreground">{order.order_number}</p>
        </div>

        {/* Payment breakdown */}
        <div className="text-left rounded-xl border p-4 space-y-2 text-sm">
          <p className="font-semibold text-foreground mb-1">Payment Summary</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          {parseFloat(order.upa_discount) > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>UPA Discount</span>
              <span>−₹{order.upa_discount}</span>
            </div>
          )}
          {walletUsed > 0 && (
            <div className="flex justify-between text-purple-600 dark:text-purple-400">
              <span>Paid via Wallet</span>
              <span>−₹{order.wallet_used}</span>
            </div>
          )}
          {rzpAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid via Razorpay</span>
              <span>₹{order.razorpay_amount}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2 mt-1">
            <span>Total paid</span>
            <span>₹{order.amount_payable}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate('/dashboard', { state: { tab: 'orders' } })}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            View my orders
          </button>
          <button
            onClick={() => navigate('/shop')}
            className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
