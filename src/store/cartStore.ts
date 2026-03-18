import { create } from 'zustand';
import { cartService } from '@/services/cartService';

interface CartState {
  cartCount: number;
  setCartCount: (count: number) => void;
  incrementCartCount: () => void;
  fetchCartCount: () => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  cartCount: 0,
  setCartCount: (count) => set({ cartCount: count }),
  incrementCartCount: () => set((state) => ({ cartCount: state.cartCount + 1 })),
  fetchCartCount: async () => {
    try {
      const res = await cartService.getCart();
      set({ cartCount: res.data.totals.item_count });
    } catch { /* ignore */ }
  },
}));
