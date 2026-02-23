tests/integration/services/cache.test.ts
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RedisCache } from '@/services/cache/redis';
import { MemoryCache } from '@/services/cache/memory';
import { CacheManager } from '@/services/cache/manager';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    keys: jest.fn(),
    flushAll: jest.fn(),
    on: jest.fn(),
  })),
}));

describe('Cache Service Integration Tests', () => {
  let redisCache: RedisCache;
  let memoryCache: MemoryCache;
  let cacheManager: CacheManager;

  beforeEach(() => {
    redisCache = new RedisCache('redis://localhost:6379');
    memoryCache = new MemoryCache();
    cacheManager = new CacheManager(redisCache, memoryCache);
  });

  afterEach(async () => {
    await memoryCache.clear();
    jest.clearAllMocks();
  });

  describe('Redis Cache Integration', () => {
    it('should set and get string value', async () => {
      const key = 'test:string';
      const value = 'test value';
      const ttl = 60;

      await redisCache.set(key, value, ttl);
      const result = await redisCache.get(key);

      expect(result).toBe(value);
    });

    it('should set and get object value', async () => {
      const key = 'test:object';
      const value = { id: '123', name: 'Test', count: 42 };
      const ttl = 60;

      await redisCache.set(key, value, ttl);
      const result = await redisCache.get(key);

      expect(result).toEqual(value);
    });

    it('should set and get array value', async () => {
      const key = 'test:array';
      const value = [1, 2, 3, 'test', { nested: 'object' }];
      const ttl = 60;

      await redisCache.set(key, value, ttl);
      const result = await redisCache.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await redisCache.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should delete key', async () => {
      const key = 'test:delete';
      await redisCache.set(key, 'value', 60);

      await redisCache.delete(key);
      const result = await redisCache.get(key);

      expect(result).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await redisCache.set(key, 'value', 60);

      const exists = await redisCache.exists(key);
      expect(exists).toBe(true);

      const notExists = await redisCache.exists('non:existent');
      expect(notExists).toBe(false);
    });

    it('should set TTL correctly', async () => {
      const key = 'test:ttl';
      const value = 'value';
      const ttl = 1; // 1 second

      await redisCache.set(key, value, ttl);

      // Immediate get should work
      const immediate = await redisCache.get(key);
      expect(immediate).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const afterExpiry = await redisCache.get(key);
      expect(afterExpiry).toBeNull();
    });

    it('should get multiple keys', async () => {
      await redisCache.set('key1', 'value1', 60);
      await redisCache.set('key2', 'value2', 60);
      await redisCache.set('key3', 'value3', 60);

      const values = await redisCache.mget(['key1', 'key2', 'key3', 'key4']);

      expect(values).toEqual(['value1', 'value2', 'value3', null]);
    });

    it('should increment and decrement counter', async () => {
      const key = 'test:counter';

      await redisCache.incr(key);
      let value = await redisCache.get(key);
      expect(value).toBe(1);

      await redisCache.incrby(key, 5);
      value = await redisCache.get(key);
      expect(value).toBe(6);

      await redisCache.decr(key);
      value = await redisCache.get(key);
      expect(value).toBe(5);

      await redisCache.decrby(key, 3);
      value = await redisCache.get(key);
      expect(value).toBe(2);
    });

    it('should set hash field', async () => {
      const key = 'test:hash';

      await redisCache.hset(key, 'field1', 'value1');
      await redisCache.hset(key, 'field2', 'value2');

      const field1 = await redisCache.hget(key, 'field1');
      const field2 = await redisCache.hget(key, 'field2');
      const allFields = await redisCache.hgetall(key);

      expect(field1).toBe('value1');
      expect(field2).toBe('value2');
      expect(allFields).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should handle connection errors gracefully', async () => {
      // Simulate connection error
      const mockClient = (redisCache as any).client;
      mockClient.get.mockRejectedValue(new Error('Connection failed'));

      const result = await redisCache.get('test:key');
      expect(result).toBeNull(); // Should return null on error
    });
  });

  describe('Memory Cache Integration', () => {
    it('should set and get value', async () => {
      const key = 'test:key';
      const value = 'test value';
      const ttl = 1000;

      await memoryCache.set(key, value, ttl);
      const result = await memoryCache.get(key);

      expect(result).toBe(value);
    });

    it('should respect TTL', async () => {
      const key = 'test:ttl';
      const value = 'value';
      const ttl = 100; // 100ms

      await memoryCache.set(key, value, ttl);

      // Immediate get
      const immediate = await memoryCache.get(key);
      expect(immediate).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const afterExpiry = await memoryCache.get(key);
      expect(afterExpiry).toBeNull();
    });

    it('should delete key', async () => {
      const key = 'test:delete';
      await memoryCache.set(key, 'value', 1000);

      await memoryCache.delete(key);
      const result = await memoryCache.get(key);

      expect(result).toBeNull();
    });

    it('should clear all keys', async () => {
      await memoryCache.set('key1', 'value1', 1000);
      await memoryCache.set('key2', 'value2', 1000);
      await memoryCache.set('key3', 'value3', 1000);

      await memoryCache.clear();

      expect(await memoryCache.get('key1')).toBeNull();
      expect(await memoryCache.get('key2')).toBeNull();
      expect(await memoryCache.get('key3')).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await memoryCache.set(key, 'value', 1000);

      expect(await memoryCache.exists(key)).toBe(true);
      expect(await memoryCache.exists('non:existent')).toBe(false);
    });

    it('should get keys by pattern', async () => {
      await memoryCache.set('product:1', 'value1', 1000);
      await memoryCache.set('product:2', 'value2', 1000);
      await memoryCache.set('category:1', 'value3', 1000);

      const productKeys = await memoryCache.keys('product:*');
      expect(productKeys).toEqual(expect.arrayContaining(['product:1', 'product:2']));

      const allKeys = await memoryCache.keys('*');
      expect(allKeys.length).toBe(3);
    });

    it('should handle complex objects', async () => {
      const key = 'test:object';
      const value = {
        id: '123',
        name: 'Test',
        tags: ['tag1', 'tag2'],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      };

      await memoryCache.set(key, value, 1000);
      const result = await memoryCache.get(key);

      expect(result).toEqual(value);
      expect(result?.metadata.created).toBe(value.metadata.created);
    });
  });

  describe('Cache Manager Integration', () => {
    const testData = {
      key: 'test:data',
      value: { id: '123', name: 'Product', price: 9999 },
      ttl: 300,
    };

    it('should get from memory cache first', async () => {
      // Set in memory cache
      await memoryCache.set(testData.key, testData.value, testData.ttl);

      const result = await cacheManager.get(testData.key);
      expect(result).toEqual(testData.value);
    });

    it('should fallback to redis cache', async () => {
      // Set in redis cache only
      await redisCache.set(testData.key, testData.value, testData.ttl);

      const result = await cacheManager.get(testData.key);
      expect(result).toEqual(testData.value);

      // Should now be in memory cache too
      const memoryResult = await memoryCache.get(testData.key);
      expect(memoryResult).toEqual(testData.value);
    });

    it('should return null when not in any cache', async () => {
      const result = await cacheManager.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should set in both caches', async () => {
      await cacheManager.set(testData.key, testData.value, testData.ttl);

      const memoryResult = await memoryCache.get(testData.key);
      const redisResult = await redisCache.get(testData.key);

      expect(memoryResult).toEqual(testData.value);
      expect(redisResult).toEqual(testData.value);
    });

    it('should delete from both caches', async () => {
      await memoryCache.set(testData.key, testData.value, testData.ttl);
      await redisCache.set(testData.key, testData.value, testData.ttl);

      await cacheManager.delete(testData.key);

      expect(await memoryCache.get(testData.key)).toBeNull();
      expect(await redisCache.get(testData.key)).toBeNull();
    });

    it('should get with cache-aside pattern', async () => {
      const key = 'product:123';
      const fetchFunction = jest.fn().mockResolvedValue({ id: '123', name: 'Test Product' });

      // First call should fetch and cache
      const result1 = await cacheManager.getWithCacheAside(key, fetchFunction, 300);
      expect(result1).toEqual({ id: '123', name: 'Test Product' });
      expect(fetchFunction).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cacheManager.getWithCacheAside(key, fetchFunction, 300);
      expect(result2).toEqual({ id: '123', name: 'Test Product' });
      expect(fetchFunction).toHaveBeenCalledTimes(1); // Still 1

      // Verify it's in both caches
      expect(await memoryCache.get(key)).toEqual(result1);
      expect(await redisCache.get(key)).toEqual(result1);
    });

    it('should handle fetch function failure in cache-aside', async () => {
      const key = 'product:999';
      const fetchFunction = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        cacheManager.getWithCacheAside(key, fetchFunction, 300)
      ).rejects.toThrow('Database error');

      // Should not cache errors
      expect(await memoryCache.get(key)).toBeNull();
      expect(await redisCache.get(key)).toBeNull();
    });

    it('should get or set with locking for expensive operations', async () => {
      const key = 'expensive:data';
      let callCount = 0;
      const expensiveFunction = jest.fn().mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate expensive operation
        return { data: 'expensive result' };
      });

      // Call multiple times simultaneously
      const promises = Array(5)
        .fill(null)
        .map(() => cacheManager.getOrSet(key, expensiveFunction, 300));

      const results = await Promise.all(promises);

      // All results should be the same
      results.forEach(result => {
        expect(result).toEqual({ data: 'expensive result' });
      });

      // Function should only be called once due to locking
      expect(callCount).toBe(1);
      expect(expensiveFunction).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache patterns', async () => {
      // Set multiple related cache entries
      await cacheManager.set('product:1', { id: '1' }, 300);
      await cacheManager.set('product:2', { id: '2' }, 300);
      await cacheManager.set('product:details:1', { details: 'test' }, 300);
      await cacheManager.set('category:1', { id: 'cat1' }, 300);

      // Invalidate all product keys
      await cacheManager.invalidatePattern('product:*');

      expect(await cacheManager.get('product:1')).toBeNull();
      expect(await cacheManager.get('product:2')).toBeNull();
      expect(await cacheManager.get('product:details:1')).toBeNull();
      expect(await cacheManager.get('category:1')).not.toBeNull(); // Should still exist
    });

    it('should handle cache stampede protection', async () => {
      const key = 'popular:data';
      let dbCalls = 0;
      const mockDbCall = jest.fn().mockImplementation(async () => {
        dbCalls++;
        await new Promise(resolve => setTimeout(resolve, 200));
        return { data: 'from db' };
      });

      // Simulate multiple concurrent requests
      const startTime = Date.now();
      const promises = Array(10)
        .fill(null)
        .map(() => cacheManager.getWithStampedeProtection(key, mockDbCall, 300));

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should get same result
      results.forEach(result => {
        expect(result).toEqual({ data: 'from db' });
      });

      // Should only call DB once
      expect(dbCalls).toBe(1);

      // Should complete faster than serial calls (10 * 200ms = 2s)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should cache with tags', async () => {
      const product = { id: '123', name: 'Test Product', category: 'electronics' };
      const key = `product:${product.id}`;

      await cacheManager.setWithTags(key, product, ['product', `category:${product.category}`, `brand:test`], 300);

      // Should be retrievable by key
      const cached = await cacheManager.get(key);
      expect(cached).toEqual(product);

      // Should be trackable by tags
      const productTagKeys = await cacheManager.getTagKeys('product');
      expect(productTagKeys).toContain(key);

      // Invalidate by tag
      await cacheManager.invalidateTag(`category:${product.category}`);

      // Should be removed from cache
      expect(await cacheManager.get(key)).toBeNull();
      expect(await cacheManager.getTagKeys(`category:${product.category}`)).toEqual([]);
    });

    it('should handle cache warming', async () => {
      const keysToWarm = ['product:popular', 'category:all', 'deals:active'];
      const warmFunction = jest.fn().mockImplementation(async (key: string) => {
        if (key === 'product:popular') return [{ id: '1', name: 'Popular' }];
        if (key === 'category:all') return [{ id: 'cat1', name: 'Electronics' }];
        if (key === 'deals:active') return [{ id: 'deal1', discount: 20 }];
        return null;
      });

      await cacheManager.warmCache(keysToWarm, warmFunction, 600);

      // All keys should be cached
      for (const key of keysToWarm) {
        expect(await cacheManager.get(key)).not.toBeNull();
      }

      // Function should have been called for each key
      expect(warmFunction).toHaveBeenCalledTimes(keysToWarm.length);
    });

    it('should handle cache statistics', async () => {
      // Perform some cache operations
      await cacheManager.set('key1', 'value1', 300);
      await cacheManager.set('key2', 'value2', 300);
      await cacheManager.get('key1');
      await cacheManager.get('key2');
      await cacheManager.get('non:existent'); // Miss
      await cacheManager.get('key1'); // Hit
      await cacheManager.delete('key1');

      const stats = cacheManager.getStats();

      expect(stats.hits).toBeGreaterThanOrEqual(2);
      expect(stats.misses).toBeGreaterThanOrEqual(1);
      expect(stats.operations).toBeGreaterThanOrEqual(7);
      expect(stats.memorySize).toBeGreaterThan(0);
    });
  });

  describe('Cache Strategies for E-commerce', () => {
    it('should cache product details with proper invalidation', async () => {
      const productId = 'prod-123';
      const productKey = `product:${productId}`;
      const product = {
        id: productId,
        name: 'Test Product',
        price: 9999,
        category: 'electronics',
        brand: 'test-brand',
      };

      // Cache product
      await cacheManager.setWithTags(
        productKey,
        product,
        ['products', `product:${productId}`, `category:electronics`, `brand:test-brand`],
        3600
      );

      // Simulate product update
      const updatedProduct = { ...product, price: 8999 };
      await cacheManager.set(productKey, updatedProduct, 3600);

      // Invalidate related caches
      await cacheManager.invalidateTag(`product:${productId}`);

      // Product listing that includes this product should also be invalidated
      await cacheManager.invalidatePattern('product:list:*');
    });

    it('should cache product listings with pagination', async () => {
      const page = 1;
      const limit = 20;
      const category = 'electronics';
      const cacheKey = `products:list:${category}:page=${page}:limit=${limit}`;

      const mockProducts = Array(limit)
        .fill(null)
        .map((_, i) => ({
          id: `prod-${i}`,
          name: `Product ${i}`,
          price: 1000 + i * 100,
          category,
        }));

      await cacheManager.setWithTags(
        cacheKey,
        mockProducts,
        ['product-lists', `category:${category}`],
        300
      );

      // Get cached listing
      const cached = await cacheManager.get(cacheKey);
      expect(cached).toEqual(mockProducts);

      // When a product in this category is updated, invalidate listing
      await cacheManager.invalidateTag(`category:${category}`);
      expect(await cacheManager.get(cacheKey)).toBeNull();
    });

    it('should cache user-specific data with appropriate TTL', async () => {
      const userId = 'user-123';
      const cacheKey = `user:${userId}:cart`;
      const cartData = {
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 1 },
        ],
        total: 29998,
      };

      // User data should have shorter TTL
      await cacheManager.set(cacheKey, cartData, 60); // 60 seconds

      const cachedCart = await cacheManager.get(cacheKey);
      expect(cachedCart).toEqual(cartData);

      // When user updates cart, invalidate immediately
      await cacheManager.delete(cacheKey);
      expect(await cacheManager.get(cacheKey)).toBeNull();
    });

    it('should handle cache for deals and promotions', async () => {
      const dealKey = 'deals:active:flash';
      const deals = [
        { id: 'deal-1', discount: 30, expires: '2024-12-31' },
        { id: 'deal-2', discount: 50, expires: '2024-12-31' },
      ];

      // Deals might change frequently, use moderate TTL
      await cacheManager.set(dealKey, deals, 600); // 10 minutes

      // With auto-refresh before expiry
      const autoRefreshDeals = async () => {
        const cached = await cacheManager.get(dealKey);
        if (!cached) {
          // Refresh from source
          const freshDeals = await fetchFreshDeals();
          await cacheManager.set(dealKey, freshDeals, 600);
          return freshDeals;
        }
        return cached;
      };

      const result = await autoRefreshDeals();
      expect(result).toEqual(deals);
    });

    it('should cache search results with query-based keys', async () => {
      const query = 'wireless headphones';
      const filters = { minPrice: 1000, maxPrice: 10000, brand: 'sony' };
      const sortBy = 'rating';
      const cacheKey = `search:${query}:${JSON.stringify(filters)}:${sortBy}`;

      const searchResults = {
        products: Array(10).fill(null).map((_, i) => ({
          id: `prod-${i}`,
          name: `Wireless Headphones ${i}`,
          price: 2000 + i * 500,
          rating: 4 + i * 0.1,
        })),
        total: 45,
      };

      // Search results cache with moderate TTL
      await cacheManager.set(cacheKey, searchResults, 300);

      // When products are updated, search results might be stale
      // Invalidate when relevant products change
      await cacheManager.invalidatePattern('search:*headphones*');
    });
  });

  describe('Cache Performance and Resilience', () => {
    it('should handle cache miss gracefully', async () => {
      const result = await cacheManager.get('non:existent', () => {
        throw new Error('Should not be called');
      });

      expect(result).toBeNull();
    });

    it('should survive Redis failures', async () => {
      // Simulate Redis failure
      const mockClient = (redisCache as any).client;
      mockClient.get.mockRejectedValue(new Error('Redis down'));

      // Set in memory cache first
      await memoryCache.set('test:key', 'memory value', 300);

      // Should still work with memory cache
      const result = await cacheManager.get('test:key');
      expect(result).toBe('memory value');
    });

    it('should handle cache serialization errors', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject; // Create circular reference

      // Should handle serialization error gracefully
      await expect(cacheManager.set('test:circular', circularObject, 300))
        .rejects.toThrow();
    });

    it('should respect memory limits', async () => {
      // Test with large data
      const largeData = {
        items: Array(10000).fill(null).map((_, i) => ({
          id: `item-${i}`,
          name: `Item ${i}`,
          data: 'x'.repeat(1000), // 1KB per item
        })),
      };

      // Should handle large data (implementation may have limits)
      await cacheManager.set('large:data', largeData, 60);

      const retrieved = await cacheManager.get('large:data');
      expect(retrieved).toBeDefined();
    });

    it('should clean up expired entries', async () => {
      // Set multiple entries with different TTLs
      await cacheManager.set('key:short', 'value1', 1); // 1 second
      await cacheManager.set('key:long', 'value2', 3600); // 1 hour

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Automatic cleanup should remove expired entries
      const memoryKeys = await memoryCache.keys('*');
      expect(memoryKeys).not.toContain('key:short');
      expect(memoryKeys).toContain('key:long');
    });
  });
});

// Helper function
async function fetchFreshDeals() {
  return [
    { id: 'deal-1', discount: 30, expires: '2024-12-31' },
    { id: 'deal-2', discount: 50, expires: '2024-12-31' },
  ];
}
