import axiosInstance from '@/utils/axiosInstance';
import type {
  Brand, Category, CategoryTreeNode, PaginatedBrands, PaginatedCategories,
  Product, PaginatedProducts,
  UPAPriceResponse, UPADiscountSettings, ProductFilters,
  ProductCreatePayload,
} from '@/types/product.types';

export const productService = {
  // ── Categories ─────────────────────────────────────────────────────────────

  listCategories: (params?: { search?: string; depth?: number; parent?: string; is_active?: boolean }) => {
    const p = new URLSearchParams();
    if (params?.search)    p.set('search',    params.search);
    if (params?.depth !== undefined) p.set('depth', String(params.depth));
    if (params?.parent)    p.set('parent',    params.parent);
    if (params?.is_active) p.set('is_active', 'true');
    const qs = p.toString();
    return axiosInstance.get<PaginatedCategories>(`/api/v1/categories/${qs ? `?${qs}` : ''}`);
  },

  getCategoryChildren: (slug: string, activeOnly?: boolean) =>
    axiosInstance.get<Category[]>(
      `/api/v1/categories/${slug}/children/${activeOnly ? '?is_active=true' : ''}`,
    ),

  getCategoryTree: (activeOnly?: boolean) =>
    axiosInstance.get<CategoryTreeNode[]>(
      `/api/v1/categories/tree/${activeOnly ? '?is_active=true' : ''}`,
    ),

  getCategory: (slug: string) =>
    axiosInstance.get<Category>(`/api/v1/categories/${slug}/`),

  createCategory: (data: {
    name:        string;
    depth:       number;
    short_code?: string;
    parent?:     string | null;
    is_active?:  boolean;
  }) => axiosInstance.post<Category>('/api/v1/categories/', data),

  updateCategory: (slug: string, data: Partial<{
    name:        string;
    short_code:  string;
    parent:      string | null;
    is_active:   boolean;
  }>) => axiosInstance.patch<Category>(`/api/v1/categories/${slug}/`, data),

  updateCategorySchema: (slug: string, field_schema: object) =>
    axiosInstance.patch<Category>(`/api/v1/categories/${slug}/schema/`, { field_schema }),

  deleteCategory: (slug: string) =>
    axiosInstance.delete(`/api/v1/categories/${slug}/`),

  // ── Brands ────────────────────────────────────────────────────────────────

  listBrands: (params?: { search?: string; is_active?: boolean }) => {
    const p = new URLSearchParams();
    if (params?.search)    p.set('search',    params.search);
    if (params?.is_active) p.set('is_active', 'true');
    const qs = p.toString();
    return axiosInstance.get<PaginatedBrands>(`/api/v1/brands/${qs ? `?${qs}` : ''}`);
  },

  getBrand: (slug: string) =>
    axiosInstance.get<Brand>(`/api/v1/brands/${slug}/`),

  createBrand: (data: FormData | { name: string; is_active?: boolean }) =>
    axiosInstance.post<Brand>('/api/v1/brands/', data),

  updateBrand: (slug: string, data: FormData | Partial<{ name: string; is_active: boolean }>) =>
    axiosInstance.patch<Brand>(`/api/v1/brands/${slug}/`, data),

  deleteBrand: (slug: string) =>
    axiosInstance.delete(`/api/v1/brands/${slug}/`),

  // ── Products ──────────────────────────────────────────────────────────────

  listProducts: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.brand)    params.set('brand',    filters.brand);
    if (filters.search)   params.set('search',   filters.search);
    if (filters.in_stock) params.set('in_stock', 'true');
    if (filters.status)   params.set('status',   filters.status);
    if (filters.stock)    params.set('stock',    filters.stock);
    if (filters.page)     params.set('page',     String(filters.page));
    const qs = params.toString();
    return axiosInstance.get<PaginatedProducts>(`/api/v1/products/${qs ? `?${qs}` : ''}`);
  },

  getProduct: (slug: string) =>
    axiosInstance.get<Product>(`/api/v1/products/${slug}/`),

  createProduct: (data: ProductCreatePayload) =>
    axiosInstance.post<Product>('/api/v1/products/', data),

  updateProduct: (slug: string, data: Partial<ProductCreatePayload>) =>
    axiosInstance.patch<Product>(`/api/v1/products/${slug}/`, data),

  deleteProduct: (slug: string) =>
    axiosInstance.delete(`/api/v1/products/${slug}/`),

  togglePublish: (slug: string) =>
    axiosInstance.patch<{ slug: string; is_published: boolean; message: string }>(
      `/api/v1/products/${slug}/toggle-publish/`,
    ),

  uploadImage: (slug: string, form: FormData) =>
    axiosInstance.post(`/api/v1/products/${slug}/upload-image/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteImage: (slug: string, imageId: string) =>
    axiosInstance.delete(`/api/v1/products/${slug}/images/${imageId}/`),

  getUPAPrice: (slug: string) =>
    axiosInstance.get<UPAPriceResponse>(`/api/v1/products/${slug}/upa-price/`),

  addVariant: (slug: string, data: Record<string, unknown>) =>
    axiosInstance.post(`/api/v1/products/${slug}/variants/`, data),

  updateVariant: (slug: string, variantId: string, data: Record<string, unknown>) =>
    axiosInstance.patch(`/api/v1/products/${slug}/variants/${variantId}/`, data),

  deleteVariant: (slug: string, variantId: string) =>
    axiosInstance.delete(`/api/v1/products/${slug}/variants/${variantId}/`),

  setPricing: (id: string, data: {
    purchase_price?:        number;
    gst_percentage?:        number;
    other_charges?:         number;
    other_charges_type?:    'flat' | 'percent';
    upa_discount_override?: number;
    variant_prices?: {
      id:              string;
      purchase_price?: number;
      selling_price?:  number;
    }[];
  }) => axiosInstance.patch<Product>(`/api/v1/products/${id}/set-pricing/`, data),

  // ── UPA Discount Settings ─────────────────────────────────────────────────

  getDiscountSettings: () =>
    axiosInstance.get<UPADiscountSettings>('/api/v1/upa-discount/'),

  updateDiscountSettings: (data: { global_discount_percent: string }) =>
    axiosInstance.patch<UPADiscountSettings>('/api/v1/upa-discount/', data),
};
