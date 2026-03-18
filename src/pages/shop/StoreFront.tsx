import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { productService } from '@/services/productService';
import { useAuthStore } from '@/store/authStore';
import type { ProductListItem, Category, StockLabel } from '@/types/product.types';

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

function ProductCard({ product }: { product: ProductListItem }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/shop/${product.slug}`)}
      className="rounded-lg border bg-card hover:shadow-sm transition-shadow duration-150 cursor-pointer overflow-hidden"
    >
      {/* Image — fixed height, never grows */}
      <div className="h-28 w-full bg-muted overflow-hidden">
        {product.primary_image ? (
          <img
            src={product.primary_image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
            <ShoppingCart size={28} />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        {product.category_name && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded mb-1">
            {product.category_name}
          </span>
        )}
        <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">{product.name}</p>
        <p className="text-sm font-semibold mt-1 text-foreground">&#8377;{product.mrp}</p>
        <div className="mt-1">
          <StockBadge label={product.stock_label} />
        </div>
      </div>
    </div>
  );
}

export function StoreFront() {
  const { isAuthenticated } = useAuthStore();
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
            <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent">
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
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

          {/* Category */}
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

          {/* In stock toggle */}
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
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
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
