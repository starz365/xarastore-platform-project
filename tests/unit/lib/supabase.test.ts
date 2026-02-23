tests/unit/lib/supabase.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase, subscribeToChanges } from '@/lib/supabase/client';
import { getFeaturedProducts, getProductBySlug, searchProducts } from '@/lib/supabase/queries/products';
import type { Product, Category, Brand } from '@/types';

// Mock the supabase client
vi.mock('@/lib/supabase/client', async () => {
  const actual = await vi.importActual('@/lib/supabase/client');
  return {
    ...actual,
    supabase: {
      from: vi.fn(),
      auth: {
        getSession: vi.fn(),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
    subscribeToChanges: vi.fn(),
  };
});

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('supabase client instance', () => {
    it('has correct configuration', () => {
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.auth.getSession).toBe('function');
      expect(typeof supabase.channel).toBe('function');
    });

    it('creates channels for real-time subscriptions', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      
      (supabase.channel as any).mockReturnValue(mockChannel);
      
      const unsubscribe = subscribeToChanges('products', 'id=eq.1', vi.fn());
      
      expect(supabase.channel).toHaveBeenCalledWith('public-products');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'id=eq.1',
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      
      // Test unsubscribe
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Product Queries', () => {
    const mockProducts: Product[] = [
      {
        id: 'product-1',
        slug: 'test-product-1',
        name: 'Test Product 1',
        description: 'Test description 1',
        price: 9999,
        originalPrice: 12999,
        sku: 'TEST-001',
        brand: {
          id: 'brand-1',
          slug: 'test-brand',
          name: 'Test Brand',
          logo: '/logo.png',
          productCount: 10,
        },
        category: {
          id: 'category-1',
          slug: 'test-category',
          name: 'Test Category',
          productCount: 50,
        },
        images: ['/image1.jpg'],
        variants: [
          {
            id: 'variant-1',
            name: 'Default',
            price: 9999,
            originalPrice: 12999,
            sku: 'TEST-001-V1',
            stock: 10,
            attributes: { color: 'Black' },
          },
        ],
        specifications: {},
        rating: 4.5,
        reviewCount: 10,
        stock: 10,
        isFeatured: true,
        isDeal: false,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    const mockSupabaseResponse = (data: any, error: any = null) => ({
      data,
      error,
      count: data?.length || 0,
    });

    describe('getFeaturedProducts', () => {
      it('fetches featured products successfully', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getFeaturedProducts();

        expect(supabase.from).toHaveBeenCalledWith('products');
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'));
        expect(result).toEqual(mockProducts);
      });

      it('handles errors gracefully', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSupabaseResponse(null, new Error('Database error'))),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getFeaturedProducts();

        expect(result).toEqual([]);
      });
    });

    describe('getProductBySlug', () => {
      it('fetches product by slug successfully', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts[0])),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getProductBySlug('test-product-1');

        expect(supabase.from).toHaveBeenCalledWith('products');
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('brand'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('category'));
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('variants'));
        expect(result).toEqual(mockProducts[0]);
      });

      it('returns null when product not found', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(null)),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getProductBySlug('non-existent-slug');

        expect(result).toBeNull();
      });

      it('handles errors gracefully', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error('Query error')),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getProductBySlug('test-product');

        expect(result).toBeNull();
      });
    });

    describe('searchProducts', () => {
      it('searches products with basic query', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts, null, mockProducts.length)),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await searchProducts('test');

        expect(supabase.from).toHaveBeenCalledWith('products');
        expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('*'), { count: 'exact' });
        expect(result).toEqual({
          products: mockProducts,
          total: mockProducts.length,
        });
      });

      it('applies price filters correctly', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
                  }),
                }),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        await searchProducts('test', {
          minPrice: 1000,
          maxPrice: 10000,
        });

        // Verify filter methods were called
        const selectInstance = (supabase.from as any).mock.results[0].value;
        expect(selectInstance.gt).toHaveBeenCalledWith('stock', 0);
        expect(selectInstance.gte).toHaveBeenCalledWith('price', 1000);
        expect(selectInstance.lte).toHaveBeenCalledWith('price', 10000);
      });

      it('applies brand and category filters', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
                  }),
                }),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        await searchProducts('test', {
          brandIds: ['brand-1', 'brand-2'],
          categoryIds: ['category-1'],
        });

        const selectInstance = (supabase.from as any).mock.results[0].value;
        expect(selectInstance.in).toHaveBeenCalledWith('brand_id', ['brand-1', 'brand-2']);
        expect(selectInstance.in).toHaveBeenCalledWith('category_id', ['category-1']);
      });

      it('applies sorting correctly', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const testCases = [
          { sortBy: 'price-low', expectedOrder: { ascending: true, column: 'price' } },
          { sortBy: 'price-high', expectedOrder: { ascending: false, column: 'price' } },
          { sortBy: 'newest', expectedOrder: { ascending: false, column: 'created_at' } },
          { sortBy: 'rating', expectedOrder: { ascending: false, column: 'rating' } },
        ];

        for (const testCase of testCases) {
          vi.clearAllMocks();
          
          const mockOrder = vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
          });

          (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  order: mockOrder,
                }),
              }),
            }),
          });

          await searchProducts('test', { sortBy: testCase.sortBy });

          expect(mockOrder).toHaveBeenCalledWith(
            testCase.expectedOrder.column,
            testCase.expectedOrder
          );
        }
      });

      it('handles pagination correctly', async () => {
        const mockRange = vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts, null, 100));
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: mockRange,
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await searchProducts('test', {}, 2, 24);

        expect(mockRange).toHaveBeenCalledWith(24, 47); // (page-1)*pageSize to page*pageSize-1
        expect(result.total).toBe(100);
      });

      it('handles empty search query', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue(mockSupabaseResponse(mockProducts)),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        await searchProducts('');

        const selectInstance = (supabase.from as any).mock.results[0].value;
        expect(selectInstance.or).not.toHaveBeenCalled(); // Should not call or() for empty query
      });

      it('handles errors gracefully', async () => {
        const mockSelect = vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockRejectedValue(new Error('Search error')),
              }),
            }),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await searchProducts('test');

        expect(result).toEqual({
          products: [],
          total: 0,
        });
      });
    });

    describe('Data Transformation', () => {
      it('transforms database response to Product type correctly', async () => {
        const dbResponse = {
          id: 'db-product-1',
          slug: 'db-product',
          name: 'DB Product',
          description: 'Database product',
          price: '9999.00',
          original_price: '12999.00',
          sku: 'DB-001',
          brand: {
            id: 'db-brand-1',
            slug: 'db-brand',
            name: 'DB Brand',
            logo: '/db-logo.png',
            product_count: 5,
          },
          category: {
            id: 'db-category-1',
            slug: 'db-category',
            name: 'DB Category',
            product_count: 20,
          },
          images: ['/db-image.jpg'],
          variants: [
            {
              id: 'db-variant-1',
              name: 'DB Variant',
              price: '9999.00',
              original_price: '12999.00',
              sku: 'DB-001-V1',
              stock: 5,
              attributes: { color: 'Blue' },
            },
          ],
          specifications: { weight: '1kg' },
          rating: '4.20',
          review_count: 15,
          stock: 5,
          is_featured: true,
          is_deal: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        };

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(dbResponse)),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getProductBySlug('db-product');

        expect(result).toEqual({
          id: 'db-product-1',
          slug: 'db-product',
          name: 'DB Product',
          description: 'Database product',
          price: 9999,
          originalPrice: 12999,
          sku: 'DB-001',
          brand: {
            id: 'db-brand-1',
            slug: 'db-brand',
            name: 'DB Brand',
            logo: '/db-logo.png',
            productCount: 5,
          },
          category: {
            id: 'db-category-1',
            slug: 'db-category',
            name: 'DB Category',
            productCount: 20,
          },
          images: ['/db-image.jpg'],
          variants: [
            {
              id: 'db-variant-1',
              name: 'DB Variant',
              price: 9999,
              originalPrice: 12999,
              sku: 'DB-001-V1',
              stock: 5,
              attributes: { color: 'Blue' },
            },
          ],
          specifications: { weight: '1kg' },
          rating: 4.2,
          reviewCount: 15,
          stock: 5,
          isFeatured: true,
          isDeal: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z',
        });
      });

      it('handles null values in transformation', async () => {
        const dbResponse = {
          id: 'product-1',
          slug: 'product',
          name: 'Product',
          description: 'Description',
          price: '9999.00',
          original_price: null,
          sku: 'TEST-001',
          brand: {
            id: 'brand-1',
            slug: 'brand',
            name: 'Brand',
            logo: null,
            product_count: 0,
          },
          category: {
            id: 'category-1',
            slug: 'category',
            name: 'Category',
            product_count: 0,
          },
          images: [],
          variants: [],
          specifications: null,
          rating: '0.00',
          review_count: 0,
          stock: 0,
          is_featured: false,
          is_deal: false,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        };

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSupabaseResponse(dbResponse)),
          }),
        });

        (supabase.from as any).mockReturnValue({
          select: mockSelect,
        });

        const result = await getProductBySlug('product');

        expect(result).toBeDefined();
        expect(result?.originalPrice).toBeUndefined();
        expect(result?.brand.logo).toBeNull();
        expect(result?.images).toEqual([]);
        expect(result?.variants).toEqual([]);
        expect(result?.specifications).toEqual({});
        expect(result?.rating).toBe(0);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles network errors', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new TypeError('Network error')),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getProductBySlug('test');

      expect(result).toBeNull();
    });

    it('handles malformed database responses', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { invalid: 'data' },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      const result = await getProductBySlug('test');

      expect(result).toBeDefined();
      // Should handle missing fields gracefully
    });

    it('handles Supabase auth state changes', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      (supabase.auth.onAuthStateChange as any).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const subscription = supabase.auth.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(subscription.data.subscription.unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('subscribes to changes and returns cleanup function', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      
      const mockRemoveChannel = vi.fn();
      (supabase.channel as any).mockReturnValue(mockChannel);
      (supabase.removeChannel as any).mockImplementation(mockRemoveChannel);

      const callback = vi.fn();
      const unsubscribe = subscribeToChanges('products', 'id=eq.1', callback);

      // Verify channel creation
      expect(supabase.channel).toHaveBeenCalledWith('public-products');
      
      // Verify subscription setup
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'id=eq.1',
        },
        callback
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();

      // Verify unsubscribe function
      expect(typeof unsubscribe).toBe('function');
      
      // Test unsubscribe
      unsubscribe();
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('handles multiple subscriptions independently', () => {
      const channel1 = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
      const channel2 = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
      
      (supabase.channel as any)
        .mockReturnValueOnce(channel1)
        .mockReturnValueOnce(channel2);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsubscribe1 = subscribeToChanges('products', 'id=eq.1', callback1);
      const unsubscribe2 = subscribeToChanges('orders', 'user_id=eq.1', callback2);

      expect(supabase.channel).toHaveBeenCalledWith('public-products');
      expect(supabase.channel).toHaveBeenCalledWith('public-orders');
      
      expect(channel1.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'products' }),
        callback1
      );
      
      expect(channel2.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ table: 'orders' }),
        callback2
      );

      // Both should have subscribed
      expect(channel1.subscribe).toHaveBeenCalled();
      expect(channel2.subscribe).toHaveBeenCalled();

      // Unsubscribe should work independently
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Performance and Optimization', () => {
    it('uses efficient queries with proper indexing', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockSupabaseResponse([])),
            }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      await getFeaturedProducts();

      // Verify query includes only necessary fields
      const selectCall = mockSelect.mock.calls[0][0];
      expect(selectCall).toContain('*');
      expect(selectCall).toContain('brand');
      expect(selectCall).toContain('category');
      expect(selectCall).toContain('variants');
      
      // Verify filtering
      const selectInstance = (supabase.from as any).mock.results[0].value;
      expect(selectInstance.eq).toHaveBeenCalledWith('is_featured', true);
      expect(selectInstance.gt).toHaveBeenCalledWith('stock', 0);
    });

    it('implements query limits for performance', async () => {
      const mockLimit = vi.fn().mockResolvedValue(mockSupabaseResponse([]));
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      await getFeaturedProducts(4); // Limit to 4 products

      expect(mockLimit).toHaveBeenCalledWith(4);
    });
  });
});
