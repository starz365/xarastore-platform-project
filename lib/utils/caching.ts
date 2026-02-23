import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: {
      key: string;
      value: any;
      expiresAt: number;
      createdAt: number;
      tags: string[];
    };
    indexes: {
      'by-expiresAt': number;
      'by-tag': string[];
    };
  };
}

class CacheService {
  private db: IDBPDatabase<CacheDB> | null = null;
  private readonly DEFAULT_TTL = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000; // Max 1000 items

  async initialize(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported, caching disabled');
      return;
    }

    try {
      this.db = await openDB<CacheDB>('xarastore-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            const store = db.createObjectStore('cache', { keyPath: 'key' });
            store.createIndex('by-expiresAt', 'expiresAt');
            store.createIndex('by-tag', 'tags', { multiEntry: true });
          }
        },
      });

      // Clean up expired items on initialization
      await this.cleanup();
    } catch (error) {
      console.error('Failed to initialize cache:', error);
    }
  }

  async set(
    key: string,
    value: any,
    options: {
      ttl?: number;
      tags?: string[];
      skipSerialization?: boolean;
    } = {}
  ): Promise<void> {
    if (!this.db) return;

    try {
      const now = Date.now();
      const ttl = options.ttl || this.DEFAULT_TTL;
      const serializedValue = options.skipSerialization ? value : JSON.stringify(value);

      const cacheItem = {
        key,
        value: serializedValue,
        expiresAt: now + ttl,
        createdAt: now,
        tags: options.tags || [],
      };

      await this.db.put('cache', cacheItem);

      // Clean up if cache is too large
      const count = await this.db.count('cache');
      if (count > this.MAX_CACHE_SIZE) {
        await this.evictOldest();
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.db) return null;

    try {
      const item = await this.db.get('cache', key);
      
      if (!item) return null;
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        await this.db.delete('cache', key);
        return null;
      }

      try {
        return typeof item.value === 'string' 
          ? JSON.parse(item.value) 
          : item.value;
      } catch {
        return item.value;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.delete('cache', key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async deleteByTag(tag: string): Promise<void> {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const index = tx.store.index('by-tag');
      
      let cursor = await index.openCursor(IDBKeyRange.only(tag));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      await tx.done;
    } catch (error) {
      console.error('Cache delete by tag error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.clear('cache');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const item = await this.db.get('cache', key);
      if (!item) return false;
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        await this.db.delete('cache', key);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Cache has error:', error);
      return false;
    }
  }

  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, options);
    return fresh;
  }

  async refresh(key: string, ttl?: number): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const item = await this.db.get('cache', key);
      if (!item) return false;
      
      item.expiresAt = Date.now() + (ttl || this.DEFAULT_TTL);
      await this.db.put('cache', item);
      return true;
    } catch (error) {
      console.error('Cache refresh error:', error);
      return false;
    }
  }

  async getStats(): Promise<{
    totalItems: number;
    expiredItems: number;
    memoryUsage: number;
  }> {
    if (!this.db) {
      return { totalItems: 0, expiredItems: 0, memoryUsage: 0 };
    }
    
    try {
      const allItems = await this.db.getAll('cache');
      const now = Date.now();
      
      const expiredItems = allItems.filter(item => item.expiresAt < now);
      const memoryUsage = new Blob([JSON.stringify(allItems)]).size;
      
      return {
        totalItems: allItems.length,
        expiredItems: expiredItems.length,
        memoryUsage,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { totalItems: 0, expiredItems: 0, memoryUsage: 0 };
    }
  }

  private async cleanup(): Promise<void> {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const index = tx.store.index('by-expiresAt');
      const now = Date.now();
      
      let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      
      await tx.done;
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  private async evictOldest(): Promise<void> {
    if (!this.db) return;
    
    try {
      const tx = this.db.transaction('cache', 'readwrite');
      const index = tx.store.index('by-expiresAt');
      
      // Get the oldest item
      let cursor = await index.openCursor();
      if (cursor) {
        await cursor.delete();
      }
      
      await tx.done;
    } catch (error) {
      console.error('Cache eviction error:', error);
    }
  }
}

export const cache = new CacheService();

// Initialize on module load
if (typeof window !== 'undefined') {
  cache.initialize().catch(console.error);
}

// Memory cache for frequently accessed items
export class MemoryCache {
  private static instance: MemoryCache;
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private readonly MAX_SIZE = 100;

  static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }

  set(key: string, value: any, ttl: number = 60000): void {
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt < oldestExpiry) {
        oldestExpiry = item.expiresAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export const memoryCache = MemoryCache.getInstance();
