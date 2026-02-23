interface CacheConfig {
  maxAge?: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  staleAt?: number;
  etag?: string;
  lastModified?: string;
}

export class BrowserCache {
  private static instance: BrowserCache;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultMaxAge = 5 * 60 * 1000; // 5 minutes
  private readonly defaultStaleWhileRevalidate = 2 * 60 * 1000; // 2 minutes

  private constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  static getInstance(): BrowserCache {
    if (!BrowserCache.instance) {
      BrowserCache.instance = new BrowserCache();
    }
    return BrowserCache.instance;
  }

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if we have a valid cached entry
    if (entry && now < entry.expiresAt) {
      return entry.value;
    }

    // Check if we have a stale entry that can be used while revalidating
    if (entry && entry.staleAt && now < entry.staleAt) {
      // Return stale data while fetching fresh in background
      this.revalidateInBackground(key, fetcher, config);
      return entry.value;
    }

    // No valid cache, fetch fresh data
    return this.fetchAndCache(key, fetcher, config);
  }

  async set<T>(
    key: string,
    value: T,
    config?: CacheConfig
  ): Promise<void> {
    const now = Date.now();
    const maxAge = config?.maxAge || this.defaultMaxAge;
    const staleWhileRevalidate = config?.staleWhileRevalidate || this.defaultStaleWhileRevalidate;

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      expiresAt: now + maxAge,
      staleAt: config?.immutable ? undefined : now + maxAge + staleWhileRevalidate,
    };

    this.cache.set(key, entry);
    
    // Also store in localStorage for persistence across page loads
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `xarastore-cache-${key}`,
          JSON.stringify({
            ...entry,
            value: typeof value === 'object' ? JSON.stringify(value) : value,
          })
        );
      } catch (error) {
        // localStorage might be full or disabled
        console.warn('Failed to persist cache to localStorage:', error);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`xarastore-cache-${key}`);
      } catch (error) {
        console.warn('Failed to remove cache from localStorage:', error);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    
    if (typeof window !== 'undefined') {
      try {
        // Remove all cache entries from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('xarastore-cache-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to clear cache from localStorage:', error);
      }
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async preload<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
    if (!(await this.has(key))) {
      await this.fetchAndCache(key, fetcher);
    }
  }

  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: CacheConfig
  ): Promise<void> {
    try {
      const value = await fetcher();
      await this.set(key, value, config);
    } catch (error) {
      console.warn(`Background revalidation failed for ${key}:`, error);
    }
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    try {
      const value = await fetcher();
      await this.set(key, value, config);
      return value;
    } catch (error) {
      // Try to load from localStorage if fetch fails
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`xarastore-cache-${key}`);
          if (stored) {
            const entry = JSON.parse(stored);
            if (Date.now() < entry.expiresAt) {
              const value = typeof entry.value === 'string' && 
                           (entry.value.startsWith('{') || entry.value.startsWith('['))
                ? JSON.parse(entry.value)
                : entry.value;
              
              // Restore to memory cache
              this.cache.set(key, {
                ...entry,
                value,
              });
              
              return value;
            }
          }
        } catch (e) {
          // Fall through to throw original error
        }
      }
      
      throw error;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  async getStats(): Promise<{
    size: number;
    memorySize: number;
    localStorageSize: number;
  }> {
    let memorySize = 0;
    for (const entry of this.cache.values()) {
      memorySize += JSON.stringify(entry).length;
    }

    let localStorageSize = 0;
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('xarastore-cache-')) {
            localStorageSize += localStorage.getItem(key)?.length || 0;
          }
        });
      } catch (error) {
        // Ignore localStorage errors
      }
    }

    return {
      size: this.cache.size,
      memorySize,
      localStorageSize,
    };
  }
}

export const browserCache = BrowserCache.getInstance();
