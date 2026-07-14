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

  markSatisfied: (id: string) =>
    axiosInstance.post(`/api/v1/orders/${id}/mark-satisfied/`),

  getPaymentInfo: (id: string) =>
    axiosInstance.get<{
      order_id:            string;
      order_number:        string;
      price_locked:        boolean;
      hours_since_created: number;
      amount_payable:      string;
      wallet_used:         string;
      razorpay_amount:     string;
      items: Array<{
        id:               string;
        product_name:     string;
        variant_name:     string;
        variant_id:       string;
        sku:              string;
        quantity:         number;
        mrp:              string;
        upa_price:        string;
        upa_price_locked: string;
        line_total:       string;
        price_changed:    boolean;
        stock_quantity:   number;
        stock_ok:         boolean;
        stock_shortfall:  number;
      }>;
      wallet_balance:     string;
      addresses:          import('@/types/order.types').Address[];
      default_address_id: string | null;
    }>(`/api/v1/orders/${id}/payment-info/`),

  removeOrderItem: (orderId: string, itemId: string) =>
    axiosInstance.post<{ order_cancelled: boolean; amount_payable?: string }>(
      `/api/v1/orders/${orderId}/remove-item/`,
      { item_id: itemId },
    ),

  cancelOrder: (id: string) =>
    axiosInstance.post(`/api/v1/orders/${id}/cancel/`),

  retryPayment: (id: string, walletAmount = '0.00') =>
    axiosInstance.post<{
      internal_order_id: string;
      amount_payable:    string;
      wallet_used:       string;
      razorpay_amount:   string;
      razorpay_order_id: string;
      razorpay_key_id:   string;
    }>(`/api/v1/orders/${id}/retry-payment/`, { wallet_amount: walletAmount }),

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
