import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import { productService } from '@/services/productService';
import type { Product, ProductVariant, StockLabel } from '@/types/product.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function StockBadge({ label, count }: { label: StockLabel; count: number }) {
  if (label === 'Out of Stock')
    return <span className="text-sm font-medium text-red-500">Out of Stock</span>;
  if (label === 'Low Stock')
    return <span className="text-sm font-medium text-amber-600">{count} left · Low Stock</span>;
  return <span className="text-sm font-medium text-emerald-600">{count} in stock · In Stock</span>;
}

// Toast helper
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  return { msg, show };
}

export function ProductDetail() {
  const { slug }    = useParams<{ slug: string }>();
  const navigate    = useNavigate();
  const toast       = useToast();

  const [product,         setProduct]         = useState<Product | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [selectedImage,   setSelectedImage]   = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productService.getProduct(slug)
      .then((r) => {
        setProduct(r.data);
        // Select first active variant by default
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
  const mrp      = active ? active.mrp             : product.mrp;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-5xl items-center justify-between px-4">
          <Link to="/shop" className="font-bold text-foreground">MyApp Shop</Link>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
            <ShoppingCart size={16} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">Home</Link>
          <ChevronRight size={12} />
          {product.category && (
            <>
              <Link to={`/shop?category=${product.category.slug}`} className="hover:text-foreground">
                {product.category.name}
              </Link>
              <ChevronRight size={12} />
            </>
          )}
          <span className="text-foreground">{product.name}</span>
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
            {product.category && (
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>

            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-foreground">&#8377;{mrp}</span>
            </div>

            <StockBadge label={stockLbl} count={stockCnt} />

            {/* Variants */}
            {product.variants.filter((v) => v.is_active).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {product.variants[0]?.variant_type ?? 'Variant'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.filter((v) => v.is_active).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        active?.id === v.id
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      } ${v.stock_quantity === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Add to cart */}
            <button
              onClick={() => toast.show('Login to purchase')}
              disabled={stockLbl === 'Out of Stock'}
              className="mt-2 w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {stockLbl === 'Out of Stock' ? 'Out of Stock' : 'Add to Cart'}
            </button>
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
