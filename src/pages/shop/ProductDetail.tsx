import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, Minus, Plus } from 'lucide-react';
import { productService } from '@/services/productService';
import { cartService } from '@/services/cartService';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { Product, ProductVariant } from '@/types/product.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  return { msg, show };
}

export function ProductDetail() {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();
  const toast       = useToast();
  const user        = useAuthStore((s) => s.user);
  const { cartCount, fetchCartCount } = useCartStore();

  const [product,         setProduct]         = useState<Product | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [selectedImage,   setSelectedImage]   = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [qty,             setQty]             = useState(1);
  const [addingToCart,    setAddingToCart]    = useState(false);
  const [addedToCart,     setAddedToCart]     = useState(false);

  useEffect(() => { setAddedToCart(false); setQty(1); }, [selectedVariant]);

  useEffect(() => {
    if (user) fetchCartCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productService.getProduct(slug)
      .then((r) => {
        setProduct(r.data);
        const first = r.data.variants.find((v) => v.is_active) ?? null;
        setSelectedVariant(first);
      })
      .catch(() => navigate('/shop', { replace: true }))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-[52px] max-w-5xl items-center px-4">
            <Skeleton className="h-4 w-48" />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) return null;

  const images   = product.images;
  const current  = images[selectedImage];
  const active   = selectedVariant ?? (product.variants[0] ?? null);
  const stockCnt = active ? active.stock_quantity : product.total_stock;
  const stockLbl = active ? active.stock_label    : product.stock_label;
  const mrp      = active?.mrp ?? product.mrp;
  const maxQty   = Math.min(stockCnt, 10);

  const handleAddToCart = async () => {
    if (!user) {
      toast.show('Login to add to cart');
      setTimeout(() => navigate('/login?next=/shop'), 1500);
      return;
    }
    if (!selectedVariant) { toast.show('Please select a variant'); return; }
    setAddingToCart(true);
    try {
      await cartService.addItem(selectedVariant.id, qty);
      await fetchCartCount();
      setAddedToCart(true);
    } catch {
      toast.show('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddMore = async () => {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await cartService.addItem(selectedVariant.id, qty);
      await fetchCartCount();
      toast.show(`${qty} more added to cart`);
    } catch {
      toast.show('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-4">
          <Link to="/shop" className="font-bold text-foreground">MyApp Shop</Link>
          <button
            onClick={() => navigate('/cart')}
            className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Cart"
          >
            <ShoppingCart size={16} />
            {user && cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Back + Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={15} />
          Back to Shop
        </button>

        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">Shop</Link>
          {product.category && (
            <>
              <ChevronRight size={11} />
              <Link to={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={11} />
          <span className="text-foreground truncate max-w-[180px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Image gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
              {current?.image ? (
                <img src={current.image} alt={current.alt_text || product.name}
                  className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/30">
                  <ShoppingCart size={48} />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                      i === selectedImage ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                    }`}
                  >
                    {img.image && (
                      <img src={img.image} alt={img.alt_text} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            {/* Category · Brand */}
            {(product.category || product.brand) && (
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {[product.category?.name, product.brand?.name].filter(Boolean).join(' · ')}
              </p>
            )}
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>

            {/* Price block */}
            <div className="rounded-xl border bg-muted/30 px-4 py-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                UPA Member Price
              </p>
              <div className="text-3xl font-bold text-primary">
                {active?.upa_price_computed
                  ? `₹${Number(active.upa_price_computed.upa_price).toLocaleString('en-IN')}`
                  : mrp ? `₹${Number(mrp).toLocaleString('en-IN')}` : '—'
                }
              </div>
              {active?.upa_price_computed && parseFloat(active.upa_price_computed.discount_percent) > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground line-through">
                    MRP ₹{Number(mrp).toLocaleString('en-IN')}
                  </span>
                  <span className="rounded-md border border-green-400/40 bg-green-500/10 px-2 py-0.5 text-xs font-bold text-green-600 dark:text-green-400">
                    Save ₹{Number(active.upa_price_computed.saving).toLocaleString('en-IN')} · {active.upa_price_computed.discount_percent}% off
                  </span>
                </div>
              )}
            </div>

            {/* Stock banner */}
            <div className={[
              'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
              stockLbl === 'In Stock'  ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
              stockLbl === 'Low Stock' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
              'bg-red-500/10 text-red-600 dark:text-red-400'
            ].join(' ')}>
              <span className={[
                'h-2 w-2 rounded-full flex-shrink-0',
                stockLbl === 'In Stock'  ? 'bg-emerald-500' :
                stockLbl === 'Low Stock' ? 'bg-amber-400'  : 'bg-red-500'
              ].join(' ')} />
              {stockLbl === 'In Stock'
                ? `In Stock · ${stockCnt} units available`
                : stockLbl === 'Low Stock'
                ? `Low Stock · Only ${stockCnt} left`
                : 'Out of Stock'}
            </div>

            {/* Variant selector */}
            {product.variants.filter((v) => v.is_active).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Choose Variant
                  </p>
                  {active && (
                    <span className="text-xs font-medium text-primary">
                      {active.name} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.variants.filter((v) => v.is_active).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { if (v.stock_quantity > 0) setSelectedVariant(v); }}
                      className={[
                        'flex flex-col items-center rounded-xl border px-3 py-2 min-w-[64px] text-sm transition-colors',
                        active?.id === v.id
                          ? 'border-primary bg-primary text-primary-foreground font-semibold'
                          : v.stock_quantity === 0
                            ? 'opacity-40 cursor-not-allowed border-border text-muted-foreground line-through'
                            : 'border-border text-foreground hover:border-primary hover:text-primary',
                      ].join(' ')}
                    >
                      <span>{v.name}</span>
                      <span className={`text-[10px] mt-0.5 ${active?.id === v.id ? 'opacity-90' : 'text-muted-foreground'}`}>
                        {v.upa_price_computed
                          ? `₹${Number(v.upa_price_computed.upa_price).toLocaleString('en-IN')}`
                          : v.upa_price
                          ? `₹${Number(v.upa_price).toLocaleString('en-IN')}`
                          : v.mrp ? `₹${Number(v.mrp).toLocaleString('en-IN')}` : '—'
                        }
                      </span>
                    </button>
                  ))}
                </div>
                {active && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    SKU: <span className="font-mono">{active.sku}</span>
                    {active.stock_quantity > 0 && active.stock_quantity <= 10 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">· Only {active.stock_quantity} left</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Extra fields */}
            {product.extra_fields && Object.keys(product.extra_fields).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.extra_fields).map(([key, val]) => (
                    <div key={key} className="rounded-lg border bg-muted/30 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Cart */}
            <div className="space-y-2 pt-1">
              {stockLbl !== 'Out of Stock' && !addedToCart && (
                <div className="flex items-center gap-3">
                  {/* Qty stepper */}
                  <div className="flex items-center rounded-lg border bg-muted/30">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1}
                      className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      disabled={qty >= maxQty}
                      className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Add to cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="flex-1 h-10 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingToCart ? 'Adding…' : `Add to Cart`}
                  </button>
                </div>
              )}

              {stockLbl === 'Out of Stock' && (
                <button
                  disabled
                  className="w-full h-10 rounded-lg bg-muted text-sm font-semibold text-muted-foreground cursor-not-allowed"
                >
                  Out of Stock
                </button>
              )}

              {addedToCart && (
                <>
                  <button
                    onClick={() => navigate('/cart')}
                    className="w-full h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Go to Cart →
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border bg-muted/30">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                        disabled={qty >= maxQty}
                        className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={handleAddMore}
                      disabled={addingToCart}
                      className="flex-1 h-10 rounded-lg border border-primary/50 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                    >
                      {addingToCart ? 'Adding…' : '+ Add More'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast.msg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border bg-card px-4 py-3 shadow-lg text-sm text-foreground">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
