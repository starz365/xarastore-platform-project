import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCart } from '@/lib/hooks/useCart';
import { supabase } from '@/lib/supabase/client';

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(),
    })),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCart Hook', () => {
  const mockVariant = {
    id: 'variant-123',
    name: 'Test Variant',
    price: 9999,
    originalPrice: 12999,
    sku: 'TEST-123-V1',
    stock: 10,
    attributes: { color: 'Black', size: 'M' },
  };

  const mockSession = {
    data: {
      session: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    (supabase.auth.getSession as any).mockResolvedValue(mockSession);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('initializes with empty cart', () => {
    const { result } = renderHook(() => useCart());
    
    expect(result.current.items).toEqual([]);
    expect(result.current.getItemCount()).toBe(0);
    expect(result.current.getTotal()).toBe(0);
    expect(result.current.isSyncing).toBe(false);
  });

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({
      id: expect.any(String),
      productId: 'product-123',
      variant: mockVariant,
      quantity: 2,
      addedAt: expect.any(String),
    });
    expect(result.current.getItemCount()).toBe(2);
    expect(result.current.getTotal()).toBe(19998); // 9999 * 2
  });

  it('updates quantity when adding existing item', () => {
    const { result } = renderHook(() => useCart());
    
    // Add item first time
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
    });
    
    // Add same item again
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.getItemCount()).toBe(3);
    expect(result.current.getTotal()).toBe(29997); // 9999 * 3
  });

  it('adds different variants as separate items', () => {
    const { result } = renderHook(() => useCart());
    
    const variant2 = {
      ...mockVariant,
      id: 'variant-456',
      attributes: { color: 'White', size: 'M' },
    };
    
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
      result.current.addItem('product-123', variant2, 2);
    });
    
    expect(result.current.items).toHaveLength(2);
    expect(result.current.getItemCount()).toBe(3);
    expect(result.current.getTotal()).toBe(29997); // 9999 * 1 + 9999 * 2
  });

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCart());
    
    // Add item first
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    const itemId = result.current.items[0].id;
    
    // Remove the item
    act(() => {
      result.current.removeItem(itemId);
    });
    
    expect(result.current.items).toHaveLength(0);
    expect(result.current.getItemCount()).toBe(0);
    expect(result.current.getTotal()).toBe(0);
  });

  it('updates item quantity', () => {
    const { result } = renderHook(() => useCart());
    
    // Add item first
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    const itemId = result.current.items[0].id;
    
    // Update quantity
    act(() => {
      result.current.updateQuantity(itemId, 5);
    });
    
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.getItemCount()).toBe(5);
    expect(result.current.getTotal()).toBe(49995); // 9999 * 5
  });

  it('removes item when quantity is updated to 0', () => {
    const { result } = renderHook(() => useCart());
    
    // Add item first
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    const itemId = result.current.items[0].id;
    
    // Update quantity to 0
    act(() => {
      result.current.updateQuantity(itemId, 0);
    });
    
    expect(result.current.items).toHaveLength(0);
    expect(result.current.getItemCount()).toBe(0);
  });

  it('clears entire cart', () => {
    const { result } = renderHook(() => useCart());
    
    // Add multiple items
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
      result.current.addItem('product-456', { ...mockVariant, id: 'variant-456' }, 1);
    });
    
    expect(result.current.items).toHaveLength(2);
    
    // Clear cart
    act(() => {
      result.current.clearCart();
    });
    
    expect(result.current.items).toHaveLength(0);
    expect(result.current.getItemCount()).toBe(0);
    expect(result.current.getTotal()).toBe(0);
  });

  it('calculates total correctly with multiple items', () => {
    const { result } = renderHook(() => useCart());
    
    const variant1 = { ...mockVariant, price: 5000 };
    const variant2 = { ...mockVariant, id: 'variant-456', price: 7500 };
    
    act(() => {
      result.current.addItem('product-123', variant1, 3); // 15000
      result.current.addItem('product-456', variant2, 2); // 15000
    });
    
    expect(result.current.getTotal()).toBe(30000); // 15000 + 15000
  });

  it('persists cart to localStorage', () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'xarastore-cart',
      expect.stringContaining('product-123')
    );
  });

  it('loads cart from localStorage on initialization', () => {
    const savedCart = {
      state: {
        items: [{
          id: 'saved-item-123',
          productId: 'saved-product-123',
          variant: mockVariant,
          quantity: 3,
          addedAt: '2023-01-01T00:00:00Z',
        }],
      },
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart));
    
    const { result } = renderHook(() => useCart());
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe('saved-product-123');
    expect(result.current.getItemCount()).toBe(3);
  });

  it('syncs cart with server when user is authenticated', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });
    
    const { result } = renderHook(() => useCart());
    
    // Add item to trigger sync
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    // Wait for sync to complete
    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
    
    expect(mockUpsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      items: [{
        product_id: 'product-123',
        variant_id: 'variant-123',
        quantity: 2,
      }],
      updated_at: expect.any(String),
    });
  });

  it('saves cart to localStorage when sync fails', async () => {
    const mockUpsert = vi.fn().mockRejectedValue(new Error('Sync failed'));
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });
    
    const { result } = renderHook(() => useCart());
    
    // Add item to trigger sync
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
    
    // Should save to localStorage as offline backup
    const offlineCart = JSON.parse(localStorageMock.setItem.mock.calls.find(
      call => call[0] === 'xarastore-offline-cart'
    )?.[1] || '{}');
    
    expect(offlineCart.items).toHaveLength(1);
    expect(offlineCart.timestamp).toBeGreaterThan(0);
  });

  it('handles duplicate items with same product and variant', () => {
    const { result } = renderHook(() => useCart());
    
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
      result.current.addItem('product-123', mockVariant, 3);
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(4);
  });

  it('generates unique IDs for cart items', () => {
    const { result } = renderHook(() => useCart());
    
    const timestamp = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(timestamp);
    
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
    });
    
    expect(result.current.items[0].id).toBe(`product-123-variant-123-${timestamp}`);
  });

  it('maintains cart state across multiple operations', () => {
    const { result } = renderHook(() => useCart());
    
    // Add first item
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    // Add second item
    const variant2 = { ...mockVariant, id: 'variant-456', price: 7999 };
    act(() => {
      result.current.addItem('product-456', variant2, 1);
    });
    
    // Update first item
    const firstItemId = result.current.items[0].id;
    act(() => {
      result.current.updateQuantity(firstItemId, 3);
    });
    
    // Remove second item
    const secondItemId = result.current.items[1].id;
    act(() => {
      result.current.removeItem(secondItemId);
    });
    
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.items[0].productId).toBe('product-123');
    expect(result.current.getTotal()).toBe(29997); // 9999 * 3
  });

  it('handles cart operations when window is undefined (SSR)', () => {
    // Temporarily remove window object to simulate SSR
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    
    const { result } = renderHook(() => useCart());
    
    // These operations should not throw errors
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
      result.current.removeItem('item-123');
      result.current.updateQuantity('item-123', 2);
      result.current.clearCart();
    });
    
    // Restore window object
    global.window = originalWindow;
    
    expect(result.current.items).toEqual([]);
  });

  it('calls syncWithServer for all modifying operations', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });
    
    const { result } = renderHook(() => useCart());
    
    // Add item
    act(() => {
      result.current.addItem('product-123', mockVariant, 2);
    });
    
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
    
    // Update quantity
    const itemId = result.current.items[0].id;
    act(() => {
      result.current.updateQuantity(itemId, 3);
    });
    
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });
    
    // Remove item
    act(() => {
      result.current.removeItem(itemId);
    });
    
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(3);
    });
    
    // Clear cart
    act(() => {
      result.current.clearCart();
    });
    
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(4);
    });
  });

  it('prevents multiple simultaneous sync operations', async () => {
    const mockUpsert = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });
    
    const { result } = renderHook(() => useCart());
    
    // Start multiple sync operations
    act(() => {
      result.current.addItem('product-123', mockVariant, 1);
      result.current.addItem('product-456', { ...mockVariant, id: 'variant-456' }, 1);
    });
    
    // Should only have one sync operation active
    expect(result.current.isSyncing).toBe(true);
    
    // Wait for sync to complete
    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    }, { timeout: 200 });
    
    // Second operation should have been queued
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });
});
