'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, ProductVariant } from '@/types/cart';

interface CartStore {
  items: CartItem[];
  addItem: (productId: string, variant: ProductVariant, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  isInCart: (productId: string, variantId: string) => boolean;
  getItemQuantity: (productId: string, variantId: string) => number;
  syncWithServer: () => Promise<void>;
  isSyncing: boolean;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isSyncing: false,

      addItem: async (productId, variant, quantity) => {
        // Validate inputs
        if (!productId || !variant || quantity < 1) {
          throw new Error('Invalid parameters for add to cart');
        }

        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === productId && item.variant.id === variant.id
          );

          if (existingItem) {
            // Check if new quantity would exceed stock
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > variant.stock) {
              throw new Error(`Only ${variant.stock} items available in stock`);
            }

            return {
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? { ...item, quantity: newQuantity }
                  : item
              ),
            };
          }

          const newItem: CartItem = {
            id: `${productId}-${variant.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            productId,
            variant,
            quantity,
            addedAt: new Date().toISOString(),
          };

          return { items: [...state.items, newItem] };
        });

        // Sync in background
        await get().syncWithServer().catch(console.error);
      },

      removeItem: (itemId) => {
        if (!itemId) return;
        
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
        get().syncWithServer().catch(console.error);
      },

      updateQuantity: (itemId, quantity) => {
        if (!itemId) return;
        
        if (quantity < 1) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === itemId) {
              // Validate against stock
              if (quantity > item.variant.stock) {
                throw new Error(`Cannot exceed available stock of ${item.variant.stock}`);
              }
              return { ...item, quantity };
            }
            return item;
          }),
        }));
        get().syncWithServer().catch(console.error);
      },

      clearCart: () => {
        set({ items: [] });
        get().syncWithServer().catch(console.error);
      },

      getTotal: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + (item.variant.price * item.quantity),
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      isInCart: (productId, variantId) => {
        return get().items.some(
          (item) => item.productId === productId && item.variant.id === variantId
        );
      },

      getItemQuantity: (productId, variantId) => {
        const item = get().items.find(
          (item) => item.productId === productId && item.variant.id === variantId
        );
        return item?.quantity || 0;
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

            const { error } = await supabase
              .from('user_carts')
              .upsert({
                user_id: session.user.id,
                items: cartData,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id'
              });

            if (error) throw error;
          } else {
            // Store in localStorage for guests
            const offlineCart = {
              timestamp: Date.now(),
              items: get().items,
            };
            localStorage.setItem('xarastore-offline-cart', JSON.stringify(offlineCart));
          }
        } catch (error) {
          console.error('Failed to sync cart:', error);
          // Don't throw - allow offline operation
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
