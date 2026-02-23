import { test, expect } from '@playwright/test';
import { createTestProduct, cleanupTestProduct } from '../helpers/products';

test.describe('Shop - Search Functionality', () => {
  let testProducts: Array<{ id: string; name: string; slug: string }> = [];

  test.beforeAll(async () => {
    // Create diverse test products
    testProducts = await Promise.all([
      createTestProduct({
        name: 'Apple iPhone 14 Pro Max',
        slug: 'apple-iphone-14-pro-max',
        description: 'Latest iPhone with advanced camera system',
        price: 189999,
        category: 'electronics',
        brand: 'apple',
        tags: ['smartphone', 'apple', 'ios', 'premium'],
      }),
      createTestProduct({
        name: 'Samsung Galaxy S23 Ultra',
        slug: 'samsung-galaxy-s23-ultra',
        description: 'Android flagship with S Pen',
        price: 159999,
        category: 'electronics',
        brand: 'samsung',
        tags: ['smartphone', 'android', 'samsung', 'flagship'],
      }),
      createTestProduct({
        name: 'Wireless Bluetooth Headphones',
        slug: 'wireless-bluetooth-headphones',
        description: 'Noise cancelling over-ear headphones',
        price: 12999,
        category: 'electronics',
        brand: 'sony',
        tags: ['headphones', 'wireless', 'bluetooth', 'audio'],
      }),
      createTestProduct({
        name: 'Men\'s Running Shoes',
        slug: 'mens-running-shoes',
        description: 'Lightweight running shoes for men',
        price: 8999,
        category: 'fashion',
        brand: 'nike',
        tags: ['shoes', 'running', 'sports', 'men'],
      }),
    ]);
  });

  test.afterAll(async () => {
    // Cleanup test products
    await Promise.all(testProducts.map(p => cleanupTestProduct(p.id)));
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display search bar in header', async ({ page }) => {
    // Check search bar is visible
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('aria-label', 'Search');
  });

  test('should show search suggestions as user types', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Start typing
    await searchInput.fill('iphone');
    
    // Should show suggestions dropdown
    const suggestionsDropdown = page.locator('[data-testid="search-suggestions"]');
    await expect(suggestionsDropdown).toBeVisible();
    
    // Should show matching products
    await expect(suggestionsDropdown.locator('text=iPhone')).toBeVisible();
    
    // Should show categories
    await expect(suggestionsDropdown.locator('text=Electronics')).toBeVisible();
    
    // Clear search
    await searchInput.fill('');
    await expect(suggestionsDropdown).not.toBeVisible();
  });

  test('should search for products by name', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search for iPhone
    await searchInput.fill('iPhone');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=iPhone/);
    
    // Should show search results
    await expect(page.locator('text=Search results for "iPhone"')).toBeVisible();
    
    // Should include the iPhone product
    await expect(page.locator('text=Apple iPhone 14 Pro Max')).toBeVisible();
    
    // Should show result count
    const resultCount = page.locator('[data-testid="results-count"]');
    await expect(resultCount).toBeVisible();
  });

  test('should search for products by brand', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search by brand
    await searchInput.fill('Samsung');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=Samsung/);
    
    // Should show Samsung products
    await expect(page.locator('text=Samsung Galaxy S23 Ultra')).toBeVisible();
    
    // Should not show other brands
    await expect(page.locator('text=Apple iPhone')).not.toBeVisible();
  });

  test('should search for products by category keyword', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search by category
    await searchInput.fill('headphones');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=headphones/);
    
    // Should show headphones
    await expect(page.locator('text=Wireless Bluetooth Headphones')).toBeVisible();
  });

  test('should handle search with special characters', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Test with apostrophe
    await searchInput.fill('Men\'s');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=Men's/);
    
    // Should show men's products
    await expect(page.locator('text=Men\'s Running Shoes')).toBeVisible();
  });

  test('should handle search with typos using fuzzy matching', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search with typo
    await searchInput.fill('Iphone'); // Missing capital
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=Iphone/);
    
    // Should still show iPhone (fuzzy matching)
    await expect(page.locator('text=Apple iPhone 14 Pro Max')).toBeVisible();
  });

  test('should show no results for non-existent search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search for non-existent product
    await searchInput.fill('nonexistentproductxyz123');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=nonexistentproductxyz123/);
    
    // Should show no results message
    await expect(page.locator('text=No products found')).toBeVisible();
    await expect(page.locator('text=Try different keywords')).toBeVisible();
    
    // Should show suggestions
    await expect(page.locator('text=Popular Categories')).toBeVisible();
    await expect(page.locator('text=Trending Searches')).toBeVisible();
  });

  test('should clear search with clear button', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Enter search
    await searchInput.fill('test search');
    
    // Should show clear button
    const clearButton = page.locator('button[aria-label="Clear search"]');
    await expect(clearButton).toBeVisible();
    
    // Clear search
    await clearButton.click();
    await expect(searchInput).toHaveValue('');
    
    // Clear button should disappear
    await expect(clearButton).not.toBeVisible();
  });

  test('should show recent searches', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // First, make some searches
    await searchInput.fill('iPhone');
    await searchInput.press('Enter');
    await page.waitForURL(/q=iPhone/);
    
    // Go back to home
    await page.goto('/');
    
    // Click search input
    await searchInput.click();
    
    // Should show recent searches
    const recentSearches = page.locator('text=Recent Searches');
    await expect(recentSearches).toBeVisible();
    
    // Should include iPhone
    await expect(page.locator('text=iPhone')).toBeVisible();
  });

  test('should show trending searches', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Click search input
    await searchInput.click();
    
    // Should show trending searches
    const trendingSearches = page.locator('text=Trending Now');
    await expect(trendingSearches).toBeVisible();
    
    // Should show popular search terms
    await expect(page.locator('text=Smartphone')).toBeVisible();
    await expect(page.locator('text=Laptop')).toBeVisible();
  });

  test('should search from suggestions dropdown', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Start typing
    await searchInput.fill('sams');
    
    // Wait for suggestions
    await expect(page.locator('text=Samsung')).toBeVisible();
    
    // Click suggestion
    await page.click('text=Samsung Galaxy S23 Ultra');
    
    // Should navigate to product page
    await expect(page).toHaveURL(/samsung-galaxy-s23-ultra/);
    await expect(page.locator('h1:has-text("Samsung Galaxy S23 Ultra")')).toBeVisible();
  });

  test('should search with filters applied', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // First apply price filter
    await page.goto('/shop');
    const minPriceInput = page.locator('input[name="minPrice"]');
    await minPriceInput.fill('100000');
    
    // Then search
    await searchInput.fill('phone');
    await searchInput.press('Enter');
    
    // Should search within filtered results
    await page.waitForURL(/q=phone/);
    
    // Only expensive phones should appear
    await expect(page.locator('text=Apple iPhone 14 Pro Max')).toBeVisible(); // 189,999
    await expect(page.locator('text=Samsung Galaxy S23 Ultra')).toBeVisible(); // 159,999
    
    // Should not show cheap products
    await expect(page.locator('text=Wireless Bluetooth Headphones')).not.toBeVisible(); // 12,999
  });

  test('should maintain search query during navigation', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search for something
    await searchInput.fill('electronics');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=electronics/);
    
    // Navigate to a product
    const productLink = page.locator('[data-testid="product-card"] a').first();
    await productLink.click();
    
    // Go back
    await page.goBack();
    
    // Search query should be preserved
    await expect(page).toHaveURL(/q=electronics/);
    await expect(searchInput).toHaveValue('electronics');
  });

  test('should handle empty search query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Try to search with empty query
    await searchInput.fill('');
    await searchInput.press('Enter');
    
    // Should not change URL or show search results page
    expect(page.url()).not.toContain('q=');
    
    // If on search page, should show all products
    if (page.url().includes('/search')) {
      await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
    }
  });

  test('should search with multiple keywords', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search with multiple words
    await searchInput.fill('wireless bluetooth headphones');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=wireless\+bluetooth\+headphones/);
    
    // Should show relevant products
    await expect(page.locator('text=Wireless Bluetooth Headphones')).toBeVisible();
  });

  test('should handle search with plus signs and special encoding', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search with plus sign (should be encoded)
    await searchInput.fill('S23+');
    await searchInput.press('Enter');
    
    // Should handle plus sign correctly
    await expect(page.locator('text=Samsung Galaxy S23 Ultra')).toBeVisible();
  });

  test('should show search results with images and prices', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('iPhone');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=iPhone/);
    
    // Check result items have all necessary elements
    const resultItems = page.locator('[data-testid="product-card"]');
    const firstItem = resultItems.first();
    
    await expect(firstItem.locator('img')).toBeVisible();
    await expect(firstItem.locator('h3')).toBeVisible();
    await expect(firstItem.locator('[data-testid="product-price"]')).toBeVisible();
    await expect(firstItem.locator('[data-testid="product-rating"]')).toBeVisible();
    await expect(firstItem.locator('button:has-text("Add to Cart")')).toBeVisible();
  });

  test('should sort search results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('phone');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=phone/);
    
    // Sort by price low to high
    const sortButton = page.locator('button:has-text("Featured")');
    await sortButton.click();
    
    const lowToHighOption = page.locator('button:has-text("Price: Low to High")');
    await lowToHighOption.click();
    
    await page.waitForURL(/sortBy=price-low/);
    
    // Verify sorting
    const prices = await page.locator('[data-testid="product-price"]').allTextContents();
    const priceValues = prices.map(p => parseInt(p.replace(/[^0-9]/g, '')));
    
    for (let i = 1; i < priceValues.length; i++) {
      expect(priceValues[i]).toBeGreaterThanOrEqual(priceValues[i - 1]);
    }
  });

  test('should filter search results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('electronics');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=electronics/);
    
    // Apply brand filter
    const samsungFilter = page.locator('label:has-text("samsung")');
    await samsungFilter.click();
    
    await page.waitForURL(/brand=samsung/);
    
    // Should only show Samsung electronics
    const productCards = page.locator('[data-testid="product-card"]');
    const count = await productCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = productCards.nth(i);
      await expect(card.locator('text=samsung')).toBeVisible();
    }
  });

  test('should show search autocomplete with product images', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type slowly to trigger autocomplete
    await searchInput.fill('iP');
    
    // Wait for autocomplete
    const autocomplete = page.locator('[data-testid="search-autocomplete"]');
    await expect(autocomplete).toBeVisible();
    
    // Should show product with image
    const suggestionItem = autocomplete.locator('div').first();
    await expect(suggestionItem.locator('img')).toBeVisible();
    await expect(suggestionItem.locator('text=iPhone')).toBeVisible();
    await expect(suggestionItem.locator('text=KES')).toBeVisible();
  });

  test('should handle search with diacritics and special characters', async ({ page }) => {
    // Create product with special characters
    const specialProduct = await createTestProduct({
      name: 'Café Style Coffee Maker',
      slug: 'cafe-style-coffee-maker',
      description: 'Coffee maker with European style',
      price: 14999,
      category: 'home',
      brand: 'kitchen',
    });
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search with and without diacritics
    await searchInput.fill('cafe');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=cafe/);
    
    // Should find the product
    await expect(page.locator('text=Café Style Coffee Maker')).toBeVisible();
    
    // Cleanup
    await cleanupTestProduct(specialProduct.id);
  });

  test('should show search history in correct order', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Make multiple searches
    const searches = ['iPhone', 'Samsung', 'Headphones'];
    
    for (const query of searches) {
      await searchInput.fill(query);
      await searchInput.press('Enter');
      await page.waitForURL(new RegExp(`q=${query}`));
      await page.goto('/');
    }
    
    // Click search input
    await searchInput.click();
    
    // Recent searches should be in reverse chronological order
    const recentSearchItems = page.locator('[data-testid="recent-search-item"]');
    const count = await recentSearchItems.count();
    
    for (let i = 0; i < count; i++) {
      const text = await recentSearchItems.nth(i).textContent();
      // Most recent first (Headphones)
      if (i === 0) expect(text).toContain('Headphones');
      if (i === 1) expect(text).toContain('Samsung');
      if (i === 2) expect(text).toContain('iPhone');
    }
  });

  test('should clear search history', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Make a search
    await searchInput.fill('test');
    await searchInput.press('Enter');
    await page.goto('/');
    
    // Click search input to show history
    await searchInput.click();
    
    // Clear history
    const clearHistoryButton = page.locator('button:has-text("Clear history")');
    await clearHistoryButton.click();
    
    // History should be cleared
    await expect(page.locator('text=Recent Searches')).not.toBeVisible();
  });

  test('should handle voice search if supported', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Check for voice search button
    const voiceSearchButton = page.locator('button[aria-label*="voice"]');
    
    if (await voiceSearchButton.isVisible()) {
      await voiceSearchButton.click();
      
      // Should show voice search UI
      await expect(page.locator('text=Speak now')).toBeVisible();
      
      // Cancel voice search
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
    }
  });

  test('should show search results with pagination', async ({ page }) => {
    // Create many products for pagination test
    const manyProducts = await Promise.all(
      Array(25).fill(null).map((_, i) => 
        createTestProduct({
          name: `Search Test Product ${i + 1}`,
          slug: `search-test-product-${i + 1}`,
          description: `Test product ${i + 1} for search pagination`,
          price: 1000 + i * 100,
          category: 'test',
          brand: 'test',
        })
      )
    );
    
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    await searchInput.fill('Search Test');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=Search\+Test/);
    
    // Check pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();
    
    // Go to page 2
    const page2Button = pagination.locator('button:has-text("2")');
    await page2Button.click();
    
    await page.waitForURL(/page=2/);
    
    // Should show different products
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards.first()).toBeVisible();
    
    // Cleanup
    await Promise.all(manyProducts.map(p => cleanupTestProduct(p.id)));
  });

  test('should show search loading state', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Mock slow search response
    await page.route('**/api/products*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await searchInput.fill('test');
    await searchInput.press('Enter');
    
    // Should show loading indicator
    const loadingIndicator = page.locator('[data-testid="search-loading"]');
    await expect(loadingIndicator).toBeVisible();
    
    // Loading should disappear when results load
    await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle search API errors gracefully', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Mock API error
    await page.route('**/api/products*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Search failed' }),
      });
    });
    
    await searchInput.fill('error test');
    await searchInput.press('Enter');
    
    // Should show error message
    await expect(page.locator('text=Search failed')).toBeVisible();
    await expect(page.locator('button:has-text("Try again")')).toBeVisible();
  });

  test('should be accessible for screen readers', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Check ARIA attributes
    await expect(searchInput).toHaveAttribute('aria-label', 'Search');
    await expect(searchInput).toHaveAttribute('role', 'searchbox');
    
    // Check search button
    const searchButton = page.locator('button[aria-label="Search"]');
    if (await searchButton.isVisible()) {
      await expect(searchButton).toHaveAttribute('type', 'button');
    }
    
    // Check live region for search results
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
  });

  test('should maintain search context during session', async ({ page, context }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Search for something
    await searchInput.fill('session test');
    await searchInput.press('Enter');
    
    await page.waitForURL(/q=session\+test/);
    
    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('/');
    
    // Search input in new tab should be empty
    const newSearchInput = newPage.locator('input[placeholder*="Search"]');
    await expect(newSearchInput).toHaveValue('');
    
    // But original page should still have search
    await page.bringToFront();
    await expect(searchInput).toHaveValue('session test');
  });
});
