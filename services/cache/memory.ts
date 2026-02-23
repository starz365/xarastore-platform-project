interface CacheEntry<T> {
  value: T;
  expiry: number | null;
  timestamp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  memoryUsage: number;
}

export class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    memoryUsage: 0,
  };
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(key: string, value: any) => void>> = new Map();

  constructor(
    maxSize: number = 1000,
    defaultTTL: number = 300000, // 5 minutes
    cleanupInterval: number = 60000 // 1 minute
  ) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    this.startCleanup(cleanupInterval);
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = this.defaultTTL
  ): Promise<boolean> {
    try {
      // Evict if cache is full
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evict();
      }

      const entry: CacheEntry<T> = {
        value,
        expiry: ttl > 0 ? Date.now() + ttl : null,
        timestamp: Date.now(),
      };

      this.cache.set(key, entry);
      this.stats.sets++;
      this.updateStats();

      // Notify listeners
      this.notifyListeners('set', key, value);

      return true;
    } catch (error) {
      console.error(`Memory cache set error for key ${key}:`, error);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Check if expired
      if (entry.expiry !== null && Date.now() > entry.expiry) {
        this.cache.delete(key);
        this.stats.misses++;
        this.updateStats();
        this.notifyListeners('expired', key, entry.value);
        return null;
      }

      this.stats.hits++;
      this.updateStats();
      return entry.value;
    } catch (error) {
      console.error(`Memory cache get error for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.cache.has(key);
      const entry = this.cache.get(key);
      
      if (existed) {
        this.cache.delete(key);
        this.stats.deletes++;
        this.updateStats();
        this.notifyListeners('delete', key, entry?.value);
      }
      
      return existed;
    } catch (error) {
      console.error(`Memory cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      // Check if expired
      if (entry.expiry !== null && Date.now() > entry.expiry) {
        this.cache.delete(key);
        this.notifyListeners('expired', key, entry.value);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Memory cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return false;
      }

      entry.expiry = ttl > 0 ? Date.now() + ttl : null;
      this.cache.set(key, entry);
      
      return true;
    } catch (error) {
      console.error(`Memory cache expire error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry || entry.expiry === null) {
        return -1;
      }

      const now = Date.now();
      if (now > entry.expiry) {
        this.cache.delete(key);
        this.notifyListeners('expired', key, entry.value);
        return -2;
      }

      return Math.max(0, Math.floor((entry.expiry - now) / 1000));
    } catch (error) {
      console.error(`Memory cache ttl error for key ${key}:`, error);
      return -2;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const current = await this.get<number>(key);
      const newValue = (current || 0) + by;
      
      await this.set(key, newValue);
      
      return newValue;
    } catch (error) {
      console.error(`Memory cache increment error for key ${key}:`, error);
      throw error;
    }
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      const current = await this.get<number>(key);
      const newValue = (current || 0) - by;
      
      await this.set(key, newValue);
      
      return newValue;
    } catch (error) {
      console.error(`Memory cache decrement error for key ${key}:`, error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const regex = this.patternToRegex(pattern);
      const keys: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          const entry = this.cache.get(key);
          
          // Check if expired
          if (entry && entry.expiry !== null && Date.now() > entry.expiry) {
            this.cache.delete(key);
            this.notifyListeners('expired', key, entry.value);
            continue;
          }
          
          keys.push(key);
        }
      }
      
      return keys;
    } catch (error) {
      console.error(`Memory cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flush(pattern?: string): Promise<number> {
    try {
      let deleted = 0;
      
      if (pattern) {
        const regex = this.patternToRegex(pattern);
        const keysToDelete: string[] = [];
        
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }
        
        for (const key of keysToDelete) {
          const entry = this.cache.get(key);
          this.cache.delete(key);
          this.notifyListeners('delete', key, entry?.value);
          deleted++;
        }
      } else {
        const entries = Array.from(this.cache.entries());
        
        for (const [key, entry] of entries) {
          this.cache.delete(key);
          this.notifyListeners('delete', key, entry.value);
        }
        
        deleted = entries.length;
      }
      
      this.stats.deletes += deleted;
      this.updateStats();
      
      return deleted;
    } catch (error) {
      console.error('Memory cache flush error:', error);
      return 0;
    }
  }

  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const hash = (await this.get<Record<string, any>>(key)) || {};
      hash[field] = value;
      
      return await this.set(key, hash);
    } catch (error) {
      console.error(`Memory cache hset error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const hash = await this.get<Record<string, T>>(key);
      
      if (!hash || !(field in hash)) {
        return null;
      }
      
      return hash[field];
    } catch (error) {
      console.error(`Memory cache hget error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const hash = await this.get<Record<string, any>>(key);
      return hash || {};
    } catch (error) {
      console.error(`Memory cache hgetall error for key ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      const hash = await this.get<Record<string, any>>(key);
      
      if (!hash) {
        return 0;
      }
      
      let deleted = 0;
      
      for (const field of fields) {
        if (field in hash) {
          delete hash[field];
          deleted++;
        }
      }
      
      if (deleted > 0) {
        await this.set(key, hash);
      }
      
      return deleted;
    } catch (error) {
      console.error(`Memory cache hdel error for key ${key}:`, error);
      return 0;
    }
  }

  async sadd(key: string, ...members: any[]): Promise<number> {
    try {
      const set = new Set(await this.get<any[]>(key) || []);
      const beforeSize = set.size;
      
      for (const member of members) {
        set.add(member);
      }
      
      const added = set.size - beforeSize;
      
      if (added > 0) {
        await this.set(key, Array.from(set));
      }
      
      return added;
    } catch (error) {
      console.error(`Memory cache sadd error for key ${key}:`, error);
      return 0;
    }
  }

  async smembers<T>(key: string): Promise<T[]> {
    try {
      const set = await this.get<T[]>(key);
      return set || [];
    } catch (error) {
      console.error(`Memory cache smembers error for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: any): Promise<boolean> {
    try {
      const set = new Set(await this.get<any[]>(key) || []);
      return set.has(member);
    } catch (error) {
      console.error(`Memory cache sismember error for key ${key}:`, error);
      return false;
    }
  }

  async srem(key: string, ...members: any[]): Promise<number> {
    try {
      const set = new Set(await this.get<any[]>(key) || []);
      const beforeSize = set.size;
      
      for (const member of members) {
        set.delete(member);
      }
      
      const removed = beforeSize - set.size;
      
      if (removed > 0) {
        await this.set(key, Array.from(set));
      }
      
      return removed;
    } catch (error) {
      console.error(`Memory cache srem error for key ${key}:`, error);
      return 0;
    }
  }

  async getOrSet<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const freshData = await fetcher();
      await this.set(key, freshData, ttl);
      
      return freshData;
    } catch (error) {
      console.error(`Memory cache getOrSet error for key ${key}:`, error);
      return await fetcher();
    }
  }

  async withCache<T>(
    key: string,
    ttl: number,
    fetcher: () => Promise<T>,
    options: {
      forceRefresh?: boolean;
      staleWhileRevalidate?: number;
    } = {}
  ): Promise<T> {
    try {
      if (options.forceRefresh) {
        const freshData = await fetcher();
        await this.set(key, freshData, ttl);
        return freshData;
      }
      
      const cached = await this.get<{ data: T; timestamp: number }>(key);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > ttl;
        const isTooStale = age > (ttl + (options.staleWhileRevalidate || 0));
        
        if (!isStale) {
          return cached.data;
        }
        
        if (!isTooStale && options.staleWhileRevalidate) {
          // Return stale data while revalidating in background
          fetcher().then(freshData => {
            this.set(key, { data: freshData, timestamp: Date.now() }, ttl);
          }).catch(console.error);
          
          return cached.data;
        }
      }
      
      const freshData = await fetcher();
      await this.set(key, { data: freshData, timestamp: Date.now() }, ttl);
      
      return freshData;
    } catch (error) {
      console.error(`Memory cache withCache error for key ${key}:`, error);
      return await fetcher();
    }
  }

  async lock(
    key: string,
    ttl: number = 30000,
    retryDelay: number = 100,
    maxRetries: number = 10
  ): Promise<string | null> {
    const lockId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.set(`lock:${key}`, lockId, ttl);
      
      if (acquired) {
        return lockId;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return null;
  }

  async unlock(key: string, lockId: string): Promise<boolean> {
    const currentLockId = await this.get<string>(`lock:${key}`);
    
    if (currentLockId === lockId) {
      await this.delete(`lock:${key}`);
      return true;
    }
    
    return false;
  }

  async withLock<T>(
    key: string,
    ttl: number,
    operation: () => Promise<T>,
    options: {
      retryDelay?: number;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const lockId = await this.lock(
      key,
      ttl,
      options.retryDelay,
      options.maxRetries
    );
    
    if (!lockId) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }
    
    try {
      return await operation();
    } finally {
      await this.unlock(key, lockId);
    }
  }

  on(event: string, listener: (key: string, value: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  clear(): void {
    const entries = Array.from(this.cache.entries());
    
    for (const [key, entry] of entries) {
      this.notifyListeners('delete', key, entry.value);
    }
    
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      memoryUsage: 0,
    };
  }

  destroy(): void {
    this.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.listeners.clear();
  }

  private startCleanup(interval: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, interval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry !== null && now > entry.expiry) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      this.cache.delete(key);
      this.notifyListeners('expired', key, entry?.value);
    }
    
    if (expiredKeys.length > 0) {
      this.stats.deletes += expiredKeys.length;
      this.updateStats();
    }
  }

  private evict(): void {
    if (this.cache.size === 0) return;
    
    // Simple LRU eviction: remove oldest entry
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.notifyListeners('evict', oldestKey, entry?.value);
    }
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    
    // Estimate memory usage (rough approximation)
    let estimatedSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      estimatedSize += key.length * 2; // UTF-16
      estimatedSize += JSON.stringify(entry.value).length * 2;
      estimatedSize += 24; // Overhead for object and numbers
    }
    
    this.stats.memoryUsage = estimatedSize;
  }

  private patternToRegex(pattern: string): RegExp {
    // Convert Redis-style pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[!/g, '[^')
      .replace(/\[/g, '[')
      .replace(/\]/g, ']');
    
    return new RegExp(`^${regexPattern}$`);
  }

  private notifyListeners(event: string, key: string, value: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(key, value);
        } catch (error) {
          console.error(`Memory cache listener error for event ${event}:`, error);
        }
      }
    }
  }
}

// Singleton instance
let memoryCacheInstance: MemoryCache | null = null;

export function getMemoryCache(): MemoryCache {
  if (!memoryCacheInstance) {
    memoryCacheInstance = new MemoryCache(
      parseInt(process.env.MEMORY_CACHE_MAX_SIZE || '1000'),
      parseInt(process.env.MEMORY_CACHE_TTL || '300000'),
      parseInt(process.env.MEMORY_CACHE_CLEANUP_INTERVAL || '60000')
    );
  }
  return memoryCacheInstance;
}
