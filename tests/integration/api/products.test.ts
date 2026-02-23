import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { Product } from '@/types';

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Products API Integration Tests', () => {
  let testProductId: string;
  let testCategoryId: string;
  let testBrandId: string;

  beforeAll(async () => {
    // Create test data
    const { data: brand } = await supabase
      .from('brands')
      .insert({
        name: 'Test Brand',
        slug: 'test-brand',
        description: 'Test brand description',
      })
      .select()
      .single();

    const { data: category } = await supabase
      .from('categories')
      .insert({
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category description',
      })
      .select()
      .single();

    testBrandId = brand?.id || '';
    testCategoryId = category?.id || '';

    const { data: product } = await supabase
      .from('products')
      .insert({
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test product description',
        price: 9999,
        sku: 'TEST-SKU-001',
        brand_id: testBrandId,
        category_id: testCategoryId,
        images: ['https://example.com/test.jpg'],
        stock: 100,
        is_featured: true,
        is_deal: false,
      })
      .select()
      .single();

    testProductId = product?.id || '';
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('products').delete().eq('id', testProductId);
    await supabase.from('categories').delete().eq('id', testCategoryId);
    await supabase.from('brands').delete().eq('id', testBrandId);
  });

  describe('GET /api/products', () => {
    it('should return products with pagination', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/products?page=1&limit=10`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('totalPages');
      expect(Array.isArray(data.products)).toBe(true);
    });

    it('should filter products by category', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products?category=test-category`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.every((p: Product) => p.category.slug === 'test-category')).toBe(true);
    });

    it('should filter products by brand', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products?brand=test-brand`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.every((p: Product) => p.brand.slug === 'test-brand')).toBe(true);
    });

    it('should sort products by price', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products?sortBy=price-low`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      if (data.products.length > 1) {
        for (let i = 1; i < data.products.length; i++) {
          expect(data.products[i].price >= data.products[i - 1].price).toBe(true);
        }
      }
    });

    it('should search products by query', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products?q=test`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.products.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/products/[slug]', () => {
    it('should return product by slug', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('price');
      expect(data.slug).toBe('test-product');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/non-existent-product`
      );

      expect(response.status).toBe(404);
    });

    it('should include related products', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product?include=related`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('relatedProducts');
      expect(Array.isArray(data.relatedProducts)).toBe(true);
    });
  });

  describe('GET /api/products/[slug]/reviews', () => {
    it('should return product reviews', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product/reviews`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should paginate reviews', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product/reviews?page=1&limit=5`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('reviews');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('averageRating');
    });
  });

  describe('POST /api/products/[slug]/reviews', () => {
    it('should require authentication', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: 5,
            comment: 'Great product!',
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it('should validate review data', async () => {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      const token = authData.session?.access_token;

      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/products/test-product/reviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: 6, // Invalid rating
            comment: '',
          }),
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/deals', () => {
    it('should return active deals', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/deals`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((p: Product) => p.isDeal)).toBe(true);
    });

    it('should filter deals by category', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/deals?category=test-category`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.every((p: Product) => p.isDeal && p.category.slug === 'test-category')).toBe(true);
    });
  });

  describe('GET /api/featured', () => {
    it('should return featured products', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/featured`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.every((p: Product) => p.isFeatured)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/featured?limit=3`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBeLessThanOrEqual(3);
    });
  });
});
