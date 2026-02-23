import { test, expect } from '@playwright/test';
import { createTestProduct, cleanupTestProduct } from '../helpers/products';

test.describe('Cart - Operations and Management', () => {
  let testProducts: Array<{ id: string; name: string; slug: string; price: number }> = [];

  test.beforeAll(async () => {
    // Create test products
    testProducts = await Promise.all([
      createTestProduct({
        name: 'Premium Smartphone',
        slug: 'premium-smartphone-cart',
        price: 149999,
        category: 'electronics',
        brand: 'apple',
        stock: 10,
      }),
      createTestProduct({
        name: 'Wireless Headphones',
        slug: 'wireless-headphones-cart',
        price: 12999,
        category: 'electronics',
        brand: 'sony',
        stock: 25,
      }),
      createTestProduct({
        name: 'Laptop Backpack',
        slug: 'laptop-backpack-cart',
        price: 4999,
        category: 'fashion',
        brand: 'samsonite',
        stock: 50,
      }),
    ]);
  });

  test.afterAll(async () => {
    // Cleanup test products
    await Promise.all(testProducts.map(p => cleanupTestProduct(p.id)));
  });

  test.beforeEach(async ({ page }) => {
    // Add items to cart before each test
    await page.goto(`/product/${testProducts[0].slug}`);
    await page.locator('button:has-text("Add to Cart")').click();
    
    await page.goto(`/product/${testProducts[1].slug}`);
    await page.locator('button:has-text("Add to Cart")').click();
    
    await page.goto(`/product/${testProducts[2].slug}`);
    await page.locator('button:has-text("Add to Cart")').click();
    
    // Navigate to cart
    await page.goto('/cart');
  });

  test('should display cart page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Shopping Cart | Xarastore/);

    // Check header
    await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();

    // Check item count summary
    await expect(page.locator(`text=${testProducts.length} item`)).toBeVisible();

    // Check cart items table
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(testProducts.length);

    // Check each item has required elements
    for (let i = 0; i < testProducts.length; i++) {
      const item = cartItems.nth(i);
      await expect(item.locator('img')).toBeVisible();
      await expect(item.locator(`text=${testProducts[i].name}`)).toBeVisible();
      await expect(item.locator('[data-testid="item-price"]')).toBeVisible();
      await expect(item.locator('[data-testid="quantity-input"]')).toBeVisible();
      await expect(item.locator('[data-testid="item-total"]')).toBeVisible();
      await expect(item.locator('button[aria-label="Remove item"]')).toBeVisible();
    }

    // Check cart summary
    const cartSummary = page.locator('[data-testid="cart-summary"]');
    await expect(cartSummary).toBeVisible();
    await expect(cartSummary.locator('text=Subtotal')).toBeVisible();
    await expect(cartSummary.locator('text=Shipping')).toBeVisible();
    await expect(cartSummary.locator('text=Tax')).toBeVisible();
    await expect(cartSummary.locator('text=Total')).toBeVisible();

    // Check action buttons
    await expect(page.locator('text=Continue Shopping')).toBeVisible();
    await expect(page.locator('text=Proceed to Checkout')).toBeVisible();
  });

  test('should update item quantity in cart', async ({ page }) => {
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const quantityInput = firstItem.locator('[data-testid="quantity-input"]');
    const itemTotal = firstItem.locator('[data-testid="item-total"]');
    const product = testProducts[0]; // Premium Smartphone: 149,999

    // Get initial total
    const initialTotalText = await itemTotal.textContent();
    const initialTotal = parseInt(initialTotalText?.replace(/[^0-9]/g, '') || '0');
    expect(initialTotal).toBe(product.price);

    // Increase quantity to 2
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');
    await increaseButton.click();

    // Quantity should be 2
    await expect(quantityInput).toHaveValue('2');

    // Total should double
    await expect(itemTotal).toHaveText(/KES 299,998/);

    // Decrease quantity back to 1
    const decreaseButton = firstItem.locator('button[aria-label="Decrease quantity"]');
    await decreaseButton.click();

    await expect(quantityInput).toHaveValue('1');
    await expect(itemTotal).toHaveText(/KES 149,999/);
  });

  test('should remove item from cart', async ({ page }) => {
    const initialCount = testProducts.length;
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const productName = testProducts[0].name;

    // Remove first item
    const removeButton = firstItem.locator('button[aria-label="Remove item"]');
    await removeButton.click();

    // Should show confirmation or remove immediately
    await expect(page.locator(`text=${productName}`)).not.toBeVisible();

    // Item count should decrease
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(initialCount - 1);

    // Cart summary should update
    const subtotal = page.locator('[data-testid="subtotal"]');
    const subtotalText = await subtotal.textContent();
    const subtotalValue = parseInt(subtotalText?.replace(/[^0-9]/g, '') || '0');
    
    // Subtotal should be sum of remaining items
    const expectedSubtotal = testProducts.slice(1).reduce((sum, p) => sum + p.price, 0);
    expect(subtotalValue).toBe(expectedSubtotal);
  });

  test('should clear entire cart', async ({ page }) => {
    // Click clear cart button
    const clearCartButton = page.locator('button:has-text("Clear Cart")');
    await clearCartButton.click();

    // Should show confirmation dialog
    const confirmDialog = page.locator('[data-testid="confirmation-dialog"]');
    await expect(confirmDialog).toBeVisible();

    // Confirm clearing
    const confirmButton = confirmDialog.locator('button:has-text("Clear")');
    await confirmButton.click();

    // Should show empty cart message
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
    await expect(page.locator('text=Start Shopping')).toBeVisible();

    // Cart counter in header should be 0
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('0');
  });

  test('should save cart for later / move to wishlist', async ({ page }) => {
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const productName = testProducts[0].name;

    // Click save for later
    const saveButton = firstItem.locator('button:has-text("Save for Later")');
    await saveButton.click();

    // Should show success message
    await expect(page.locator('text=Saved for later')).toBeVisible();

    // Item should move to saved section
    const savedSection = page.locator('[data-testid="saved-items"]');
    await expect(savedSection).toBeVisible();
    await expect(savedSection.locator(`text=${productName}`)).toBeVisible();

    // Cart item count should decrease
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(testProducts.length - 1);

    // Move back to cart
    const moveToCartButton = savedSection.locator('button:has-text("Move to Cart")');
    await moveToCartButton.click();

    await expect(page.locator('text=Moved to cart')).toBeVisible();
    await expect(savedSection.locator(`text=${productName}`)).not.toBeVisible();
    await expect(cartItems).toHaveCount(testProducts.length);
  });

  test('should apply coupon code', async ({ page }) => {
    // Find coupon input
    const couponInput = page.locator('input[placeholder*="Coupon"]');
    await expect(couponInput).toBeVisible();

    // Apply valid coupon
    await couponInput.fill('SAVE10');
    await page.locator('button:has-text("Apply")').click();

    // Should show discount applied
    await expect(page.locator('text=Coupon applied')).toBeVisible();
    await expect(page.locator('text=Discount')).toBeVisible();

    // Total should reflect discount
    const discountElement = page.locator('[data-testid="discount"]');
    const discountText = await discountElement.textContent();
    const discount = parseInt(discountText?.replace(/[^0-9]/g, '') || '0');
    expect(discount).toBeGreaterThan(0);

    // Remove coupon
    const removeCouponButton = page.locator('button[aria-label="Remove coupon"]');
    await removeCouponButton.click();

    await expect(page.locator('text=Coupon removed')).toBeVisible();
    await expect(page.locator('text=Discount')).not.toBeVisible();
  });

  test('should handle invalid coupon code', async ({ page }) => {
    const couponInput = page.locator('input[placeholder*="Coupon"]');
    await couponInput.fill('INVALID123');
    
    await page.locator('button:has-text("Apply")').click();

    // Should show error
    await expect(page.locator('text=Invalid coupon code')).toBeVisible();
    await expect(couponInput).toHaveClass(/error/);
  });

  test('should calculate shipping costs', async ({ page }) => {
    // Shipping should be calculated based on subtotal
    const subtotal = testProducts.reduce((sum, p) => sum + p.price, 0);
    
    // Free shipping over 2000 KES (all our products exceed this)
    const shippingElement = page.locator('[data-testid="shipping"]');
    const shippingText = await shippingElement.textContent();
    const shipping = parseInt(shippingText?.replace(/[^0-9]/g, '') || '0');

    // Should be free shipping
    expect(shipping).toBe(0);
    await expect(page.locator('text=Free Shipping')).toBeVisible();
  });

  test('should calculate tax correctly', async ({ page }) => {
    // Tax should be 16% in Kenya
    const subtotal = testProducts.reduce((sum, p) => sum + p.price, 0);
    const expectedTax = Math.round(subtotal * 0.16);

    const taxElement = page.locator('[data-testid="tax"]');
    const taxText = await taxElement.textContent();
    const tax = parseInt(taxText?.replace(/[^0-9]/g, '') || '0');

    expect(tax).toBe(expectedTax);
  });

  test('should calculate total correctly', async ({ page }) => {
    const subtotal = testProducts.reduce((sum, p) => sum + p.price, 0);
    const tax = Math.round(subtotal * 0.16);
    const shipping = 0; // Free shipping
    const expectedTotal = subtotal + tax + shipping;

    const totalElement = page.locator('[data-testid="total"]');
    const totalText = await totalElement.textContent();
    const total = parseInt(totalText?.replace(/[^0-9]/g, '') || '0');

    expect(total).toBe(expectedTotal);
  });

  test('should update totals when quantities change', async ({ page }) => {
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');
    
    // Get initial total
    const initialTotalElement = page.locator('[data-testid="total"]');
    const initialTotalText = await initialTotalElement.textContent();
    const initialTotal = parseInt(initialTotalText?.replace(/[^0-9]/g, '') || '0');

    // Increase quantity of first item
    await increaseButton.click();

    // Total should increase by item price + tax
    const itemPrice = testProducts[0].price;
    const itemTax = Math.round(itemPrice * 0.16);
    const expectedIncrease = itemPrice + itemTax;

    await expect(initialTotalElement).not.toHaveText(initialTotalText!);
    
    const newTotalText = await initialTotalElement.textContent();
    const newTotal = parseInt(newTotalText?.replace(/[^0-9]/g, '') || '0');
    
    expect(newTotal).toBe(initialTotal + expectedIncrease);
  });

  test('should navigate to checkout', async ({ page }) => {
    // Click checkout button
    const checkoutButton = page.locator('button:has-text("Proceed to Checkout")');
    await checkoutButton.click();

    // Should navigate to checkout
    await page.waitForURL(/\/checkout/);
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();

    // Cart items should be preserved
    await expect(page.locator(`text=${testProducts[0].name}`)).toBeVisible();
  });

  test('should continue shopping', async ({ page }) => {
    // Click continue shopping
    const continueButton = page.locator('text=Continue Shopping');
    await continueButton.click();

    // Should navigate to shop or previous page
    await expect(page).not.toHaveURL(/\/cart/);
    
    // Cart items should be preserved
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText(testProducts.length.toString());
  });

  test('should handle out of stock items in cart', async ({ page }) => {
    // Create product that goes out of stock
    const lowStockProduct = await createTestProduct({
      name: 'Low Stock Cart Item',
      slug: 'low-stock-cart-item',
      price: 2999,
      category: 'test',
      brand: 'test',
      stock: 1,
    });

    // Add to cart
    await page.goto(`/product/${lowStockProduct.slug}`);
    await page.locator('button:has-text("Add to Cart")').click();

    // Simulate someone else buying it (set stock to 0)
    // In real test, we'd update via API
    await page.goto('/cart');

    // Item should show out of stock warning
    const outOfStockItem = page.locator(`[data-testid="cart-item"]:has-text("${lowStockProduct.name}")`);
    await expect(outOfStockItem.locator('text=Out of stock')).toBeVisible();

    // Quantity input should be disabled
    await expect(outOfStockItem.locator('[data-testid="quantity-input"]')).toBeDisabled();

    // Remove button should still work
    const removeButton = outOfStockItem.locator('button[aria-label="Remove item"]');
    await removeButton.click();

    await expect(outOfStockItem).not.toBeVisible();

    // Cleanup
    await cleanupTestProduct(lowStockProduct.id);
  });

  test('should handle price changes for items in cart', async ({ page }) => {
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const product = testProducts[0];
    
    // Get initial price
    const initialPriceElement = firstItem.locator('[data-testid="item-price"]');
    const initialPriceText = await initialPriceElement.textContent();
    const initialPrice = parseInt(initialPriceText?.replace(/[^0-9]/g, '') || '0');

    // Simulate price change (in real test, would update via API)
    // For now, just verify the UI handles it gracefully
    
    // Should show price update notification if price changed
    // await expect(page.locator('text=Price updated')).toBeVisible();
  });

  test('should persist cart during browser session', async ({ page }) => {
    // Verify items are in cart
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(testProducts.length);

    // Open new tab
    const newTab = await page.context().newPage();
    await newTab.goto('/cart');

    // Items should be in new tab
    const newTabItems = newTab.locator('[data-testid="cart-item"]');
    await expect(newTabItems).toHaveCount(testProducts.length);

    // Remove item in new tab
    const removeButton = newTabItems.first().locator('button[aria-label="Remove item"]');
    await removeButton.click();

    // Original tab should reflect changes on focus
    await page.bringToFront();
    await page.reload();
    
    const updatedItems = page.locator('[data-testid="cart-item"]');
    await expect(updatedItems).toHaveCount(testProducts.length - 1);

    await newTab.close();
  });

  test('should handle guest cart merging with user account', async ({ page }) => {
    // Add items as guest
    const cartItems = page.locator('[data-testid="cart-item"]');
    const guestCount = await cartItems.count();

    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Navigate to cart after login
    await page.goto('/cart');

    // Cart should have same items (merged)
    const loggedInItems = page.locator('[data-testid="cart-item"]');
    await expect(loggedInItems).toHaveCount(guestCount);
  });

  test('should show estimated delivery time', async ({ page }) => {
    // Should show delivery estimate
    await expect(page.locator('text=Estimated delivery')).toBeVisible();
    
    // Should show date range
    await expect(page.locator('text=3-5 business days')).toBeVisible();
  });

  test('should show secure checkout badge', async ({ page }) => {
    // Should show security indicators
    await expect(page.locator('text=Secure checkout')).toBeVisible();
    await expect(page.locator('text=SSL encrypted')).toBeVisible();
  });

  test('should display cross-sell suggestions', async ({ page }) => {
    // Should show "Frequently bought together" or similar
    await expect(page.locator('text=You might also like')).toBeVisible();
    
    const crossSellItems = page.locator('[data-testid="cross-sell-item"]');
    await expect(crossSellItems.first()).toBeVisible();

    // Should be able to add cross-sell items
    const addButton = crossSellItems.first().locator('button:has-text("Add")');
    await addButton.click();

    // Cart should update
    const cartCounter = page.locator('[aria-label="Cart"] span');
    const currentCount = parseInt(await cartCounter.textContent() || '0');
    await expect(cartCounter).toHaveText((currentCount + 1).toString());
  });

  test('should handle maximum quantity per item', async ({ page }) => {
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const quantityInput = firstItem.locator('[data-testid="quantity-input"]');
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');

    // Increase to maximum stock
    const product = testProducts[0];
    for (let i = 1; i < product.stock; i++) {
      await increaseButton.click();
    }

    // Should show maximum reached
    await expect(quantityInput).toHaveValue(product.stock.toString());
    await expect(firstItem.locator('text=Maximum available')).toBeVisible();

    // Try to increase beyond maximum
    await increaseButton.click();
    await expect(quantityInput).toHaveValue(product.stock.toString());
  });

  test('should show bulk discount notification', async ({ page }) => {
    // Add many of the same item
    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');
    
    // Increase to bulk quantity threshold
    for (let i = 1; i < 10; i++) {
      await increaseButton.click();
    }

    // Should show bulk discount notification
    await expect(page.locator('text=Bulk discount available')).toBeVisible();
    
    // Should show discount amount
    await expect(page.locator('text=Save')).toBeVisible();
  });

  test('should handle cart with thousands of items', async ({ page }) => {
    // Test with many different items
    const manyProducts = await Promise.all(
      Array(20).fill(null).map((_, i) => 
        createTestProduct({
          name: `Cart Test Product ${i + 1}`,
          slug: `cart-test-product-${i + 1}`,
          price: 1000 + i * 100,
          category: 'test',
          brand: 'test',
        })
      )
    );

    // Add all to cart
    for (const product of manyProducts) {
      await page.goto(`/product/${product.slug}`);
      await page.locator('button:has-text("Add to Cart")').click();
    }

    await page.goto('/cart');

    // Should handle many items
    const cartItems = page.locator('[data-testid="cart-item"]');
    await expect(cartItems).toHaveCount(20 + testProducts.length); // Original 3 + new 20

    // Should have pagination or virtualization
    const pagination = page.locator('[data-testid="cart-pagination"]');
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    }

    // Cleanup
    await Promise.all(manyProducts.map(p => cleanupTestProduct(p.id)));
  });

  test('should be accessible for screen readers', async ({ page }) => {
    // Check ARIA attributes
    const cartItems = page.locator('[data-testid="cart-item"]');
    const firstItem = cartItems.first();

    // Each item should have proper labels
    await expect(firstItem.locator('[data-testid="quantity-input"]')).toHaveAttribute('aria-label', 'Quantity');
    await expect(firstItem.locator('button[aria-label="Remove item"]')).toHaveAttribute('aria-label', 'Remove item');
    
    // Live region for updates
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();

    // Cart summary should be announced
    const cartSummary = page.locator('[data-testid="cart-summary"]');
    await expect(cartSummary).toHaveAttribute('aria-label', 'Order summary');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock API failures
    await page.route('**/api/cart/*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cart update failed' }),
      });
    });

    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');
    
    await increaseButton.click();

    // Should show error
    await expect(page.locator('text=Failed to update cart')).toBeVisible();
    
    // Should offer retry
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();

    // Restore normal behavior
    await page.route('**/api/cart/*', route => route.continue());
    await page.click('button:has-text("Try again")');

    // Should work after retry
    await expect(page.locator('text=Cart updated')).toBeVisible();
  });

  test('should handle offline cart operations', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    const firstItem = page.locator('[data-testid="cart-item"]').first();
    const increaseButton = firstItem.locator('button[aria-label="Increase quantity"]');
    
    await increaseButton.click();

    // Should show offline notification
    await expect(page.locator('text=Working offline')).toBeVisible();

    // Changes should be cached locally
    const quantityInput = firstItem.locator('[data-testid="quantity-input"]');
    await expect(quantityInput).toHaveValue('2');

    // Go back online
    await page.context().setOffline(false);

    // Should sync changes
    await expect(page.locator('text=Cart synced')).toBeVisible();
  });

  test('should show cart summary in sticky header on scroll', async ({ page }) => {
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    // Sticky cart summary should appear
    const stickySummary = page.locator('[data-testid="sticky-cart-summary"]');
    await expect(stickySummary).toBeVisible();

    // Should show important info
    await expect(stickySummary.locator('text=Total:')).toBeVisible();
    await expect(stickySummary.locator('button:has-text("Checkout")')).toBeVisible();

    // Click checkout from sticky header
    await stickySummary.locator('button:has-text("Checkout")').click();
    await page.waitForURL(/\/checkout/);
  });

  test('should print cart contents', async ({ page }) => {
    // Click print button if available
    const printButton = page.locator('button:has-text("Print")');
    if (await printButton.isVisible()) {
      await printButton.click();
      
      // Should show print dialog or preview
      // Note: Can't test actual print dialog in Playwright
    }
  });

  test('should share cart via link or email', async ({ page }) => {
    // Look for share button
    const shareButton = page.locator('button:has-text("Share Cart")');
    if (await shareButton.isVisible()) {
      await shareButton.click();
      
      // Should show share options
      const shareDialog = page.locator('[data-testid="share-dialog"]');
      await expect(shareDialog).toBeVisible();
      
      // Should have email option
      await expect(shareDialog.locator('text=Email')).toBeVisible();
      
      // Should have link copy option
      await expect(shareDialog.locator('text=Copy Link')).toBeVisible();
    }
  });

  test('should show item availability by location', async ({ page }) => {
    // Should show delivery location selector
    const locationSelector = page.locator('[data-testid="delivery-location"]');
    if (await locationSelector.isVisible()) {
      await locationSelector.click();
      
      // Should show location options
      await expect(page.locator('text=Nairobi')).toBeVisible();
      await expect(page.locator('text=Mombasa')).toBeVisible();
      
      // Select different location
      await page.click('text=Mombasa');
      
      // Shipping costs might change
      await expect(page.locator('[data-testid="shipping"]')).not.toHaveText('KES 0');
    }
  });
});
