import { test, expect } from '@playwright/test';
import { supabase } from '@/lib/supabase/client';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart and login
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('xarastore-cart');
    });
    
    // Login with test user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@xarastore.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('complete checkout with M-Pesa payment', async ({ page }) => {
    // Add product to cart
    await page.goto('/product/test-product');
    await page.click('button:has-text("Add to Cart")');
    await expect(page.locator('text=Added to cart!')).toBeVisible();

    // Go to cart
    await page.goto('/cart');
    await expect(page.locator('text=Shopping Cart')).toBeVisible();
    await expect(page.locator('text=1 item in your cart')).toBeVisible();

    // Proceed to checkout
    await page.click('button:has-text("Proceed to Checkout")');
    await page.waitForURL('/checkout');

    // Fill address
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '0712345678');
    await page.fill('input[name="street"]', '123 Test Street');
    await page.fill('input[name="city"]', 'Nairobi');
    await page.fill('input[name="state"]', 'Nairobi County');
    await page.fill('input[name="postalCode"]', '00100');
    await page.selectOption('select[name="country"]', 'KE');
    await page.click('button:has-text("Continue to Delivery")');

    // Select delivery method
    await page.waitForURL('/checkout?step=delivery');
    await page.click('div:has-text("Standard Delivery")');
    await page.click('button:has-text("Continue to Payment")');

    // Select M-Pesa payment
    await page.waitForURL('/checkout?step=payment');
    await page.click('div:has-text("M-Pesa")');
    await page.fill('input[name="phoneNumber"]', '0712345678');

    // Mock M-Pesa payment
    await page.route('**/api/payment/mpesa', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'STK Push sent successfully',
          checkoutRequestID: 'test-checkout-id',
          merchantRequestID: 'test-merchant-id',
        }),
      });
    });

    await page.click('button:has-text("Pay with M-Pesa")');
    await expect(page.locator('text=Waiting for confirmation')).toBeVisible();

    // Mock payment confirmation
    await page.route('**/api/payment/mpesa/status*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          resultCode: '0',
          resultDesc: 'Success',
        }),
      });
    });

    // Verify order confirmation
    await page.waitForURL('/checkout/confirmation');
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
    await expect(page.locator('text=Thank you for your order')).toBeVisible();

    // Verify order in database
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', 'test-user-id')
      .order('created_at', { ascending: false })
      .limit(1);

    expect(orders).toHaveLength(1);
    expect(orders?.[0].payment_status).toBe('paid');
  });

  test('guest checkout flow', async ({ page }) => {
    // Add product to cart
    await page.goto('/product/test-product');
    await page.click('button:has-text("Add to Cart")');

    // Go to cart as guest
    await page.goto('/cart');
    await page.click('button:has-text("Checkout as Guest")');

    // Fill guest information
    await page.fill('input[name="email"]', 'guest@example.com');
    await page.fill('input[name="name"]', 'Guest User');
    await page.fill('input[name="phone"]', '0712345678');
    await page.click('button:has-text("Continue")');

    // Complete checkout
    await page.waitForURL('/checkout?step=address');
    // ... continue with address, delivery, payment
  });

  test('cart persistence across sessions', async ({ page, context }) => {
    // Add product to cart
    await page.goto('/product/test-product');
    await page.click('button:has-text("Add to Cart")');

    // Verify cart count
    const cartCount = await page.locator('[aria-label="Cart"] span').textContent();
    expect(cartCount).toBe('1');

    // Reload page
    await page.reload();
    await expect(page.locator('[aria-label="Cart"] span')).toHaveText('1');

    // Clear storage and verify
    await page.evaluate(() => {
      localStorage.removeItem('xarastore-cart');
    });
    await page.reload();
    await expect(page.locator('[aria-label="Cart"] span')).toHaveText('0');
  });

  test('apply and remove coupon', async ({ page }) => {
    await page.goto('/cart');

    // Apply valid coupon
    await page.fill('input[name="coupon"]', 'SAVE10');
    await page.click('button:has-text("Apply")');
    await expect(page.locator('text=Coupon applied successfully')).toBeVisible();
    await expect(page.locator('text=Discount')).toBeVisible();

    // Remove coupon
    await page.click('button:has-text("Remove")');
    await expect(page.locator('text=Discount')).not.toBeVisible();
  });

  test('update cart quantities', async ({ page }) => {
    await page.goto('/cart');

    // Increase quantity
    await page.click('button[aria-label="Increase quantity"]');
    await expect(page.locator('input[type="number"]')).toHaveValue('2');

    // Decrease quantity
    await page.click('button[aria-label="Decrease quantity"]');
    await expect(page.locator('input[type="number"]')).toHaveValue('1');

    // Remove item
    await page.click('button[aria-label="Remove item"]');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });

  test('offline cart functionality', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    await page.goto('/cart');
    await expect(page.locator('text=You\'re offline')).toBeVisible();

    // Add item while offline
    await page.goto('/product/test-product');
    await page.click('button:has-text("Add to Cart")');
    await expect(page.locator('text=Added to cart!')).toBeVisible();

    // Verify cart persisted offline
    await page.goto('/cart');
    await expect(page.locator('text=1 item in your cart')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('text=Cart changes will sync')).not.toBeVisible();
  });
});
