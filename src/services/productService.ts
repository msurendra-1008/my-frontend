import axiosInstance from '@/utils/axiosInstance';
import type {
  Category, Product, ProductListItem, PaginatedProducts,
  UPAPriceResponse, UPADiscountSettings, ProductFilters,
} from '@/types/product.types';

export const productService = {
  // ── Categories ─────────────────────────────────────────────────────────────
  listCategories: (params?: { search?: string }) => {
    const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    return axiosInstance.get<{ results: Category[] }>(`/api/v1/categories/${qs}`);
  },

  createCategory: (data: { name: string; parent?: string | null; is_active?: boolean }) =>
    axiosInstance.post<Category>('/api/v1/categories/', data),

  updateCategory: (slug: string, data: Partial<{ name: string; parent: string | null; is_active: boolean }>) =>
    axiosInstance.patch<Category>(`/api/v1/categories/${slug}/`, data),

  deleteCategory: (slug: string) =>
    axiosInstance.delete(`/api/v1/categories/${slug}/`),

  // ── Products ──────────────────────────────────────────────────────────────
  listProducts: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.search)   params.set('search', filters.search);
    if (filters.in_stock) params.set('in_stock', 'true');
    if (filters.status)   params.set('status', filters.status);
    if (filters.stock)    params.set('stock', filters.stock);
    if (filters.page)     params.set('page', String(filters.page));
    const qs = params.toString();
    return axiosInstance.get<PaginatedProducts>(`/api/v1/products/${qs ? `?${qs}` : ''}`);
  },

  getProduct: (slug: string) =>
    axiosInstance.get<Product>(`/api/v1/products/${slug}/`),

  createProduct: (data: FormData | Record<string, unknown>) =>
    axiosInstance.post<ProductListItem>('/api/v1/products/', data),

  updateProduct: (slug: string, data: FormData | Record<string, unknown>) =>
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

  // ── UPA Discount Settings ─────────────────────────────────────────────────
  getDiscountSettings: () =>
    axiosInstance.get<UPADiscountSettings>('/api/v1/upa-discount/'),

  updateDiscountSettings: (data: { global_discount_percent: string }) =>
    axiosInstance.patch<UPADiscountSettings>('/api/v1/upa-discount/', data),
};
