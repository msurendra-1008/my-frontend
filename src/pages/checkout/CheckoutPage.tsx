import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, MapPin, Wallet, CreditCard,
  ChevronRight, Plus, ShoppingBag, Info,
} from 'lucide-react';
import { cartService } from '@/services/cartService';
import { orderService } from '@/services/orderService';
import { walletService } from '@/services/walletService';
import type {
  Cart, Address, AddressFormData,
  CheckoutInitiateResponse,
} from '@/types/order.types';
import type { Wallet as WalletType } from '@/types/wallet.types';

const MOCK_MODE = import.meta.env.VITE_MOCK_PAYMENT_MODE === 'true';

// ── Step indicator ────────────────────────────────────────────────────────────

type StepId = 'cart' | 'address' | 'payment' | 'confirm';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'cart',    label: 'Cart'    },
  { id: 'address', label: 'Address' },
  { id: 'payment', label: 'Payment' },
  { id: 'confirm', label: 'Confirm' },
];

function StepProgress({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-1 ${i <= idx ? 'bg-purple-600' : 'bg-muted'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done   ? 'bg-purple-600 text-white' :
                active ? 'bg-purple-600 text-white ring-2 ring-purple-300' :
                         'bg-muted text-muted-foreground'
              }`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Address Form ──────────────────────────────────────────────────────────────

const EMPTY_FORM: AddressFormData = {
  name: '', phone: '', address_line: '', city: '', state: '', pincode: '', is_default: false,
};

function AddressForm({
  initial, onSave, onCancel, saving,
}: {
  initial: Partial<AddressFormData>;
  onSave:  (data: AddressFormData) => void;
  onCancel: () => void;
  saving:  boolean;
}) {
  const [form, setForm] = useState<AddressFormData>({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof AddressFormData, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      className="rounded-xl border bg-card p-4 space-y-3 mt-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          ['name',         'Full Name',    'text'],
          ['phone',        'Phone',        'tel'],
          ['address_line', 'Address Line', 'text'],
          ['city',         'City',         'text'],
          ['state',        'State',        'text'],
          ['pincode',      'Pincode',      'text'],
        ] as [keyof AddressFormData, string, string][]).map(([k, label, type]) => (
          <div key={k} className={k === 'address_line' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <input
              type={type}
              required
              value={form[k] as string}
              onChange={(e) => set(k, e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(e) => set('is_default', e.target.checked)}
          className="accent-purple-600"
        />
        Set as default address
      </label>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}

// ── Address Card ──────────────────────────────────────────────────────────────

function AddressCard({
  address, selected, onSelect,
}: {
  address:  Address;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
        selected
          ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
          : 'border-border hover:border-purple-300 hover:bg-muted/30'
      }`}
    >
      <div className="mt-0.5">
        {selected
          ? <div className="h-4 w-4 rounded-full border-2 border-purple-600 flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-purple-600" /></div>
          : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
        }
      </div>
      <div className="flex-1 min-w-0 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{address.name}</span>
          {address.is_default && (
            <span className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400">
              Default
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5">{address.phone}</p>
        <p className="text-muted-foreground mt-0.5 leading-snug">
          {address.address_line}, {address.city}, {address.state} — {address.pincode}
        </p>
      </div>
    </div>
  );
}

// ── Mini Order Summary ────────────────────────────────────────────────────────

function MiniOrderSummary({
  cart, address,
}: {
  cart:    Cart | null;
  address: Address | null;
}) {
  if (!cart) return null;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sticky top-[90px] space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Order Summary</h3>

      {/* Items */}
      <div className="space-y-2">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="h-10 w-10 shrink-0 rounded-md bg-muted overflow-hidden">
              {item.primary_image
                ? <img src={item.primary_image} alt={item.product_name} className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-muted-foreground/30"><ShoppingBag size={14} /></div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.product_name}</p>
              <p className="text-[10px] text-muted-foreground">{item.variant_name} × {item.quantity}</p>
            </div>
            <span className="text-xs font-semibold">₹{(parseFloat(item.upa_price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>₹{cart.totals.subtotal}</span>
        </div>
        {parseFloat(cart.totals.upa_discount) > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400">
            <span>UPA Discount</span>
            <span>−₹{cart.totals.upa_discount}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-sm pt-1 border-t">
          <span>Total</span>
          <span>₹{cart.totals.amount_payable}</span>
        </div>
      </div>

      {/* Address snapshot */}
      {address && (
        <div className="border-t pt-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Deliver to</p>
          <p className="text-xs font-medium">{address.name}</p>
          <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
            {address.address_line}, {address.city}, {address.state} — {address.pincode}
          </p>
        </div>
      )}
    </div>
  );
}

// ── CheckoutPage ──────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>('address');
  const [cart,      setCart]      = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wallet,    setWallet]    = useState<WalletType | null>(null);
  const [loading,   setLoading]   = useState(true);

  // Address selection
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSaving, setAddingSaving] = useState(false);

  // Wallet toggle
  const [useWallet,    setUseWallet]    = useState(false);
  const [walletAmount, setWalletAmount] = useState('');

  // Initiate response
  const [initiating,   setInitiating]   = useState(false);
  const [initData,     setInitData]     = useState<CheckoutInitiateResponse | null>(null);

  // Confirm
  const [confirming, setConfirming] = useState(false);
  const [error,      setError]      = useState('');

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cartRes, addrRes, walletRes] = await Promise.all([
        cartService.getCart(),
        orderService.getAddresses(),
        walletService.getMyWallet().catch(() => null),
      ]);
      setCart(cartRes.data);

      // Handle both paginated { results: [...] } and plain array responses
      const rawAddr = addrRes.data as Address[] | { results: Address[] };
      const addrList: Address[] = Array.isArray(rawAddr) ? rawAddr : (rawAddr.results ?? []);
      setAddresses(addrList);

      if (walletRes) setWallet(walletRes.data);

      const defaultAddr = addrList.find((a) => a.is_default) ?? addrList[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);

      if (!cartRes.data.items.length) navigate('/cart');
    } catch {
      setError('Failed to load checkout data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const amountPayable  = parseFloat(cart?.totals.amount_payable ?? '0');
  const walletBalance  = parseFloat(wallet?.balance ?? '0');
  const walletUse      = useWallet ? Math.min(parseFloat(walletAmount || '0'), walletBalance, amountPayable) : 0;
  const razorpayAmount = Math.max(0, amountPayable - walletUse);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  // ── Address actions ─────────────────────────────────────────────────────────
  const handleAddAddress = async (data: AddressFormData) => {
    setAddingSaving(true);
    try {
      const r = await orderService.createAddress(data);
      setAddresses((prev) => [...prev, r.data]);
      setSelectedAddressId(r.data.id);
      setShowAddForm(false);
    } catch {
      setError('Failed to save address.');
    } finally {
      setAddingSaving(false);
    }
  };

  // ── Initiate checkout ───────────────────────────────────────────────────────
  const handleInitiate = async () => {
    if (!selectedAddressId) { setError('Please select a delivery address.'); return; }
    setError('');
    setInitiating(true);
    try {
      const r = await orderService.initiateCheckout({
        address_id:    selectedAddressId,
        wallet_amount: walletUse.toFixed(2),
      });
      setInitData(r.data);
      setStep('confirm');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to initiate checkout.';
      setError(msg);
    } finally {
      setInitiating(false);
    }
  };

  // ── Confirm checkout ────────────────────────────────────────────────────────
  const handleConfirm = async (paymentId: string, signature: string) => {
    if (!initData) return;
    setConfirming(true);
    setError('');
    try {
      const r = await orderService.confirmCheckout({
        address_id:          selectedAddressId,
        wallet_amount:       walletUse.toFixed(2),
        razorpay_order_id:   initData.razorpay_order_id,
        razorpay_payment_id: paymentId,
        razorpay_signature:  signature,
      });
      navigate('/order/success', { state: { order: r.data } });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Payment confirmation failed.';
      setError(msg);
      setConfirming(false);
    }
  };

  const handleSimulatePayment = () => {
    handleConfirm(`mock_pay_${Date.now()}`, 'mock_sig');
  };

  const handleWalletOnlyPayment = () => {
    handleConfirm('wallet_only', 'wallet_only');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="h-6 w-64 animate-pulse rounded-md bg-muted mx-auto mb-8" />
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl animate-pulse bg-muted" />)}
            </div>
            <div className="w-full lg:w-[300px] h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-4xl items-center px-4 gap-3">
          <button onClick={() => navigate('/cart')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <span className="font-semibold text-foreground">Checkout</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <StepProgress current={step} />

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main content */}
          <div className="flex-1 space-y-4">

            {/* ── Address section ─────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-purple-600" />
                  <h3 className="font-semibold text-foreground">Delivery Address</h3>
                </div>
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:underline"
                >
                  <Plus size={12} />
                  Add new
                </button>
              </div>

              <div className="p-4 space-y-3">
                {showAddForm && (
                  <AddressForm
                    initial={EMPTY_FORM}
                    onSave={handleAddAddress}
                    onCancel={() => setShowAddForm(false)}
                    saving={addingSaving}
                  />
                )}

                {addresses.length === 0 && !showAddForm && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved addresses. Add one above.
                  </p>
                )}

                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    address={addr}
                    selected={addr.id === selectedAddressId}
                    onSelect={() => { setSelectedAddressId(addr.id); setStep('payment'); }}
                  />
                ))}
              </div>
            </div>

            {/* ── Wallet section ───────────────────────────────────────────── */}
            {wallet && (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-purple-600" />
                    <h3 className="font-semibold text-foreground">Wallet</h3>
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      ₹{wallet.balance} available
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setUseWallet((v) => !v);
                      if (!useWallet) {
                        setWalletAmount(Math.min(walletBalance, amountPayable).toFixed(2));
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      useWallet ? 'bg-purple-600' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      useWallet ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`} />
                  </button>
                </div>

                {useWallet && (
                  <div className="border-t px-5 pb-4 space-y-2">
                    <label className="text-xs text-muted-foreground">Amount to use from wallet</label>
                    <input
                      type="number"
                      min="0"
                      max={Math.min(walletBalance, amountPayable)}
                      step="0.01"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      className="w-full max-w-[180px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    {razorpayAmount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Remaining via Razorpay: ₹{razorpayAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Payment section ─────────────────────────────────────────── */}
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-4">
                <CreditCard size={16} className="text-purple-600" />
                <h3 className="font-semibold text-foreground">Payment</h3>
              </div>
              <div className="p-5 space-y-3">

                {/* Payment summary */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount payable</span>
                    <span className="font-medium">₹{amountPayable.toFixed(2)}</span>
                  </div>
                  {walletUse > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Wallet debit</span>
                      <span>−₹{walletUse.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1.5 mt-1.5">
                    <span>{razorpayAmount > 0 ? 'Via Razorpay' : 'Total'}</span>
                    <span>₹{razorpayAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Initiate / Confirm button area */}
                {step !== 'confirm' ? (
                  <button
                    onClick={handleInitiate}
                    disabled={initiating || !selectedAddressId}
                    className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {initiating ? (
                      <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                    ) : (
                      <>Review & Pay <ChevronRight size={14} /></>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Mock mode banner */}
                    {MOCK_MODE && razorpayAmount > 0 && (
                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-300">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>Test mode — no real payment will be processed</span>
                      </div>
                    )}

                    {/* CTA based on scenario */}
                    {razorpayAmount === 0 ? (
                      <button
                        onClick={handleWalletOnlyPayment}
                        disabled={confirming}
                        className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {confirming
                          ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Placing order…</>
                          : `Pay ₹${amountPayable.toFixed(2)} via Wallet`
                        }
                      </button>
                    ) : MOCK_MODE ? (
                      <button
                        onClick={handleSimulatePayment}
                        disabled={confirming}
                        className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {confirming
                          ? <><span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Placing order…</>
                          : `Simulate Payment — ₹${razorpayAmount.toFixed(2)}`
                        }
                      </button>
                    ) : (
                      <button
                        onClick={() => { /* Real Razorpay modal — initiated on confirm step */ }}
                        disabled={confirming}
                        className="w-full rounded-lg bg-purple-600 px-4 py-3 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
                      >
                        Pay ₹{razorpayAmount.toFixed(2)} via Razorpay
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mini order summary sidebar */}
          <div className="w-full lg:w-[300px] shrink-0">
            <MiniOrderSummary cart={cart} address={selectedAddress} />
          </div>
        </div>
      </main>
    </div>
  );
}
