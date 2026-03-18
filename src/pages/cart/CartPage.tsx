import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, Minus, Plus, Package } from 'lucide-react';
import { cartService } from '@/services/cartService';
import { useCartStore } from '@/store/cartStore';
import type { Cart, CartItem } from '@/types/order.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const show = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}

function QuantityStepper({
  quantity, stock, onDecrease, onIncrease, disabled,
}: {
  quantity: number;
  stock:    number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled:   boolean;
}) {
  return (
    <div className="flex items-center rounded-lg border overflow-hidden">
      <button
        onClick={onDecrease}
        disabled={disabled}
        className="flex h-[30px] w-[30px] items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
      >
        <Minus size={12} />
      </button>
      <span className="flex h-[30px] w-[30px] items-center justify-center text-sm font-medium tabular-nums border-x">
        {quantity}
      </span>
      <button
        onClick={onIncrease}
        disabled={disabled || quantity >= stock}
        className="flex h-[30px] w-[30px] items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item:     CartItem;
  onUpdate: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const update = async (delta: number) => {
    const newQty = item.quantity + delta;
    setBusy(true);
    try {
      await onUpdate(item.id, newQty);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex items-start gap-3 py-3 border-b last:border-0">
      <div className="h-14 w-14 shrink-0 rounded-lg bg-muted overflow-hidden">
        {item.primary_image ? (
          <img src={item.primary_image} alt={item.product_name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
            <Package size={20} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-6">
        <p className="font-medium text-sm text-foreground leading-tight truncate">{item.product_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.variant_name}</p>
        <div className="mt-2 flex items-center gap-3">
          <QuantityStepper
            quantity={item.quantity}
            stock={item.stock}
            onDecrease={() => update(-1)}
            onIncrease={() => update(+1)}
            disabled={busy}
          />
          <span className="text-sm font-semibold text-foreground">
            ₹{item.upa_price}
            {item.mrp !== item.upa_price && (
              <span className="ml-1 text-xs font-normal text-muted-foreground line-through">₹{item.mrp}</span>
            )}
          </span>
        </div>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        disabled={busy}
        className="absolute right-0 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 transition-colors disabled:opacity-40"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function OrderSummaryCard({
  totals,
  onCheckout,
}: {
  totals: Cart['totals'];
  onCheckout: () => void;
}) {
  const discount = parseFloat(totals.upa_discount);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sticky top-[90px]">
      <h3 className="font-semibold text-foreground mb-4">Order Summary</h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal (MRP)</span>
          <span>₹{totals.subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>UPA Discount</span>
            <span>−₹{totals.upa_discount}</span>
          </div>
        )}
      </div>

      <div className="my-3 border-t" />

      <div className="flex justify-between text-base font-semibold">
        <span>Amount Payable</span>
        <span>₹{totals.amount_payable}</span>
      </div>

      <button
        onClick={onCheckout}
        className="mt-4 w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
      >
        Proceed to Checkout
      </button>
    </div>
  );
}

export function CartPage() {
  const navigate          = useNavigate();
  const toast             = useToast();
  const fetchCartCount    = useCartStore((s) => s.fetchCartCount);
  const [cart, setCart]   = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const r = await cartService.getCart();
      setCart(r.data);
      await fetchCartCount();
    } catch {
      toast.show('Failed to load cart', true);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const handleUpdate = async (itemId: string, qty: number) => {
    try {
      const r = await cartService.updateItem(itemId, qty);
      setCart(r.data);
      await fetchCartCount();
    } catch {
      toast.show('Failed to update item', true);
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      const r = await cartService.removeItem(itemId);
      setCart(r.data);
      await fetchCartCount();
      toast.show('Item removed');
    } catch {
      toast.show('Failed to remove item', true);
    }
  };

  const handleContinueShopping = () => {
    navigate('/dashboard', { state: { activeTab: 'shop' } });
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-[52px] max-w-4xl items-center px-4 gap-3">
            <button onClick={handleContinueShopping} className="text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </button>
            <span className="font-semibold text-foreground">My Cart</span>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 rounded-xl border bg-card p-5 shadow-sm space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 py-3 border-b last:border-0">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-7 w-24 mt-2" />
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full lg:w-[300px]">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-4xl items-center px-4 gap-3">
          <button onClick={handleContinueShopping} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <span className="font-semibold text-foreground">My Cart</span>
        </div>
      </header>

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${
          toast.msg.err ? 'bg-red-500' : 'bg-foreground'
        }`}>
          {toast.msg.text}
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-6">
        {!cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
            <ShoppingCart size={48} className="text-muted-foreground/30 mb-4" />
            <p className="font-semibold text-foreground">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Add products to get started</p>
            <button
              onClick={handleContinueShopping}
              className="mt-4 rounded-lg border px-5 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              ← Continue shopping
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Items list */}
            <div className="flex-1 space-y-4">
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b px-5 py-4">
                  <h3 className="font-semibold text-foreground">
                    Cart ({cart.totals.item_count} {cart.totals.item_count === 1 ? 'item' : 'items'})
                  </h3>
                </div>
                <div className="px-5">
                  {cart.items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>

              {/* Continue shopping button — below item list */}
              <button
                onClick={handleContinueShopping}
                className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                ← Continue shopping
              </button>
            </div>

            {/* Order summary */}
            <div className="w-full lg:w-[300px] shrink-0">
              <OrderSummaryCard totals={cart.totals} onCheckout={handleCheckout} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
