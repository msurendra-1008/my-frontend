import axiosInstance from '@/utils/axiosInstance';
import type {
  Address, AddressFormData,
  CheckoutInitiateRequest, CheckoutInitiateResponse,
  CheckoutConfirmRequest,
  Order, PaginatedOrders,
} from '@/types/order.types';

export const orderService = {
  // ── Addresses ──────────────────────────────────────────────────────────────
  getAddresses: () =>
    axiosInstance.get<Address[]>('/api/v1/addresses/'),

  createAddress: (data: AddressFormData) =>
    axiosInstance.post<Address>('/api/v1/addresses/', data),

  updateAddress: (id: string, data: Partial<AddressFormData>) =>
    axiosInstance.patch<Address>(`/api/v1/addresses/${id}/`, data),

  deleteAddress: (id: string) =>
    axiosInstance.delete(`/api/v1/addresses/${id}/`),

  setDefaultAddress: (id: string) =>
    axiosInstance.post<Address>(`/api/v1/addresses/${id}/set-default/`),

  // ── Checkout ───────────────────────────────────────────────────────────────
  initiateCheckout: (data: CheckoutInitiateRequest) =>
    axiosInstance.post<CheckoutInitiateResponse>('/api/v1/checkout/initiate/', data),

  confirmCheckout: (data: CheckoutConfirmRequest) =>
    axiosInstance.post<Order>('/api/v1/checkout/confirm/', data),

  // ── User Orders ────────────────────────────────────────────────────────────
  getMyOrders: (page = 1) =>
    axiosInstance.get<PaginatedOrders>(`/api/v1/orders/?page=${page}`),

  getMyOrder: (id: string) =>
    axiosInstance.get<Order>(`/api/v1/orders/${id}/`),

  // ── Admin Orders ───────────────────────────────────────────────────────────
  getAdminOrders: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return axiosInstance.get<PaginatedOrders>(`/api/v1/admin/orders/${qs ? '?' + qs : ''}`);
  },

  getAdminOrder: (id: string) =>
    axiosInstance.get<Order>(`/api/v1/admin/orders/${id}/`),

  adminUpdateOrder: (id: string, data: { order_status?: string; tracking_number?: string }) =>
    axiosInstance.patch<Order>(`/api/v1/admin/orders/${id}/`, data),
};
