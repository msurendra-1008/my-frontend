import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { productService } from '@/services/productService';
import type { ProductListItem, Category, StockLabel, UPAPrice } from '@/types/product.types';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />;
}

function StockBadge({ label }: { label: StockLabel }) {
  if (label === 'Out of Stock')
    return <span className="text-[10px] font-medium text-red-500">Out of Stock</span>;
  if (label === 'Low Stock')
    return <span className="text-[10px] font-medium text-amber-600">Low Stock</span>;
  return <span className="text-[10px] font-medium text-emerald-600">In Stock</span>;
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };
  return { msg, show };
}

// Cache UPA prices so we don't re-fetch on every render
const upaCache: Record<string, UPAPrice> = {};

function ProductCard({ product }: { product: ProductListItem }) {
  const navigate = useNavigate();
  const toast    = useToast();
  const [upaPrice, setUpaPrice] = useState<UPAPrice | null>(upaCache[product.slug] ?? null);

  useEffect(() => {
    if (upaCache[product.slug]) { setUpaPrice(upaCache[product.slug]); return; }
    productService.getUPAPrice(product.slug)
      .then((r) => {
        upaCache[product.slug] = r.data.product;
        setUpaPrice(r.data.product);
      })
      .catch(() => {});
  }, [product.slug]);

  return (
    <div className="rounded-lg border bg-card hover:shadow-sm transition-shadow duration-150 overflow-hidden">
      {/* Image — fixed height */}
      <div
        onClick={() => navigate(`/shop/${product.slug}`)}
        className="relative h-28 w-full bg-muted overflow-hidden cursor-pointer"
      >
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name}
            className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
            <ShoppingCart size={28} />
          </div>
        )}
        {upaPrice && parseFloat(upaPrice.discount_percent) > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {upaPrice.discount_percent}% OFF
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {product.category_name && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded mb-1">
            {product.category_name}
          </span>
        )}
        <p
          onClick={() => navigate(`/shop/${product.slug}`)}
          className="text-sm font-medium leading-tight line-clamp-2 cursor-pointer hover:text-primary text-foreground"
        >
          {product.name}
        </p>

        {/* Pricing */}
        <div className="mt-1">
          {upaPrice ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                &#8377;{upaPrice.upa_price}
              </span>
              {parseFloat(upaPrice.discount_percent) > 0 && (
                <span className="text-xs text-muted-foreground line-through">&#8377;{product.mrp}</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-foreground">&#8377;{product.mrp}</span>
          )}
        </div>

        <div className="mt-1">
          <StockBadge label={product.stock_label} />
        </div>

        <button
          onClick={() => toast.show('Cart coming soon')}
          disabled={product.stock_label === 'Out of Stock'}
          className="mt-2 w-full h-8 rounded-md bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add to Cart
        </button>
      </div>

      {toast.msg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border bg-card px-4 py-3 shadow-lg text-sm text-foreground">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export function ShopTab() {
  const [products,    setProducts]    = useState<ProductListItem[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage,    setNextPage]    = useState<string | null>(null);
  const [page,        setPage]        = useState(1);

  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [inStock,     setInStock]     = useState(false);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    productService.listCategories().then((r) => {
      const data = r.data as { results?: Category[] } | Category[];
      setCategories(Array.isArray(data) ? data : (data.results ?? []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    productService.listProducts({
      search: search || undefined, category: category || undefined,
      in_stock: inStock || undefined, page: 1,
    }).then((r) => {
      setProducts(r.data.results);
      setNextPage(r.data.next);
      setPage(1);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [search, category, inStock]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); };

  const handleLoadMore = async () => {
    const nextPg = page + 1;
    setLoadingMore(true);
    try {
      const r = await productService.listProducts({
        search: search || undefined, category: category || undefined,
        in_stock: inStock || undefined, page: nextPg,
      });
      setProducts((prev) => [...prev, ...r.data.results]);
      setNextPage(r.data.next);
      setPage(nextPg);
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          className="rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <SlidersHorizontal size={14} />
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="rounded" />
          In stock only
        </label>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {[1,2,3,4,5,6].map((i) => (
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
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border bg-card">
          <p className="font-medium text-foreground">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {!loading && nextPage && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-lg border px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
