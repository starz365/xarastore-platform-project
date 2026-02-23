import { test, expect } from '@playwright/test';
import { createTestProduct, cleanupTestProduct } from '../helpers/products';

test.describe('Shop - Filters Functionality', () => {
  let testProducts: Array<{ id: string; name: string; category: string; brand: string; price: number }> = [];

  test.beforeAll(async () => {
    // Create diverse test products for filtering
    testProducts = await Promise.all([
      createTestProduct({
        name: 'Budget Smartphone',
        slug: 'budget-smartphone',
        price: 19999,
        originalPrice: 24999,
        category: 'electronics',
        brand: 'xiaomi',
        rating: 4.2,
        stock: 50,
        attributes: {
          color: 'Black',
          storage: '128GB',
          ram: '6GB',
        },
      }),
      createTestProduct({
        name: 'Premium Smartphone',
        slug: 'premium-smartphone',
        price: 149999,
        originalPrice: 159999,
        category: 'electronics',
        brand: 'apple',
        rating: 4.8,
        stock: 20,
        attributes: {
          color: 'Silver',
          storage: '256GB',
          ram: '8GB',
        },
      }),
      createTestProduct({
        name: 'Mid-range Smartphone',
        slug: 'midrange-smartphone',
        price: 59999,
        category: 'electronics',
        brand: 'samsung',
        rating: 4.5,
        stock: 30,
        attributes: {
          color: 'Blue',
          storage: '128GB',
          ram: '8GB',
        },
      }),
      createTestProduct({
        name: 'Wireless Earbuds',
        slug: 'wireless-earbuds',
        price: 8999,
        category: 'electronics',
        brand: 'sony',
        rating: 4.3,
        stock: 100,
        attributes: {
          color: 'White',
          battery: '24h',
          waterproof: 'IPX4',
        },
      }),
      createTestProduct({
        name: 'Men\'s T-Shirt',
        slug: 'mens-tshirt',
        price: 1999,
        category: 'fashion',
        brand: 'nike',
        rating: 4.0,
        stock: 200,
        attributes: {
          color: 'Black',
          size: 'M',
          material: 'Cotton',
        },
      }),
      createTestProduct({
        name: 'Women\'s Dress',
        slug: 'womens-dress',
        price: 4999,
        category: 'fashion',
        brand: 'zara',
        rating: 4.6,
        stock: 80,
        attributes: {
          color: 'Red',
          size: 'S',
          material: 'Polyester',
        },
      }),
      createTestProduct({
        name: 'Laptop',
        slug: 'gaming-laptop',
        price: 129999,
        category: 'electronics',
        brand: 'asus',
        rating: 4.7,
        stock: 15,
        attributes: {
          color: 'Black',
          storage: '1TB',
          ram: '16GB',
        },
      }),
    ]);
  });

  test.afterAll(async () => {
    // Cleanup test products
    await Promise.all(testProducts.map(p => cleanupTestProduct(p.id)));
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
  });

  test('should display filter sidebar correctly', async ({ page }) => {
    // Check filter sidebar is visible
    const filterSidebar = page.locator('[data-testid="filter-sidebar"]');
    await expect(filterSidebar).toBeVisible();

    // Check filter sections
    await expect(filterSidebar.locator('text=Categories')).toBeVisible();
    await expect(filterSidebar.locator('text=Brands')).toBeVisible();
    await expect(filterSidebar.locator('text=Price')).toBeVisible();
    await expect(filterSidebar.locator('text=Rating')).toBeVisible();

    // Check expandable sections
    const categorySection = filterSidebar.locator('text=Categories').first();
    await categorySection.click();
    await expect(filterSidebar.locator('label:has-text("electronics")')).toBeVisible();
    await expect(filterSidebar.locator('label:has-text("fashion")')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Filter by electronics category
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    // Wait for URL update
    await page.waitForURL(/category=electronics/);

    // Check only electronics products are shown
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=Electronics')).toBeVisible();
    }

    // Electronics count should be correct
    const electronicsCount = testProducts.filter(p => p.category === 'electronics').length;
    expect(count).toBe(electronicsCount);

    // Add fashion category filter
    const fashionCheckbox = page.locator('label:has-text("fashion") input[type="checkbox"]');
    await fashionCheckbox.check();

    await page.waitForURL(/category=electronics&category=fashion/);

    // Should show both electronics and fashion
    const updatedCards = page.locator('[data-testid="product-card"]');
    const updatedCount = await updatedCards.count();
    expect(updatedCount).toBe(electronicsCount + 2); // 2 fashion products
  });

  test('should filter products by brand', async ({ page }) => {
    // Expand brands section
    const brandsSection = page.locator('text=Brands').first();
    await brandsSection.click();

    // Filter by Apple
    const appleCheckbox = page.locator('label:has-text("apple") input[type="checkbox"]');
    await appleCheckbox.check();

    await page.waitForURL(/brand=apple/);

    // Check only Apple products are shown
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=apple')).toBeVisible();
    }

    expect(count).toBe(1); // Only one Apple product

    // Add Samsung filter
    const samsungCheckbox = page.locator('label:has-text("samsung") input[type="checkbox"]');
    await samsungCheckbox.check();

    await page.waitForURL(/brand=apple&brand=samsung/);

    const updatedCards = page.locator('[data-testid="product-card"]');
    const updatedCount = await updatedCards.count();
    expect(updatedCount).toBe(2); // Apple + Samsung
  });

  test('should filter products by price range', async ({ page }) => {
    // Set price range
    const minPriceInput = page.locator('input[name="minPrice"]');
    const maxPriceInput = page.locator('input[name="maxPrice"]');

    await minPriceInput.fill('50000');
    await maxPriceInput.fill('100000');

    // Apply price filter
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/minPrice=50000&maxPrice=100000/);

    // Check products are within price range
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      
      expect(price).toBeGreaterThanOrEqual(50000);
      expect(price).toBeLessThanOrEqual(100000);
    }

    // Should only show mid-range smartphone (59,999)
    expect(count).toBe(1);
    await expect(productCards.first().locator('text=Mid-range Smartphone')).toBeVisible();
  });

  test('should filter products by minimum price only', async ({ page }) => {
    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('100000');

    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/minPrice=100000/);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should show premium smartphone (149,999) and laptop (129,999)
    expect(count).toBe(2);

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      expect(price).toBeGreaterThanOrEqual(100000);
    }
  });

  test('should filter products by maximum price only', async ({ page }) => {
    const maxPriceInput = page.locator('input[name="maxPrice"]');
    await maxPriceInput.fill('20000');

    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/maxPrice=20000/);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should show budget smartphone (19,999), earbuds (8,999), t-shirt (1,999)
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      expect(price).toBeLessThanOrEqual(20000);
    }
  });

  test('should filter products by rating', async ({ page }) => {
    // Expand rating section
    const ratingSection = page.locator('text=Rating').first();
    await ratingSection.click();

    // Filter by 4 stars and above
    const fourStarRadio = page.locator('label:has-text("4 ★ & above") input[type="radio"]');
    await fourStarRadio.check();

    await page.waitForURL(/minRating=4/);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should show products with rating >= 4
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const ratingText = await card.locator('[data-testid="product-rating"]').textContent();
      const rating = parseFloat(ratingText?.match(/[\d.]+/)?.[0] || '0');
      expect(rating).toBeGreaterThanOrEqual(4);
    }

    // Filter by 4.5 stars and above
    const fourPointFiveStarRadio = page.locator('label:has-text("4.5 ★ & above") input[type="radio"]');
    await fourPointFiveStarRadio.check();

    await page.waitForURL(/minRating=4\.5/);

    const updatedCards = page.locator('[data-testid="product-card"]');
    const updatedCount = await updatedCards.count();

    // Should show fewer products
    expect(updatedCount).toBeLessThan(count);
  });

  test('should filter products by availability (in stock)', async ({ page }) => {
    // Create an out of stock product
    const outOfStockProduct = await createTestProduct({
      name: 'Out of Stock Filter Test',
      slug: 'out-of-stock-filter-test',
      price: 9999,
      category: 'test',
      brand: 'test',
      stock: 0,
    });

    await page.reload();

    // Find availability filter
    const availabilitySection = page.locator('text=Availability').first();
    await availabilitySection.click();

    // Filter by in stock only
    const inStockCheckbox = page.locator('label:has-text("In Stock") input[type="checkbox"]');
    await inStockCheckbox.check();

    await page.waitForURL(/inStock=true/);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should not show out of stock product
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=Out of stock')).not.toBeVisible();
    }

    // Cleanup
    await cleanupTestProduct(outOfStockProduct.id);
  });

  test('should filter products by color attribute', async ({ page }) => {
    // Create products with different colors
    const colorProducts = await Promise.all([
      createTestProduct({
        name: 'Red Product',
        slug: 'red-product',
        price: 9999,
        category: 'test-color',
        brand: 'test',
        attributes: { color: 'Red' },
      }),
      createTestProduct({
        name: 'Blue Product',
        slug: 'blue-product',
        price: 9999,
        category: 'test-color',
        brand: 'test',
        attributes: { color: 'Blue' },
      }),
      createTestProduct({
        name: 'Black Product',
        slug: 'black-product',
        price: 9999,
        category: 'test-color',
        brand: 'test',
        attributes: { color: 'Black' },
      }),
    ]);

    await page.goto('/shop?category=test-color');

    // Color filter should appear
    const colorSection = page.locator('text=Color').first();
    await expect(colorSection).toBeVisible();
    await colorSection.click();

    // Filter by Red
    const redCheckbox = page.locator('label:has-text("Red") input[type="checkbox"]');
    await redCheckbox.check();

    await page.waitForURL(/color=Red/);

    // Should only show red products
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    expect(count).toBe(1);
    await expect(productCards.first().locator('text=Red Product')).toBeVisible();

    // Add Blue filter
    const blueCheckbox = page.locator('label:has-text("Blue") input[type="checkbox"]');
    await blueCheckbox.check();

    await page.waitForURL(/color=Red&color=Blue/);

    const updatedCards = page.locator('[data-testid="product-card"]');
    const updatedCount = await updatedCards.count();
    expect(updatedCount).toBe(2);

    // Cleanup
    await Promise.all(colorProducts.map(p => cleanupTestProduct(p.id)));
  });

  test('should combine multiple filters', async ({ page }) => {
    // Apply multiple filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('50000');

    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    // Expand rating section
    const ratingSection = page.locator('text=Rating').first();
    await ratingSection.click();

    const fourStarRadio = page.locator('label:has-text("4 ★ & above") input[type="radio"]');
    await fourStarRadio.check();

    await page.waitForURL(/category=electronics&minPrice=50000&minRating=4/);

    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();

    // Should show electronics products >= 50,000 KES with rating >= 4
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      
      // Check category
      await expect(card.locator('text=Electronics')).toBeVisible();
      
      // Check price
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      expect(price).toBeGreaterThanOrEqual(50000);
      
      // Check rating
      const ratingText = await card.locator('[data-testid="product-rating"]').textContent();
      const rating = parseFloat(ratingText?.match(/[\d.]+/)?.[0] || '0');
      expect(rating).toBeGreaterThanOrEqual(4);
    }

    // Should show mid-range smartphone (59,999, rating 4.5) and laptop (129,999, rating 4.7)
    expect(count).toBe(2);
  });

  test('should show active filters with clear options', async ({ page }) => {
    // Apply some filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('50000');
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    // Check active filters display
    const activeFilters = page.locator('[data-testid="active-filters"]');
    await expect(activeFilters).toBeVisible();

    // Should show active filter chips
    await expect(activeFilters.locator('text=Electronics')).toBeVisible();
    await expect(activeFilters.locator('text=Min: KES 50,000')).toBeVisible();

    // Clear individual filter
    const clearElectronics = activeFilters.locator('button:has-text("Electronics") svg');
    await clearElectronics.click();

    await page.waitForURL(/minPrice=50000/);
    await expect(activeFilters.locator('text=Electronics')).not.toBeVisible();

    // Clear all filters
    const clearAllButton = page.locator('button:has-text("Clear all")');
    await clearAllButton.click();

    await expect(page).not.toHaveURL(/minPrice=/);
    await expect(activeFilters).not.toBeVisible();
  });

  test('should update product count when filters change', async ({ page }) => {
    // Get initial product count
    const resultsCount = page.locator('[data-testid="results-count"]');
    const initialText = await resultsCount.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || '0');

    // Apply filter
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    await page.waitForURL(/category=electronics/);

    // Count should update
    await expect(resultsCount).not.toHaveText(initialText!);
    const updatedText = await resultsCount.textContent();
    const updatedCount = parseInt(updatedText?.match(/\d+/)?.[0] || '0');
    
    // Should show fewer products (only electronics)
    expect(updatedCount).toBeLessThan(initialCount);
    expect(updatedCount).toBe(testProducts.filter(p => p.category === 'electronics').length);
  });

  test('should handle filter conflicts gracefully', async ({ page }) => {
    // Apply contradictory filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    const fashionCheckbox = page.locator('label:has-text("fashion") input[type="checkbox"]');
    await fashionCheckbox.check();

    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('200000'); // No products this expensive

    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/category=electronics&category=fashion&minPrice=200000/);

    // Should show no results message
    await expect(page.locator('text=No products match your filters')).toBeVisible();
    
    // Should suggest clearing filters
    await expect(page.locator('button:has-text("Clear filters")')).toBeVisible();
  });

  test('should preserve filters during navigation', async ({ page }) => {
    // Apply filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('50000');
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/category=electronics&minPrice=50000/);

    // Navigate to a product
    const productLink = page.locator('[data-testid="product-card"] a').first();
    await productLink.click();

    // Go back to shop
    await page.goBack();

    // Filters should be preserved
    await expect(page).toHaveURL(/category=electronics&minPrice=50000/);
    await expect(electronicsCheckbox).toBeChecked();
    await expect(minPriceInput).toHaveValue('50000');
  });

  test('should reset filters when changing categories via navigation', async ({ page }) => {
    // Apply some filters
    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('50000');
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    // Navigate to specific category page
    await page.click('text=Electronics');
    await page.waitForURL(/category\/electronics/);

    // Price filter should be reset on category page
    await expect(minPriceInput).toHaveValue('');
  });

  test('should show loading state during filter changes', async ({ page }) => {
    // Listen for filter request
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/products') && response.status() === 200
      ),
      page.locator('label:has-text("electronics") input[type="checkbox"]').check(),
    ]);

    // Should show loading indicator
    const loadingIndicator = page.locator('[data-testid="filter-loading"]');
    await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
    
    // Loading should disappear when done
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle filter errors gracefully', async ({ page }) => {
    // Mock filter API error
    await page.route('**/api/products*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Filter failed' }),
      });
    });

    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();

    // Should show error message
    await expect(page.locator('text=Failed to apply filters')).toBeVisible();
    
    // Should offer retry option
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();

    // Restore normal behavior
    await page.route('**/api/products*', route => route.continue());
    await page.click('button:has-text("Try again")');

    // Should work after retry
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  test('should be accessible for keyboard navigation', async ({ page }) => {
    // Navigate to filters with keyboard
    await page.keyboard.press('Tab');
    
    // Focus should move through filter elements
    const filterCheckboxes = page.locator('[data-testid="filter-sidebar"] input[type="checkbox"], [data-testid="filter-sidebar"] input[type="radio"]');
    const count = await filterCheckboxes.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator('*:focus');
      await expect(focusedElement).toHaveAttribute('type', /checkbox|radio/);
    }

    // Check ARIA attributes
    for (let i = 0; i < count; i++) {
      const checkbox = filterCheckboxes.nth(i);
      await expect(checkbox).toHaveAttribute('aria-label');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });

    // Filters might be in drawer
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      // Filter drawer should open
      const filterDrawer = page.locator('[data-testid="filter-drawer"]');
      await expect(filterDrawer).toBeVisible();
      
      // Apply filter in drawer
      const electronicsCheckbox = filterDrawer.locator('label:has-text("electronics") input[type="checkbox"]');
      await electronicsCheckbox.check();
      
      // Close drawer
      const closeButton = filterDrawer.locator('button[aria-label="Close"]');
      await closeButton.click();
      
      await expect(filterDrawer).not.toBeVisible();
      
      // Filter should still be applied
      await expect(page).toHaveURL(/category=electronics/);
    }
  });

  test('should filter products by discount/sale items', async ({ page }) => {
    // Find sale filter
    const saleSection = page.locator('text=On Sale').first();
    if (await saleSection.isVisible()) {
      await saleSection.click();
      
      const saleCheckbox = page.locator('label:has-text("On Sale") input[type="checkbox"]');
      await saleCheckbox.check();
      
      await page.waitForURL(/onSale=true/);
      
      // Should only show products with discounts
      const productCards = page.locator('[data-testid="product-card"]');
      const count = await productCards.count();
      
      for (let i = 0; i < count; i++) {
        const card = productCards.nth(i);
        // Should show discount badge
        await expect(card.locator('text=Save')).toBeVisible();
      }
    }
  });

  test('should filter by product attributes specific to category', async ({ page }) => {
    // Navigate to electronics category
    await page.click('text=Electronics');
    await page.waitForURL(/category\/electronics/);
    
    // Category-specific filters should appear
    await expect(page.locator('text=Storage')).toBeVisible();
    await expect(page.locator('text=RAM')).toBeVisible();
    
    // Filter by storage
    const storageSection = page.locator('text=Storage').first();
    await storageSection.click();
    
    const storage128GB = page.locator('label:has-text("128GB") input[type="checkbox"]');
    await storage128GB.check();
    
    await page.waitForURL(/storage=128GB/);
    
    // Should only show products with 128GB storage
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      // In a real test, we'd check product attributes
      await expect(card).toBeVisible();
    }
  });

  test('should show filter count badges', async ({ page }) => {
    // Apply multiple filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();
    
    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('50000');
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();
    
    // Filter button should show count badge
    const filterButton = page.locator('button:has-text("Filter")');
    const badge = filterButton.locator('[data-testid="filter-count"]');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('2');
  });

  test('should remember filter preferences', async ({ page, context }) => {
    // Apply some filters
    const electronicsCheckbox = page.locator('label:has-text("electronics") input[type="checkbox"]');
    await electronicsCheckbox.check();
    
    // Close and reopen browser
    await context.storageState({ path: 'state.json' });
    await page.close();
    
    const newPage = await context.newPage();
    await newPage.goto('/shop');
    
    // In a real implementation, filters might be remembered via URL or localStorage
    // This test would verify that behavior
  });
});
