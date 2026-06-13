import axiosInstance from '@/utils/axiosInstance'
import type { CreateBillPayload, OfflineBill, ValidateCodeResponse } from '@/types/billing.types'

export const billingService = {
  // Product search for billing (returns paginated variants)
  searchProducts: (q: string) =>
    axiosInstance.get('/api/v1/products/', {
      params: { search: q, page_size: 20 },
    }),

  // Customer search (UPA / regular users)
  searchCustomers: (q: string) =>
    axiosInstance.get('/api/v1/upa-users/', {
      params: { search: q, page_size: 10 },
    }),

  // Validate discount code
  validateCode: (code: string, cartTotal: number) =>
    axiosInstance.post<ValidateCodeResponse>(
      '/api/v1/billing/discount-codes/validate/',
      { code, cart_total: cartTotal },
    ),

  // Create bill
  createBill: (data: CreateBillPayload) =>
    axiosInstance.post<OfflineBill>('/api/v1/billing/create-bill/', data),

  // Get single bill by number
  getBill: (billNumber: string) =>
    axiosInstance.get<OfflineBill>(`/api/v1/billing/bills/${billNumber}/`),

  // List bills (paginated)
  getBills: (params?: Record<string, string>) =>
    axiosInstance.get('/api/v1/billing/bills/', { params }),

  // List offline orders (paginated) — includes commission data
  getOfflineOrders: (params?: Record<string, string>) =>
    axiosInstance.get('/api/v1/billing/offline-orders/', { params }),

  // Submit return request
  createReturn: (formData: FormData) =>
    axiosInstance.post('/api/v1/billing/returns/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Discount code management (admin)
  getDiscountCodes: () =>
    axiosInstance.get('/api/v1/billing/discount-codes/'),

  createDiscountCode: (data: unknown) =>
    axiosInstance.post('/api/v1/billing/discount-codes/', data),

  updateDiscountCode: (id: string, data: unknown) =>
    axiosInstance.patch(`/api/v1/billing/discount-codes/${id}/`, data),

  deleteDiscountCode: (id: string) =>
    axiosInstance.delete(`/api/v1/billing/discount-codes/${id}/`),
}
