import axiosInstance from '@/utils/axiosInstance';
import type {
  CommissionSettings,
  ProductCommissionRule,
  VariantCommissionRule,
  VariantCommissionStatus,
  CommissionBreakup,
  CommissionEntry,
  PendingCommissionEntry,
  PendingStats,
} from '@/types/commission.types';

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

export const commissionService = {
  getSettings: () =>
    axiosInstance.get<CommissionSettings>('/api/v1/commissions/settings/'),

  updateSettings: (data: Partial<CommissionSettings>) =>
    axiosInstance.patch<CommissionSettings>('/api/v1/commissions/settings/', data),

  getProductRules: () =>
    axiosInstance.get<Paginated<ProductCommissionRule>>('/api/v1/commissions/product-rules/'),

  getProductRuleByProduct: (productId: string) =>
    axiosInstance.get<ProductCommissionRule>(`/api/v1/commissions/product-rules/by-product/?product_id=${productId}`),

  createProductRule: (data: Omit<Partial<ProductCommissionRule>, 'id' | 'product_name' | 'product_mrp' | 'product_pricing' | 'created_at' | 'updated_at'>) =>
    axiosInstance.post<ProductCommissionRule>('/api/v1/commissions/product-rules/', data),

  updateProductRule: (id: string, data: Omit<Partial<ProductCommissionRule>, 'id' | 'product_name' | 'product_mrp' | 'product_pricing' | 'created_at' | 'updated_at'>) =>
    axiosInstance.patch<ProductCommissionRule>(`/api/v1/commissions/product-rules/${id}/`, data),

  deleteProductRule: (id: string) =>
    axiosInstance.delete(`/api/v1/commissions/product-rules/${id}/`),

  getVariantsStatus: (productRuleId: string) =>
    axiosInstance.get<VariantCommissionStatus[]>(
      `/api/v1/commissions/product-rules/${productRuleId}/variants-status/`,
    ),

  getVariantRules: (params?: { product_id?: string }) =>
    axiosInstance.get<Paginated<VariantCommissionRule>>('/api/v1/commissions/variant-rules/', { params }),

  getVariantRuleByVariant: (variantId: string) =>
    axiosInstance.get<VariantCommissionRule>(
      `/api/v1/commissions/variant-rules/by-variant/?variant_id=${variantId}`,
    ),

  createVariantRule: (
    data: Omit<Partial<VariantCommissionRule>, 'id' | 'variant_name' | 'variant_sku' | 'variant_mrp' | 'product_id' | 'product_name' | 'variant_pricing' | 'created_at' | 'updated_at'>,
  ) => axiosInstance.post<VariantCommissionRule>('/api/v1/commissions/variant-rules/', data),

  updateVariantRule: (
    id: string,
    data: Omit<Partial<VariantCommissionRule>, 'id' | 'variant_name' | 'variant_sku' | 'variant_mrp' | 'product_id' | 'product_name' | 'variant_pricing' | 'created_at' | 'updated_at'>,
  ) => axiosInstance.patch<VariantCommissionRule>(`/api/v1/commissions/variant-rules/${id}/`, data),

  deleteVariantRule: (id: string) =>
    axiosInstance.delete(`/api/v1/commissions/variant-rules/${id}/`),

  getBreakups: (orderId: string) =>
    axiosInstance.get<Paginated<CommissionBreakup>>(`/api/v1/commissions/breakups/?order=${orderId}`),

  getPendingEntries: (params?: { status?: string; search?: string }) =>
    axiosInstance.get<Paginated<CommissionEntry>>('/api/v1/commissions/pending/', { params }),

  getPending: (params?: Record<string, string>) =>
    axiosInstance.get<Paginated<PendingCommissionEntry>>('/api/v1/commissions/pending/', { params }),

  getPendingStats: () =>
    axiosInstance.get<PendingStats>('/api/v1/commissions/pending/stats/'),

  creditEntry: (id: string) =>
    axiosInstance.patch<{ status: string }>(`/api/v1/commissions/pending/${id}/credit/`),

  ignoreEntry: (id: string) =>
    axiosInstance.patch<{ status: string }>(`/api/v1/commissions/pending/${id}/ignore/`),

  creditBulk: () =>
    axiosInstance.post<{ credited: string[]; errors: unknown[] }>('/api/v1/commissions/pending/credit-bulk/'),
};
