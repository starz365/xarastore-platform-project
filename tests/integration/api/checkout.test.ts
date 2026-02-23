import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

describe('Checkout API Integration Tests', () => {
  let testUserId: string;
  let testProductId: string;
  let testAddressId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const { data: authData, error } = await supabase.auth.signUp({
      email: `test-checkout-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (error && error.message !== 'User already registered') {
      throw error;
    }

    testUserId = authData?.user?.id || '';
    authToken = authData?.session?.access_token || '';

    // Create test product
    const { data: brand } = await supabase
      .from('brands')
      .insert({
        name: 'Checkout Test Brand',
        slug: 'checkout-test-brand',
      })
      .select()
      .single();

    const { data: category } = await supabase
      .from('categories')
      .insert({
        name: 'Checkout Test Category',
        slug: 'checkout-test-category',
      })
      .select()
      .single();

    const { data: product } = await supabase
      .from('products')
      .insert({
        name: 'Checkout Test Product',
        slug: 'checkout-test-product',
        description: 'Test product for checkout',
        price: 5000,
        sku: 'CHECKOUT-TEST-001',
        brand_id: brand?.id,
        category_id: category?.id,
        images: ['https://example.com/checkout-test.jpg'],
        stock: 50,
      })
      .select()
      .single();

    testProductId = product?.id || '';

    // Create test address
    const { data: address } = await supabase
      .from('user_addresses')
      .insert({
        user_id: testUserId,
        name: 'Test User',
        phone: '0712345678',
        street: '123 Test Street',
        city: 'Nairobi',
        state: 'Nairobi',
        postal_code: '00100',
        country: 'Kenya',
        is_default: true,
      })
      .select()
      .single();

    testAddressId = address?.id || '';
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('products').delete().eq('id', testProductId);
    await supabase.auth.signOut();
  });

  beforeEach(async () => {
    // Clear cart before each test
    await supabase.from('user_carts').delete().eq('user_id', testUserId);
  });

  describe('GET /api/checkout/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('items');
      expect(data.items).toHaveLength(0);
      expect(data).toHaveProperty('total');
      expect(data.total).toBe(0);
    });

    it('should return cart with items', async () => {
      // Add item to cart
      await supabase.from('user_carts').upsert({
        user_id: testUserId,
        items: [{
          product_id: testProductId,
          variant_id: 'default',
          quantity: 2,
        }],
      });

      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].product_id).toBe(testProductId);
      expect(data.items[0].quantity).toBe(2);
    });
  });

  describe('POST /api/checkout/cart', () => {
    it('should add item to cart', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          variantId: 'default',
          quantity: 1,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('cart');
      expect(data.cart.items).toHaveLength(1);
    });

    it('should update quantity for existing item', async () => {
      // First add item
      await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          variantId: 'default',
          quantity: 1,
        }),
      });

      // Update quantity
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          variantId: 'default',
          quantity: 3,
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cart.items[0].quantity).toBe(3);
    });

    it('should validate product exists', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: 'non-existent-id',
          variantId: 'default',
          quantity: 1,
        }),
      });

      expect(response.status).toBe(404);
    });

    it('should validate stock availability', async () => {
      // Create low stock product
      const { data: lowStockProduct } = await supabase
        .from('products')
        .insert({
          name: 'Low Stock Product',
          slug: 'low-stock-product',
          description: 'Low stock test',
          price: 1000,
          sku: 'LOW-STOCK-001',
          brand_id: (await supabase.from('brands').select('id').limit(1).single()).data?.id,
          category_id: (await supabase.from('categories').select('id').limit(1).single()).data?.id,
          stock: 2,
        })
        .select()
        .single();

      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: lowStockProduct?.id,
          variantId: 'default',
          quantity: 5,
        }),
      });

      expect(response.status).toBe(400);

      // Cleanup
      await supabase.from('products').delete().eq('id', lowStockProduct?.id);
    });
  });

  describe('DELETE /api/checkout/cart/[itemId]', () => {
    it('should remove item from cart', async () => {
      // Add item first
      const addResponse = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: testProductId,
          variantId: 'default',
          quantity: 1,
        }),
      });
      const addData = await addResponse.json();
      const itemId = addData.cart.items[0].id;

      // Remove item
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/checkout/cart/${itemId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.cart.items).toHaveLength(0);
    });
  });

  describe('POST /api/checkout/shipping', () => {
    it('should calculate shipping costs', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          addressId: testAddressId,
          items: [{
            productId: testProductId,
            variantId: 'default',
            quantity: 1,
          }],
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('methods');
      expect(Array.isArray(data.methods)).toBe(true);
      expect(data.methods.length).toBeGreaterThan(0);
      expect(data.methods[0]).toHaveProperty('id');
      expect(data.methods[0]).toHaveProperty('name');
      expect(data.methods[0]).toHaveProperty('price');
      expect(data.methods[0]).toHaveProperty('estimatedDays');
    });
  });

  describe('POST /api/checkout/initiate', () => {
    it('should initiate checkout', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          shippingAddressId: testAddressId,
          billingAddressId: testAddressId,
          shippingMethodId: 'standard',
          paymentMethod: 'mpesa',
          items: [{
            productId: testProductId,
            variantId: 'default',
            quantity: 1,
          }],
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('orderId');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('paymentRequired');
    });

    it('should validate stock before checkout', async () => {
      // Create product with 0 stock
      const { data: outOfStockProduct } = await supabase
        .from('products')
        .insert({
          name: 'Out of Stock Product',
          slug: 'out-of-stock-product',
          description: 'Out of stock test',
          price: 1000,
          sku: 'OUT-OF-STOCK-001',
          brand_id: (await supabase.from('brands').select('id').limit(1).single()).data?.id,
          category_id: (await supabase.from('categories').select('id').limit(1).single()).data?.id,
          stock: 0,
        })
        .select()
        .single();

      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          shippingAddressId: testAddressId,
          billingAddressId: testAddressId,
          shippingMethodId: 'standard',
          paymentMethod: 'mpesa',
          items: [{
            productId: outOfStockProduct?.id,
            variantId: 'default',
            quantity: 1,
          }],
        }),
      });

      expect(response.status).toBe(400);

      // Cleanup
      await supabase.from('products').delete().eq('id', outOfStockProduct?.id);
    });
  });

  describe('GET /api/checkout/orders', () => {
    it('should return user orders', async () => {
      const response = await fetch(`${process.env.TEST_BASE_URL}/api/checkout/orders`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should paginate orders', async () => {
      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/checkout/orders?page=1&limit=5`
      , {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('orders');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/checkout/orders/[id]', () => {
    it('should return specific order', async () => {
      // Create test order
      const { data: order } = await supabase
        .from('orders')
        .insert({
          user_id: testUserId,
          order_number: `TEST-${Date.now()}`,
          items: [{
            product_id: testProductId,
            variant_id: 'default',
            quantity: 1,
            price: 5000,
            name: 'Checkout Test Product',
          }],
          subtotal: 5000,
          shipping: 299,
          tax: 800,
          total: 6099,
          status: 'pending',
          shipping_address: {
            name: 'Test User',
            phone: '0712345678',
            street: '123 Test Street',
            city: 'Nairobi',
            state: 'Nairobi',
            postal_code: '00100',
            country: 'Kenya',
          },
          payment_method: 'mpesa',
          payment_status: 'pending',
        })
        .select()
        .single();

      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/checkout/orders/${order?.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(order?.id);
      expect(data.user_id).toBe(testUserId);
    });

    it('should not return other users orders', async () => {
      // Create another user's order
      const { data: otherUser } = await supabase.auth.signUp({
        email: `other-user-${Date.now()}@example.com`,
        password: 'OtherPassword123!',
      });

      const { data: otherOrder } = await supabase
        .from('orders')
        .insert({
          user_id: otherUser?.user?.id,
          order_number: `OTHER-${Date.now()}`,
          items: [],
          subtotal: 1000,
          shipping: 299,
          tax: 160,
          total: 1459,
          status: 'pending',
          shipping_address: {},
          payment_method: 'mpesa',
          payment_status: 'pending',
        })
        .select()
        .single();

      const response = await fetch(
        `${process.env.TEST_BASE_URL}/api/checkout/orders/${otherOrder?.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(404);

      // Cleanup
      await supabase.from('orders').delete().eq('id', otherOrder?.id);
      await supabase.auth.signOut();
    });
  });
});
