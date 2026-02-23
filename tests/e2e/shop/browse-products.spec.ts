import { test, expect } from '@playwright/test';
import { createTestProduct, cleanupTestProduct } from '../helpers/products';

test.describe('Shop - Browse Products', () => {
  let testProducts: Array<{ id: string; slug: string; name: string }> = [];

  test.beforeAll(async () => {
    // Create test products
    testProducts = await Promise.all([
      createTestProduct({
        name: 'Premium Wireless Headphones',
        slug: 'premium-wireless-headphones',
        price: 12999,
        category: 'electronics',
        brand: 'audio-tech',
        stock: 50,
      }),
      createTestProduct({
        name: 'Smart Fitness Watch',
        slug: 'smart-fitness-watch',
        price: 8999,
        category: 'electronics',
        brand: 'fit-tech',
        stock: 30,
      }),
      createTestProduct({
        name: 'Organic Cotton T-Shirt',
        slug: 'organic-cotton-t-shirt',
        price: 2499,
        category: 'fashion',
        brand: 'eco-wear',
        stock: 100,
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

  test('should display shop page correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Shop | Xarastore/);

    // Check header
    await expect(page.locator('h1:has-text("Shop")')).toBeVisible();

    // Check breadcrumb
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    await expect(page.locator('text=Home')).toBeVisible();
    await expect(page.locator('text=Shop')).toBeVisible();

    // Check sidebar filters
    await expect(page.locator('text=Filter by')).toBeVisible();
    await expect(page.locator('text=Categories')).toBeVisible();
    await expect(page.locator('text=Brands')).toBeVisible();
    await expect(page.locator('text=Price')).toBeVisible();

    // Check sort options
    await expect(page.locator('text=Sort by')).toBeVisible();
    await expect(page.locator('button:has-text("Featured")')).toBeVisible();

    // Check product grid
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  test('should display products in grid view', async ({ page }) => {
    const productGrid = page.locator('[data-testid="product-grid"]');
    await expect(productGrid).toBeVisible();

    // Check product cards
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards.first()).toBeVisible();

    // Check product card elements
    const firstCard = productCards.first();
    await expect(firstCard.locator('img')).toBeVisible();
    await expect(firstCard.locator('h3')).toBeVisible();
    await expect(firstCard.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="product-rating"]')).toBeVisible();
    await expect(firstCard.locator('button:has-text("Add to Cart")')).toBeVisible();
  });

  test('should display products in list view', async ({ page }) => {
    // Switch to list view
    const listViewButton = page.locator('button[aria-label="List view"]');
    await listViewButton.click();

    // Check list view layout
    const productList = page.locator('[data-testid="product-list"]');
    await expect(productList).toBeVisible();

    const productItems = page.locator('[data-testid="product-item"]');
    await expect(productItems.first()).toBeVisible();

    // List view should show more details
    const firstItem = productItems.first();
    await expect(firstItem.locator('img')).toBeVisible();
    await expect(firstItem.locator('h3')).toBeVisible();
    await expect(firstItem.locator('[data-testid="product-description"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="product-specs"]')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Click electronics category
    const electronicsFilter = page.locator('label:has-text("Electronics")');
    await electronicsFilter.click();

    // Wait for URL update and product filter
    await page.waitForURL(/category=electronics/);
    
    // Check filtered products
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    // All visible products should be electronics
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=Electronics')).toBeVisible();
    }

    // Clear filter
    const clearFilter = page.locator('button:has-text("Clear")');
    await clearFilter.click();

    await page.waitForURL(url => !url.includes('category='));
  });

  test('should filter products by brand', async ({ page }) => {
    // Expand brands section
    const brandsSection = page.locator('text=Brands').first();
    await brandsSection.click();

    // Filter by a brand
    const brandFilter = page.locator('label:has-text("audio-tech")');
    await brandFilter.click();

    await page.waitForURL(/brand=audio-tech/);

    // Check only audio-tech products are shown
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=audio-tech')).toBeVisible();
    }
  });

  test('should filter products by price range', async ({ page }) => {
    // Set price range
    const minPriceInput = page.locator('input[name="minPrice"]');
    const maxPriceInput = page.locator('input[name="maxPrice"]');

    await minPriceInput.fill('5000');
    await maxPriceInput.fill('15000');

    // Apply price filter
    const applyButton = page.locator('button:has-text("Apply Price")');
    await applyButton.click();

    await page.waitForURL(/minPrice=5000&maxPrice=15000/);

    // Check products are within price range
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      
      expect(price).toBeGreaterThanOrEqual(5000);
      expect(price).toBeLessThanOrEqual(15000);
    }
  });

  test('should sort products by price low to high', async ({ page }) => {
    // Open sort dropdown
    const sortButton = page.locator('button:has-text("Featured")');
    await sortButton.click();

    // Select price low to high
    const lowToHighOption = page.locator('button:has-text("Price: Low to High")');
    await lowToHighOption.click();

    await page.waitForURL(/sortBy=price-low/);

    // Verify sorting
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    let previousPrice = 0;
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      
      if (i > 0) {
        expect(price).toBeGreaterThanOrEqual(previousPrice);
      }
      previousPrice = price;
    }
  });

  test('should sort products by price high to low', async ({ page }) => {
    // Open sort dropdown
    const sortButton = page.locator('button:has-text("Featured")');
    await sortButton.click();

    // Select price high to low
    const highToLowOption = page.locator('button:has-text("Price: High to Low")');
    await highToLowOption.click();

    await page.waitForURL(/sortBy=price-high/);

    // Verify sorting
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    let previousPrice = Infinity;
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      const priceText = await card.locator('[data-testid="product-price"]').textContent();
      const price = parseInt(priceText?.replace(/[^0-9]/g, '') || '0');
      
      if (i > 0) {
        expect(price).toBeLessThanOrEqual(previousPrice);
      }
      previousPrice = price;
    }
  });

  test('should sort products by newest', async ({ page }) => {
    // Open sort dropdown
    const sortButton = page.locator('button:has-text("Featured")');
    await sortButton.click();

    // Select newest
    const newestOption = page.locator('button:has-text("Newest")');
    await newestOption.click();

    await page.waitForURL(/sortBy=newest/);

    // Note: We can't easily test date sorting without knowing product dates
    // But we can verify the URL changed
    expect(page.url()).toContain('sortBy=newest');
  });

  test('should sort products by rating', async ({ page }) => {
    // Open sort dropdown
    const sortButton = page.locator('button:has-text("Featured")');
    await sortButton.click();

    // Select by rating
    const ratingOption = page.locator('button:has-text("Top Rated")');
    await ratingOption.click();

    await page.waitForURL(/sortBy=rating/);

    // Verify URL
    expect(page.url()).toContain('sortBy=rating');
  });

  test('should paginate products', async ({ page }) => {
    // Create more products for pagination test
    const manyProducts = await Promise.all(
      Array(30).fill(null).map((_, i) => 
        createTestProduct({
          name: `Pagination Product ${i + 1}`,
          slug: `pagination-product-${i + 1}`,
          price: 1000 + i * 100,
          category: 'test',
          brand: 'test',
        })
      )
    );

    await page.goto('/shop?limit=12');

    // Check pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();

    // Check page numbers
    const pageNumbers = pagination.locator('button[data-testid="page-number"]');
    await expect(pageNumbers.first()).toBeVisible();

    // Go to next page
    const nextButton = pagination.locator('button:has-text("Next")');
    await nextButton.click();

    await page.waitForURL(/page=2/);

    // Check we're on page 2
    const currentPage = pagination.locator('button[aria-current="page"]');
    await expect(currentPage).toHaveText('2');

    // Go to previous page
    const prevButton = pagination.locator('button:has-text("Previous")');
    await prevButton.click();

    await page.waitForURL(/page=1/);

    // Cleanup
    await Promise.all(manyProducts.map(p => cleanupTestProduct(p.id)));
  });

  test('should show product count and results', async ({ page }) => {
    const resultsText = page.locator('[data-testid="results-count"]');
    await expect(resultsText).toBeVisible();

    // Should show number of products
    const text = await resultsText.textContent();
    expect(text).toMatch(/\d+ products?/);
  });

  test('should display out of stock products correctly', async ({ page }) => {
    // Create out of stock product
    const outOfStockProduct = await createTestProduct({
      name: 'Out of Stock Test',
      slug: 'out-of-stock-test',
      price: 9999,
      category: 'test',
      brand: 'test',
      stock: 0,
    });

    await page.reload();

    // Find the out of stock product
    const outOfStockCard = page.locator(`[data-testid="product-card"]:has-text("${outOfStockProduct.name}")`);
    await expect(outOfStockCard).toBeVisible();

    // Should show out of stock badge
    await expect(outOfStockCard.locator('text=Out of stock')).toBeVisible();

    // Add to cart button should be disabled
    const addButton = outOfStockCard.locator('button:has-text("Add to Cart")');
    await expect(addButton).toBeDisabled();

    // Cleanup
    await cleanupTestProduct(outOfStockProduct.id);
  });

  test('should display on sale products with discount badge', async ({ page }) => {
    // Create product with discount
    const saleProduct = await createTestProduct({
      name: 'Sale Product',
      slug: 'sale-product',
      price: 7999,
      originalPrice: 12999,
      category: 'test',
      brand: 'test',
      stock: 10,
    });

    await page.reload();

    // Find the sale product
    const saleCard = page.locator(`[data-testid="product-card"]:has-text("${saleProduct.name}")`);
    await expect(saleCard).toBeVisible();

    // Should show discount badge
    await expect(saleCard.locator('text=Save')).toBeVisible();

    // Should show original price crossed out
    await expect(saleCard.locator('s')).toBeVisible();

    // Cleanup
    await cleanupTestProduct(saleProduct.id);
  });

  test('should handle empty search results', async ({ page }) => {
    // Search for non-existent product
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('nonexistentproductxyz123');
    await searchInput.press('Enter');

    await page.waitForURL(/q=nonexistentproductxyz123/);

    // Should show no results message
    await expect(page.locator('text=No products found')).toBeVisible();
    await expect(page.locator('text=Try different keywords')).toBeVisible();

    // Should show suggestions or categories
    await expect(page.locator('text=Popular Categories')).toBeVisible();
  });

  test('should maintain filters during navigation', async ({ page }) => {
    // Apply some filters
    const electronicsFilter = page.locator('label:has-text("Electronics")');
    await electronicsFilter.click();

    await page.waitForURL(/category=electronics/);

    // Navigate to a product
    const productLink = page.locator('[data-testid="product-card"] a').first();
    await productLink.click();

    // Go back to shop
    await page.goBack();

    // Filters should be preserved
    await expect(page).toHaveURL(/category=electronics/);
    await expect(electronicsFilter.locator('input[type="checkbox"]')).toBeChecked();
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    const electronicsFilter = page.locator('label:has-text("Electronics")');
    await electronicsFilter.click();

    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('5000');

    // Clear all filters
    const clearAllButton = page.locator('button:has-text("Clear all")');
    await clearAllButton.click();

    // URL should not have filter params
    await expect(page).not.toHaveURL(/category=|minPrice=/);

    // Checkboxes should be unchecked
    await expect(electronicsFilter.locator('input[type="checkbox"]')).not.toBeChecked();
    
    // Price inputs should be reset
    await expect(minPriceInput).toHaveValue('');
  });

  test('should display loading state during filter changes', async ({ page }) => {
    // Apply filter and check for loading indicator
    const electronicsFilter = page.locator('label:has-text("Electronics")');
    
    // Listen for network request
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/products') && response.status() === 200
      ),
      electronicsFilter.click(),
    ]);

    // Should show loading skeleton or spinner
    const loadingIndicator = page.locator('[data-testid="loading-indicator"], .skeleton');
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 });
    
    // Loading should disappear when done
    await expect(loadingIndicator.first()).not.toBeVisible({ timeout: 5000 });
  });

  test('should be accessible for keyboard navigation', async ({ page }) => {
    // Navigate through page with keyboard
    await page.keyboard.press('Tab');
    
    // Focus should go to skip link or first focusable element
    const firstProductCard = page.locator('[data-testid="product-card"]').first();
    const productLink = firstProductCard.locator('a').first();
    
    // Tab through product cards
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Check ARIA attributes
    const filterCheckboxes = page.locator('input[type="checkbox"]');
    const count = await filterCheckboxes.count();
    for (let i = 0; i < count; i++) {
      const checkbox = filterCheckboxes.nth(i);
      await expect(checkbox).toHaveAttribute('aria-label');
    }

    // Pagination should be accessible
    const paginationButtons = page.locator('[data-testid="pagination"] button');
    const paginationCount = await paginationButtons.count();
    for (let i = 0; i < paginationCount; i++) {
      const button = paginationButtons.nth(i);
      await expect(button).toHaveAttribute('aria-label');
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1:has-text("Shop")')).toBeVisible();
    
    // Filters might be in drawer on mobile
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await expect(page.locator('text=Categories')).toBeVisible();
    }

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1:has-text("Shop")')).toBeVisible();
    
    // Desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('h1:has-text("Shop")')).toBeVisible();
    
    // Sidebar should be visible on desktop
    await expect(page.locator('text=Filter by')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/products*', route => route.abort());

    await page.goto('/shop');

    // Should show error state
    await expect(page.locator('text=Failed to load products')).toBeVisible();
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();

    // Retry should work
    await page.route('**/api/products*', route => route.continue());
    await page.click('button:has-text("Try again")');

    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  test('should update URL when changing view mode', async ({ page }) => {
    // Check initial view (default is grid)
    const gridView = page.locator('[data-testid="product-grid"]');
    await expect(gridView).toBeVisible();

    // Switch to list view
    const listViewButton = page.locator('button[aria-label="List view"]');
    await listViewButton.click();

    // URL should update
    await page.waitForURL(/view=list/);
    await expect(page.locator('[data-testid="product-list"]')).toBeVisible();

    // Switch back to grid
    const gridViewButton = page.locator('button[aria-label="Grid view"]');
    await gridViewButton.click();

    await page.waitForURL(/view=grid/);
    await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
  });

  test('should display product quick view on hover', async ({ page }) => {
    // Hover over a product card
    const firstProductCard = page.locator('[data-testid="product-card"]').first();
    await firstProductCard.hover();

    // Should show quick actions
    await expect(firstProductCard.locator('button:has-text("Quick View")')).toBeVisible();
    await expect(firstProductCard.locator('button[aria-label="Add to wishlist"]')).toBeVisible();

    // Click quick view
    const quickViewButton = firstProductCard.locator('button:has-text("Quick View")');
    await quickViewButton.click();

    // Should show quick view modal
    const quickViewModal = page.locator('[data-testid="quick-view-modal"]');
    await expect(quickViewModal).toBeVisible();

    // Modal should have product details
    await expect(quickViewModal.locator('h3')).toBeVisible();
    await expect(quickViewModal.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(quickViewModal.locator('button:has-text("Add to Cart")')).toBeVisible();

    // Close modal
    const closeButton = quickViewModal.locator('button[aria-label="Close"]');
    await closeButton.click();
    await expect(quickViewModal).not.toBeVisible();
  });

  test('should add product to wishlist from shop page', async ({ page }) => {
    // Hover over product card
    const firstProductCard = page.locator('[data-testid="product-card"]').first();
    await firstProductCard.hover();

    // Click wishlist button
    const wishlistButton = firstProductCard.locator('button[aria-label*="wishlist"]');
    await wishlistButton.click();

    // Should show feedback
    await expect(page.locator('text=Added to wishlist')).toBeVisible();

    // Button should change state
    await expect(wishlistButton.locator('svg')).toHaveClass(/fill-red-600/);

    // Remove from wishlist
    await wishlistButton.click();
    await expect(page.locator('text=Removed from wishlist')).toBeVisible();
  });

  test('should compare products', async ({ page }) => {
    // Enable comparison mode
    const compareButton = page.locator('button:has-text("Compare")');
    await compareButton.click();

    // Select products to compare
    const productCards = page.locator('[data-testid="product-card"]');
    const compareCheckboxes = productCards.locator('input[type="checkbox"][aria-label*="Compare"]');
    
    // Select first two products
    await compareCheckboxes.nth(0).check();
    await compareCheckboxes.nth(1).check();

    // Should show comparison bar
    const comparisonBar = page.locator('[data-testid="comparison-bar"]');
    await expect(comparisonBar).toBeVisible();
    await expect(comparisonBar.locator('text=2 items selected')).toBeVisible();

    // View comparison
    const viewComparisonButton = comparisonBar.locator('button:has-text("Compare")');
    await viewComparisonButton.click();

    // Should show comparison page/modal
    await expect(page.locator('text=Product Comparison')).toBeVisible();
  });
});
