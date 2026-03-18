import axiosInstance from '@/utils/axiosInstance';
import type { Cart } from '@/types/order.types';

export const cartService = {
  getCart: () =>
    axiosInstance.get<Cart>('/api/v1/cart/'),

  addItem: (variantId: string, quantity = 1) =>
    axiosInstance.post<Cart>('/api/v1/cart/add/', { variant_id: variantId, quantity }),

  updateItem: (itemId: string, quantity: number) =>
    axiosInstance.patch<Cart>(`/api/v1/cart/${itemId}/update/`, { quantity }),

  removeItem: (itemId: string) =>
    axiosInstance.delete<Cart>(`/api/v1/cart/${itemId}/remove/`),

  clearCart: () =>
    axiosInstance.delete('/api/v1/cart/clear/'),
};
