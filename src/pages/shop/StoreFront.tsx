import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { productService } from '@/services/productService';
import { cartService } from '@/services/cartService';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { ProductListItem, Category } from '@/types/product.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function ProductCard({ product }: { product: ProductListItem }) {
  const navigate    = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { fetchCartCount } = useCartStore();
  const [addingCart, setAddingCart] = useState(false);

  const displayMrp  = product.min_variant_mrp ?? product.mrp;
  const upaPrice    = product.min_variant_upa_price;
  const discPct     = product.max_discount_percent;
  const showFrom    = product.variant_count > 1;
  const isOos       = product.stock_label === 'Out of Stock';
  const hasDiscount = upaPrice !== null && discPct !== null && parseFloat(discPct) > 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login?next=/shop'); return; }
    if (!product.first_variant_id || isOos) return;
    setAddingCart(true);
    try {
      await cartService.addItem(product.first_variant_id);
      await fetchCartCount();
    } catch { /* ignore */ } finally {
      setAddingCart(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/shop/${product.slug}`)}
      className="rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-150 hover:border-primary/50 hover:shadow-md flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/20">
            <ShoppingCart size={32} />
          </div>
        )}
        {product.category_name && (
          <span className="absolute top-2 left-2 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5">
            {product.category_name}
          </span>
        )}
        {product.variant_count > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/55 text-white/70 text-[10px] font-semibold px-1.5 py-0.5 border border-white/10">
            {product.variant_count} options
          </span>
        )}
        <span className={[
          'absolute top-2.5 right-2.5 h-2 w-2 rounded-full',
          product.stock_label === 'In Stock'  ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' :
          product.stock_label === 'Low Stock' ? 'bg-amber-400 shadow-[0_0_5px_#fbbf24]' :
          'bg-red-500'
        ].join(' ')} />
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        {product.brand_name && (
          <p className="text-[10px] text-muted-foreground">{product.brand_name}</p>
        )}
        <p className="text-sm font-semibold leading-tight line-clamp-2 text-foreground">{product.name}</p>
        <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
          {showFrom && <span className="text-[10px] text-muted-foreground">From</span>}
          {hasDiscount ? (
            <>
              <span className="text-sm font-bold text-primary">
                ₹{Number(upaPrice).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] text-muted-foreground line-through">
                ₹{Number(displayMrp).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1 rounded">
                {parseFloat(discPct!).toFixed(0)}% off
              </span>
            </>
          ) : displayMrp ? (
            <span className="text-sm font-bold text-foreground">
              ₹{Number(displayMrp).toLocaleString('en-IN')}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Price not set</span>
          )}
        </div>
        <p className={[
          'text-[10px] font-medium',
          product.stock_label === 'In Stock'  ? 'text-emerald-600 dark:text-emerald-400' :
          product.stock_label === 'Low Stock' ? 'text-amber-600 dark:text-amber-400' :
          'text-red-500'
        ].join(' ')}>
          {product.stock_label === 'In Stock'  ? '● In Stock' :
           product.stock_label === 'Low Stock' ? '● Low Stock' : '● Out of Stock'}
        </p>
      </div>

      {/* CTAs */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/shop/${product.slug}`); }}
          disabled={isOos}
          className="flex-1 h-8 rounded-lg border border-primary/40 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isOos ? 'Out of Stock' : product.variant_count > 1 ? 'View Options' : 'View Product'}
        </button>
        <button
          onClick={handleQuickAdd}
          disabled={isOos || addingCart || !product.first_variant_id}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={product.variant_count > 1 ? 'Add first option to cart' : 'Add to cart'}
        >
          {addingCart ? <span className="text-[10px] font-bold">…</span> : <ShoppingCart size={13} />}
        </button>
      </div>
    </div>
  );
}

export function StoreFront() {
  const { isAuthenticated } = useAuthStore();
  const { cartCount, setCartCount } = useCartStore();
  const navigate = useNavigate();

  const [products,    setProducts]    = useState<ProductListItem[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage,    setNextPage]    = useState<string | null>(null);
  const [page,        setPage]        = useState(1);

  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('');
  const [inStock,    setInStock]    = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Fetch cart count for logged-in users
  useEffect(() => {
    if (!isAuthenticated) return;
    cartService.getCart()
      .then((r) => setCartCount(r.data.totals.item_count))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchProducts = useCallback(async (reset = false) => {
    const pg = reset ? 1 : page;
    if (!reset) setLoadingMore(true); else setLoading(true);
    try {
      const r = await productService.listProducts({
        search:   search || undefined,
        category: category || undefined,
        in_stock: inStock || undefined,
        page:     pg,
      });
      if (reset) {
        setProducts(r.data.results);
        setPage(1);
      } else {
        setProducts((prev) => [...prev, ...r.data.results]);
      }
      setNextPage(r.data.next);
    } catch { /* ignore */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, category, inStock, page]);

  useEffect(() => {
    productService.listCategories().then((r) => {
      const data = r.data as { results?: Category[] } | Category[];
      setCategories(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, inStock]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleLoadMore = async () => {
    const nextPg = page + 1;
    setPage(nextPg);
    setLoadingMore(true);
    try {
      const r = await productService.listProducts({
        search: search || undefined, category: category || undefined,
        in_stock: inStock || undefined, page: nextPg,
      });
      setProducts((prev) => [...prev, ...r.data.results]);
      setNextPage(r.data.next);
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between px-4">
          <Link to="/shop" className="font-bold text-foreground">MyApp Shop</Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="text-xs font-medium text-primary hover:underline"
              >
                My Account
              </button>
            ) : (
              <Link to="/login" className="text-xs font-medium text-primary hover:underline">
                Login
              </Link>
            )}
            <button
              onClick={() => isAuthenticated ? navigate('/cart') : navigate('/login?next=/shop')}
              className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
              aria-label="Cart"
            >
              <ShoppingCart size={16} />
              {isAuthenticated && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Search
            </button>
          </form>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <SlidersHorizontal size={14} />
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded"
            />
            In stock only
          </label>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {[1,2,3,4,5,6,7,8].map((i) => (
              <div key={i} className="rounded-lg border overflow-hidden">
                <Skeleton className="h-28 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-foreground">No products found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && nextPage && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-lg border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
