import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, ProductVariant } from '@/types/cart';

interface CartStore {
  items: CartItem[];
  addItem: (productId: string, variant: ProductVariant, quantity: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  syncWithServer: () => Promise<void>;
  isSyncing: boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isSyncing: false,

      addItem: (productId, variant, quantity) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === productId && item.variant.id === variant.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          const newItem: CartItem = {
            id: `${productId}-${variant.id}-${Date.now()}`,
            productId,
            variant,
            quantity,
            addedAt: new Date().toISOString(),
          };

          return { items: [...state.items, newItem] };
        });

        // Sync in background
        get().syncWithServer();
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
        get().syncWithServer();
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
        get().syncWithServer();
      },

      clearCart: () => {
        set({ items: [] });
        get().syncWithServer();
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.variant.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      syncWithServer: async () => {
        if (typeof window === 'undefined' || get().isSyncing) return;

        set({ isSyncing: true });
        try {
          const { supabase } = await import('@/lib/supabase/client');
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const cartData = get().items.map((item) => ({
              product_id: item.productId,
              variant_id: item.variant.id,
              quantity: item.quantity,
            }));

            await supabase
              .from('user_carts')
              .upsert({
                user_id: session.user.id,
                items: cartData,
                updated_at: new Date().toISOString(),
              });
          }
        } catch (error) {
          console.error('Failed to sync cart:', error);
          // Store offline for later sync
          const offlineCart = {
            timestamp: Date.now(),
            items: get().items,
          };
          localStorage.setItem('xarastore-offline-cart', JSON.stringify(offlineCart));
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'xarastore-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
