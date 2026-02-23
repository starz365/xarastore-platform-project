import { test, expect } from '@playwright/test';
import { supabase } from '@/lib/supabase/client';

test.describe('Order Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@xarastore.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/account/orders');
  });

  test('view order history', async ({ page }) => {
    await expect(page.locator('text=Order History')).toBeVisible();
    
    // Mock orders API
    await page.route('**/api/account/orders**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: 'order_123',
              orderNumber: 'XARA-2023-001',
              createdAt: new Date().toISOString(),
              total: 2999,
              status: 'delivered',
              items: [
                {
                  name: 'Test Product',
                  price: 2999,
                  quantity: 1,
                  image: 'https://example.com/product.jpg',
                },
              ],
            },
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 10,
          },
        }),
      });
    });

    await page.reload();
    
    // Verify order display
    await expect(page.locator('text=XARA-2023-001')).toBeVisible();
    await expect(page.locator('text=KES 2,999')).toBeVisible();
    await expect(page.locator('text=Delivered')).toBeVisible();
  });

  test('view order details', async ({ page }) => {
    // Mock single order
    await page.route('**/api/account/orders/order_123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'order_123',
          orderNumber: 'XARA-2023-001',
          createdAt: new Date().toISOString(),
          status: 'delivered',
          subtotal: 2999,
          shipping: 0,
          tax: 480,
          total: 3479,
          shippingAddress: {
            name: 'Test User',
            street: '123 Test Street',
            city: 'Nairobi',
            state: 'Nairobi County',
            postalCode: '00100',
            country: 'Kenya',
          },
          paymentMethod: 'mpesa',
          paymentStatus: 'paid',
          items: [
            {
              name: 'Test Product',
              price: 2999,
              quantity: 1,
              image: 'https://example.com/product.jpg',
              variant: 'Black, Large',
            },
          ],
          tracking: {
            carrier: 'Xarastore Logistics',
            trackingNumber: 'TRK123456789',
            status: 'delivered',
            estimatedDelivery: new Date().toISOString(),
            history: [
              {
                status: 'shipped',
                date: new Date(Date.now() - 86400000).toISOString(),
                location: 'Nairobi Warehouse',
              },
            ],
          },
        }),
      });
    });

    await page.click('a:has-text("XARA-2023-001")');
    await page.waitForURL('/account/orders/order_123');
    
    // Verify order details
    await expect(page.locator('text=Order Details')).toBeVisible();
    await expect(page.locator('text=KES 3,479')).toBeVisible();
    await expect(page.locator('text=Test Product')).toBeVisible();
    await expect(page.locator('text=Tracking Number: TRK123456789')).toBeVisible();
  });

  test('track order status', async ({ page }) => {
    await page.goto('/account/orders/order_123');
    
    // Verify tracking information
    await expect(page.locator('text=Order Tracking')).toBeVisible();
    await expect(page.locator('text=Delivered')).toBeVisible();
    
    // Check tracking history
    await expect(page.locator('text=Nairobi Warehouse')).toBeVisible();
    await expect(page.locator('text=Shipped')).toBeVisible();
  });

  test('cancel order', async ({ page }) => {
    await page.route('**/api/account/orders/order_123/cancel', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Order cancelled successfully',
        }),
      });
    });

    await page.click('button:has-text("Cancel Order")');
    
    // Confirm cancellation
    await page.click('button:has-text("Confirm Cancellation")');
    await expect(page.locator('text=Order cancelled successfully')).toBeVisible();
    await expect(page.locator('text=Cancelled')).toBeVisible();
  });

  test('return order', async ({ page }) => {
    await page.route('**/api/account/orders/order_123/return', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          returnId: 'RET123',
          message: 'Return request submitted',
        }),
      });
    });

    await page.click('button:has-text("Return Item")');
    
    // Fill return form
    await page.selectOption('select[name="reason"]', 'defective');
    await page.fill('textarea[name="comments"]', 'Product arrived damaged');
    
    await page.click('button:has-text("Submit Return Request")');
    await expect(page.locator('text=Return request submitted')).toBeVisible();
    await expect(page.locator('text=Return ID: RET123')).toBeVisible();
  });

  test('download invoice', async ({ page }) => {
    await page.route('**/api/account/orders/order_123/invoice', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('PDF_CONTENT'),
        headers: {
          'Content-Disposition': 'attachment; filename="invoice_XARA-2023-001.pdf"',
        },
      });
    });

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download Invoice")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe('invoice_XARA-2023-001.pdf');
  });

  test('reorder items', async ({ page }) => {
    await page.route('**/api/account/orders/order_123/reorder', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          cartItems: 1,
        }),
      });
    });

    await page.click('button:has-text("Reorder")');
    await expect(page.locator('text=Items added to cart')).toBeVisible();
    
    // Verify cart updated
    await page.goto('/cart');
    await expect(page.locator('text=1 item in your cart')).toBeVisible();
  });

  test('order filtering and search', async ({ page }) => {
    // Filter by status
    await page.selectOption('select[name="status"]', 'delivered');
    await expect(page.locator('text=Delivered')).toBeVisible();
    
    // Search by order number
    await page.fill('input[name="search"]', 'XARA-2023');
    await page.click('button:has-text("Search")');
    await expect(page.locator('text=XARA-2023-001')).toBeVisible();
    
    // Clear filters
    await page.click('button:has-text("Clear Filters")');
    await expect(page.locator('input[name="search"]')).toHaveValue('');
  });

  test('order pagination', async ({ page }) => {
    // Mock paginated orders
    await page.route('**/api/account/orders?page=2', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [
            {
              id: 'order_456',
              orderNumber: 'XARA-2023-002',
              createdAt: new Date().toISOString(),
              total: 1999,
              status: 'processing',
            },
          ],
          pagination: {
            total: 15,
            page: 2,
            limit: 10,
            totalPages: 2,
          },
        }),
      });
    });

    await page.click('button:has-text("Next")');
    await expect(page.locator('text=XARA-2023-002')).toBeVisible();
    await expect(page.locator('text=Page 2 of 2')).toBeVisible();
  });

  test('empty orders state', async ({ page }) => {
    // Mock empty orders
    await page.route('**/api/account/orders**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orders: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 10,
          },
        }),
      });
    });

    await page.reload();
    await expect(page.locator('text=No orders found')).toBeVisible();
    await expect(page.locator('text=Start shopping to see your orders here')).toBeVisible();
    await expect(page.locator('a:has-text("Browse Products")')).toBeVisible();
  });
});
