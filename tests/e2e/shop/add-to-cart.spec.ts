import { test, expect } from '@playwright/test';
import { createTestProduct, cleanupTestProduct } from '../helpers/products';

test.describe('Cart - Add to Cart Functionality', () => {
  let testProduct: { id: string; name: string; slug: string; price: number };
  let testProductWithVariants: { id: string; name: string; slug: string };

  test.beforeAll(async () => {
    // Create test products
    testProduct = await createTestProduct({
      name: 'Test Product for Cart',
      slug: 'test-product-cart',
      price: 9999,
      category: 'electronics',
      brand: 'test',
      stock: 50,
    });

    testProductWithVariants = await createTestProduct({
      name: 'Product with Variants',
      slug: 'product-with-variants',
      price: 7999,
      category: 'fashion',
      brand: 'test',
      stock: 30,
      variants: [
        {
          name: 'Small',
          price: 7999,
          sku: 'VAR-SMALL',
          stock: 10,
          attributes: { size: 'S', color: 'Red' },
        },
        {
          name: 'Medium',
          price: 8499,
          sku: 'VAR-MEDIUM',
          stock: 15,
          attributes: { size: 'M', color: 'Blue' },
        },
        {
          name: 'Large',
          price: 8999,
          sku: 'VAR-LARGE',
          stock: 5,
          attributes: { size: 'L', color: 'Green' },
        },
      ],
    });
  });

  test.afterAll(async () => {
    // Cleanup test products
    await cleanupTestProduct(testProduct.id);
    await cleanupTestProduct(testProductWithVariants.id);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/product/${testProduct.slug}`);
  });

  test('should display add to cart button on product page', async ({ page }) => {
    // Check add to cart button is visible
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await expect(addToCartButton).toBeVisible();
    await expect(addToCartButton).toBeEnabled();

    // Check quantity selector
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    await expect(quantityInput).toBeVisible();
    await expect(quantityInput).toHaveValue('1');

    // Check increment/decrement buttons
    const incrementButton = page.locator('button[aria-label="Increase quantity"]');
    const decrementButton = page.locator('button[aria-label="Decrease quantity"]');
    await expect(incrementButton).toBeVisible();
    await expect(decrementButton).toBeVisible();
  });

  test('should add product to cart successfully', async ({ page }) => {
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    
    // Click add to cart
    await addToCartButton.click();

    // Should show success feedback
    await expect(page.locator('text=Added to cart')).toBeVisible();

    // Cart counter should update
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    // Button should change to indicate item is in cart
    await expect(addToCartButton).toHaveText(/Added|In Cart/);

    // Navigate to cart page
    await page.click('[aria-label="Cart"]');
    await page.waitForURL(/\/cart/);

    // Product should be in cart
    await expect(page.locator(`text=${testProduct.name}`)).toBeVisible();
    await expect(page.locator('text=KES 9,999')).toBeVisible();
  });

  test('should add multiple quantities to cart', async ({ page }) => {
    // Increase quantity to 3
    const incrementButton = page.locator('button[aria-label="Increase quantity"]');
    await incrementButton.click();
    await incrementButton.click();

    // Quantity should be 3
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    await expect(quantityInput).toHaveValue('3');

    // Add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Cart should show 3 items
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('3');

    // Navigate to cart
    await page.click('[aria-label="Cart"]');
    await page.waitForURL(/\/cart/);

    // Should show quantity 3
    await expect(page.locator('text=Quantity: 3')).toBeVisible();
    await expect(page.locator('text=KES 29,997')).toBeVisible(); // 3 * 9,999
  });

  test('should select product variant before adding to cart', async ({ page }) => {
    // Navigate to product with variants
    await page.goto(`/product/${testProductWithVariants.slug}`);

    // Variant selector should be visible
    const variantSelector = page.locator('[data-testid="variant-selector"]');
    await expect(variantSelector).toBeVisible();

    // Select medium variant
    const mediumVariant = page.locator('button:has-text("Medium")');
    await mediumVariant.click();

    // Price should update for medium variant
    await expect(page.locator('text=KES 8,499')).toBeVisible();

    // Add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Navigate to cart
    await page.click('[aria-label="Cart"]');
    await page.waitForURL(/\/cart/);

    // Should show selected variant
    await expect(page.locator('text=Medium')).toBeVisible();
    await expect(page.locator('text=KES 8,499')).toBeVisible();
  });

  test('should show error when required variant not selected', async ({ page }) => {
    await page.goto(`/product/${testProductWithVariants.slug}`);

    // Try to add to cart without selecting variant
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show error message
    await expect(page.locator('text=Please select a variant')).toBeVisible();

    // Variant selector should indicate error
    const variantSelector = page.locator('[data-testid="variant-selector"]');
    await expect(variantSelector).toHaveClass(/error/);
  });

  test('should handle out of stock products', async ({ page }) => {
    // Create out of stock product
    const outOfStockProduct = await createTestProduct({
      name: 'Out of Stock Product',
      slug: 'out-of-stock-cart',
      price: 4999,
      category: 'test',
      brand: 'test',
      stock: 0,
    });

    await page.goto(`/product/${outOfStockProduct.slug}`);

    // Add to cart button should be disabled
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await expect(addToCartButton).toBeDisabled();
    await expect(addToCartButton).toHaveText('Out of Stock');

    // Quantity selector should be disabled
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    await expect(quantityInput).toBeDisabled();

    // Cleanup
    await cleanupTestProduct(outOfStockProduct.id);
  });

  test('should handle limited stock products', async ({ page }) => {
    // Create low stock product
    const lowStockProduct = await createTestProduct({
      name: 'Low Stock Product',
      slug: 'low-stock-cart',
      price: 2999,
      category: 'test',
      brand: 'test',
      stock: 2,
    });

    await page.goto(`/product/${lowStockProduct.slug}`);

    // Should show stock warning
    await expect(page.locator('text=Only 2 left')).toBeVisible();

    // Try to add more than available stock
    const incrementButton = page.locator('button[aria-label="Increase quantity"]');
    await incrementButton.click();
    await incrementButton.click(); // Now at 3

    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show stock error
    await expect(page.locator('text=Only 2 items available')).toBeVisible();

    // Cleanup
    await cleanupTestProduct(lowStockProduct.id);
  });

  test('should add to cart from product listings', async ({ page }) => {
    await page.goto('/shop');

    // Find a product card
    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toBeVisible();

    // Click add to cart button on product card
    const addToCartButton = productCard.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show success feedback
    await expect(page.locator('text=Added to cart')).toBeVisible();

    // Cart counter should update
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');
  });

  test('should add to cart from quick view modal', async ({ page }) => {
    await page.goto('/shop');

    // Hover over product card to show quick view
    const productCard = page.locator('[data-testid="product-card"]').first();
    await productCard.hover();

    // Click quick view button
    const quickViewButton = productCard.locator('button:has-text("Quick View")');
    await quickViewButton.click();

    // Quick view modal should open
    const quickViewModal = page.locator('[data-testid="quick-view-modal"]');
    await expect(quickViewModal).toBeVisible();

    // Add to cart from quick view
    const addToCartButton = quickViewModal.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show success feedback
    await expect(page.locator('text=Added to cart')).toBeVisible();

    // Close modal
    const closeButton = quickViewModal.locator('button[aria-label="Close"]');
    await closeButton.click();
    await expect(quickViewModal).not.toBeVisible();
  });

  test('should persist cart items across page reloads', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Verify item is in cart
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    // Reload page
    await page.reload();

    // Cart should still have the item
    await expect(cartCounter).toHaveText('1');
  });

  test('should persist cart items across browser sessions', async ({ page, context }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Save storage state
    await context.storageState({ path: 'cart-state.json' });

    // Create new context with saved state
    const newContext = await context.browser().newContext({
      storageState: 'cart-state.json',
    });
    const newPage = await newContext.newPage();
    await newPage.goto('/');

    // Cart should still have the item
    const cartCounter = newPage.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    await newContext.close();
  });

  test('should show loading state while adding to cart', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/cart*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show loading state
    await expect(addToCartButton).toHaveText(/Adding/);
    await expect(addToCartButton).toBeDisabled();

    // Wait for completion
    await expect(addToCartButton).toHaveText(/Added|In Cart/);
    await expect(addToCartButton).toBeEnabled();
  });

  test('should handle network errors when adding to cart', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/cart*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cart update failed' }),
      });
    });

    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show error message
    await expect(page.locator('text=Failed to add to cart')).toBeVisible();

    // Should offer retry option
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();

    // Restore normal behavior
    await page.route('**/api/cart*', route => route.continue());
    await page.click('button:has-text("Try again")');

    // Should work after retry
    await expect(page.locator('text=Added to cart')).toBeVisible();
  });

  test('should prevent duplicate cart additions without quantity increase', async ({ page }) => {
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    
    // Add item twice
    await addToCartButton.click();
    await addToCartButton.click();

    // Should show message about existing item
    await expect(page.locator('text=Item already in cart')).toBeVisible();

    // Cart should still have only 1 item
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    // Navigate to cart
    await page.click('[aria-label="Cart"]');
    await page.waitForURL(/\/cart/);

    // Should still have quantity 1
    await expect(page.locator('text=Quantity: 1')).toBeVisible();
  });

  test('should add same product with different variants as separate items', async ({ page }) => {
    await page.goto(`/product/${testProductWithVariants.slug}`);

    // Select small variant and add to cart
    const smallVariant = page.locator('button:has-text("Small")');
    await smallVariant.click();
    
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Select medium variant and add to cart
    const mediumVariant = page.locator('button:has-text("Medium")');
    await mediumVariant.click();
    await addToCartButton.click();

    // Cart should have 2 items
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('2');

    // Navigate to cart
    await page.click('[aria-label="Cart"]');
    await page.waitForURL(/\/cart/);

    // Should show both variants as separate items
    await expect(page.locator('text=Small')).toBeVisible();
    await expect(page.locator('text=Medium')).toBeVisible();
  });

  test('should update cart counter in real-time', async ({ page }) => {
    // Open two tabs
    const tab1 = page;
    const tab2 = await page.context().newPage();
    
    await tab1.goto(`/product/${testProduct.slug}`);
    await tab2.goto('/');

    // Add item in tab1
    const addToCartButton = tab1.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Tab2 should update cart counter
    const tab2CartCounter = tab2.locator('[aria-label="Cart"] span');
    await expect(tab2CartCounter).toHaveText('1', { timeout: 5000 });

    await tab2.close();
  });

  test('should show cart preview on hover', async ({ page }) => {
    // First add an item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Hover over cart icon
    const cartIcon = page.locator('[aria-label="Cart"]');
    await cartIcon.hover();

    // Cart preview should appear
    const cartPreview = page.locator('[data-testid="cart-preview"]');
    await expect(cartPreview).toBeVisible();

    // Should show cart items
    await expect(cartPreview.locator(`text=${testProduct.name}`)).toBeVisible();
    await expect(cartPreview.locator('text=KES 9,999')).toBeVisible();

    // Should show total
    await expect(cartPreview.locator('text=Total:')).toBeVisible();

    // Should have view cart button
    await expect(cartPreview.locator('button:has-text("View Cart")')).toBeVisible();

    // Should have checkout button
    await expect(cartPreview.locator('button:has-text("Checkout")')).toBeVisible();
  });

  test('should navigate to cart from cart preview', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Open cart preview
    const cartIcon = page.locator('[aria-label="Cart"]');
    await cartIcon.hover();

    // Click view cart
    const viewCartButton = page.locator('button:has-text("View Cart")');
    await viewCartButton.click();

    // Should navigate to cart page
    await page.waitForURL(/\/cart/);
    await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();
  });

  test('should navigate to checkout from cart preview', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Open cart preview
    const cartIcon = page.locator('[aria-label="Cart"]');
    await cartIcon.hover();

    // Click checkout
    const checkoutButton = page.locator('button:has-text("Checkout")');
    await checkoutButton.click();

    // Should navigate to checkout
    await page.waitForURL(/\/checkout/);
    await expect(page.locator('h1:has-text("Checkout")')).toBeVisible();
  });

  test('should handle maximum quantity limits', async ({ page }) => {
    // Create product with maximum purchase limit
    const limitedProduct = await createTestProduct({
      name: 'Limited Quantity Product',
      slug: 'limited-quantity-product',
      price: 1999,
      category: 'test',
      brand: 'test',
      stock: 100,
      maxPurchase: 5, // Maximum 5 per customer
    });

    await page.goto(`/product/${limitedProduct.slug}`);

    // Try to increase quantity beyond limit
    const incrementButton = page.locator('button[aria-label="Increase quantity"]');
    for (let i = 0; i < 6; i++) {
      await incrementButton.click();
    }

    // Should not go beyond maximum
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    await expect(quantityInput).toHaveValue('5');

    // Should show maximum limit message
    await expect(page.locator('text=Maximum 5 per customer')).toBeVisible();

    // Cleanup
    await cleanupTestProduct(limitedProduct.id);
  });

  test('should show related products in cart add suggestions', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show "Frequently bought together" or similar
    await expect(page.locator('text=Frequently bought together')).toBeVisible();

    // Should show related products
    const relatedProducts = page.locator('[data-testid="related-products"]');
    await expect(relatedProducts).toBeVisible();

    // Should be able to add related products directly
    const addRelatedButton = relatedProducts.locator('button:has-text("Add")').first();
    await addRelatedButton.click();

    // Cart should update
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('2');
  });

  test('should handle guest vs logged in user cart merging', async ({ page }) => {
    // Add item as guest
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Sign In")');

    // Cart should merge guest items with user cart
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');
  });

  test('should be accessible for keyboard navigation', async ({ page }) => {
    // Navigate to quantity controls with keyboard
    await page.keyboard.press('Tab');
    
    // Focus should go to quantity decrement
    const decrementButton = page.locator('button[aria-label="Decrease quantity"]');
    await expect(decrementButton).toBeFocused();

    await page.keyboard.press('Tab');
    // Focus should go to quantity input
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    await expect(quantityInput).toBeFocused();

    await page.keyboard.press('Tab');
    // Focus should go to quantity increment
    const incrementButton = page.locator('button[aria-label="Increase quantity"]');
    await expect(incrementButton).toBeFocused();

    await page.keyboard.press('Tab');
    // Focus should go to add to cart button
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await expect(addToCartButton).toBeFocused();

    // Check ARIA attributes
    await expect(quantityInput).toHaveAttribute('aria-label', 'Quantity');
    await expect(decrementButton).toHaveAttribute('aria-label', 'Decrease quantity');
    await expect(incrementButton).toHaveAttribute('aria-label', 'Increase quantity');
    await expect(addToCartButton).toHaveAttribute('aria-label', 'Add to cart');
  });

  test('should show visual feedback on successful add', async ({ page }) => {
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    
    // Capture initial button state
    const initialColor = await addToCartButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Add to cart
    await addToCartButton.click();

    // Button should change appearance
    const afterColor = await addToCartButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    expect(afterColor).not.toBe(initialColor);

    // Should show success animation
    await expect(page.locator('[data-testid="success-animation"]')).toBeVisible();
  });

  test('should handle concurrent add to cart requests', async ({ page }) => {
    // Trigger multiple add to cart clicks quickly
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    
    // Click multiple times
    for (let i = 0; i < 3; i++) {
      addToCartButton.click();
      await page.waitForTimeout(100);
    }

    // Should only add once or show appropriate message
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');
  });

  test('should validate quantity input', async ({ page }) => {
    const quantityInput = page.locator('input[type="number"], [data-testid="quantity-input"]');
    
    // Try to enter invalid values
    await quantityInput.fill('0');
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show validation error
    await expect(page.locator('text=Quantity must be at least 1')).toBeVisible();

    // Try negative number
    await quantityInput.fill('-1');
    await addToCartButton.click();
    await expect(page.locator('text=Quantity must be at least 1')).toBeVisible();

    // Try decimal
    await quantityInput.fill('1.5');
    await addToCartButton.click();
    await expect(page.locator('text=Quantity must be a whole number')).toBeVisible();

    // Try very large number
    await quantityInput.fill('9999');
    await addToCartButton.click();
    await expect(page.locator('text=Exceeds available stock')).toBeVisible();
  });

  test('should show cart side effects on other pages', async ({ page }) => {
    // Add item to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Navigate to other pages
    await page.goto('/shop');
    
    // Cart counter should persist
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    await page.goto('/deals');
    await expect(cartCounter).toHaveText('1');

    await page.goto('/');
    await expect(cartCounter).toHaveText('1');
  });

  test('should handle cart offline', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);

    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Should show offline message
    await expect(page.locator('text=Added to cart (offline)')).toBeVisible();

    // Cart counter should update
    const cartCounter = page.locator('[aria-label="Cart"] span');
    await expect(cartCounter).toHaveText('1');

    // Go back online
    await page.context().setOffline(false);

    // Should sync when online
    await expect(page.locator('text=Cart synced')).toBeVisible();
  });
});
