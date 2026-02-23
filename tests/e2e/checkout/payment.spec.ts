import { test, expect } from '@playwright/test';

test.describe('Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout?step=payment');
  });

  test('M-Pesa payment flow', async ({ page }) => {
    await page.click('div:has-text("M-Pesa")');
    
    // Test invalid phone number
    await page.fill('input[name="phoneNumber"]', '123');
    await page.click('button:has-text("Pay with M-Pesa")');
    await expect(page.locator('text=Invalid phone number')).toBeVisible();

    // Test valid phone number
    await page.fill('input[name="phoneNumber"]', '0712345678');
    
    // Mock successful payment
    await page.route('**/api/payment/mpesa', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'STK Push sent successfully',
          checkoutRequestID: 'test-123',
          merchantRequestID: 'test-456',
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
          checkoutRequestID: 'test-123',
          merchantRequestID: 'test-456',
        }),
      });
    });

    // Wait for confirmation
    await page.waitForURL('/checkout/confirmation');
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('card payment flow', async ({ page }) => {
    await page.click('div:has-text("Credit/Debit Card")');
    
    // Fill card details
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardHolder"]', 'Test User');
    await page.fill('input[name="expiry"]', '12/30');
    await page.fill('input[name="cvc"]', '123');
    await page.fill('input[name="zip"]', '00100');

    // Mock Stripe payment
    await page.route('**/api/payment/stripe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentIntentId: 'pi_test_123',
          clientSecret: 'secret_test_123',
        }),
      });
    });

    await page.click('button:has-text("Pay with Card")');
    
    // Mock 3D Secure if required
    await page.route('**/api/payment/stripe/confirm', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orderId: 'order_123',
        }),
      });
    });

    await page.waitForURL('/checkout/confirmation');
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('payment method validation', async ({ page }) => {
    // Test M-Pesa validation
    await page.click('div:has-text("M-Pesa")');
    await page.click('button:has-text("Pay with M-Pesa")');
    await expect(page.locator('text=Please enter a valid phone number')).toBeVisible();

    // Test card validation
    await page.click('div:has-text("Credit/Debit Card")');
    await page.click('button:has-text("Pay with Card")');
    await expect(page.locator('text=Card number is required')).toBeVisible();

    // Test expired card
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardHolder"]', 'Test User');
    await page.fill('input[name="expiry"]', '01/20'); // Past date
    await page.fill('input[name="cvc"]', '123');
    await page.click('button:has-text("Pay with Card")');
    await expect(page.locator('text=Card is expired')).toBeVisible();
  });

  test('payment failure handling', async ({ page }) => {
    await page.click('div:has-text("M-Pesa")');
    await page.fill('input[name="phoneNumber"]', '0712345678');

    // Mock payment failure
    await page.route('**/api/payment/mpesa', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Payment initiation failed',
          details: 'Insufficient funds',
        }),
      });
    });

    await page.click('button:has-text("Pay with M-Pesa")');
    await expect(page.locator('text=Payment failed')).toBeVisible();
    await expect(page.locator('text=Insufficient funds')).toBeVisible();
  });

  test('payment security features', async ({ page }) => {
    // Verify HTTPS
    expect(page.url()).toMatch(/^https:\/\//);

    // Verify security headers
    const response = await page.goto('/checkout');
    const headers = response?.headers();
    expect(headers?.['content-security-policy']).toBeDefined();
    expect(headers?.['x-frame-options']).toBe('DENY');

    // Verify no sensitive data in localStorage
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage);
    });
    expect(localStorage).not.toContain('cardNumber');
    expect(localStorage).not.toContain('cvc');
  });

  test('multiple payment attempts', async ({ page }) => {
    await page.click('div:has-text("M-Pesa")');
    await page.fill('input[name="phoneNumber"]', '0712345678');

    // First attempt fails
    await page.route('**/api/payment/mpesa', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Network error',
        }),
      });
    });

    await page.click('button:has-text("Pay with M-Pesa")');
    await expect(page.locator('text=Payment failed')).toBeVisible();

    // Second attempt succeeds
    await page.route('**/api/payment/mpesa', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'STK Push sent successfully',
        }),
      });
    });

    await page.click('button:has-text("Try Again")');
    await expect(page.locator('text=STK Push sent!')).toBeVisible();
  });
});
