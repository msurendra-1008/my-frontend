import axiosInstance from '@/utils/axiosInstance';
import type {
  CommissionSettings,
  ProductCommissionRule,
  CommissionBreakup,
  CommissionEntry,
} from '@/types/commission.types';

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

export const commissionService = {
  getSettings: () =>
    axiosInstance.get<CommissionSettings>('/api/v1/commissions/settings/'),

  updateSettings: (data: Partial<CommissionSettings>) =>
    axiosInstance.patch<CommissionSettings>('/api/v1/commissions/settings/', data),

  getProductRules: () =>
    axiosInstance.get<Paginated<ProductCommissionRule>>('/api/v1/commissions/product-rules/'),

  createProductRule: (data: Partial<ProductCommissionRule>) =>
    axiosInstance.post<ProductCommissionRule>('/api/v1/commissions/product-rules/', data),

  updateProductRule: (id: string, data: Partial<ProductCommissionRule>) =>
    axiosInstance.patch<ProductCommissionRule>(`/api/v1/commissions/product-rules/${id}/`, data),

  deleteProductRule: (id: string) =>
    axiosInstance.delete(`/api/v1/commissions/product-rules/${id}/`),

  getBreakups: (orderId: string) =>
    axiosInstance.get<Paginated<CommissionBreakup>>(`/api/v1/commissions/breakups/?order=${orderId}`),

  getPendingEntries: (params?: { status?: string; search?: string }) =>
    axiosInstance.get<Paginated<CommissionEntry>>('/api/v1/commissions/pending/', { params }),

  creditEntry: (id: string) =>
    axiosInstance.post<CommissionEntry>(`/api/v1/commissions/pending/${id}/credit/`),
};
