import { browserCache } from './browser-cache';
import { supabase } from '@/lib/supabase/client';

interface InvalidationRule {
  pattern: RegExp;
  dependencies?: string[];
  onInvalidate?: (key: string) => Promise<void>;
}

interface InvalidationEvent {
  type: string;
  table?: string;
  recordId?: string;
  userId?: string;
  timestamp: number;
}

class CacheInvalidationManager {
  private rules: InvalidationRule[] = [];
  private invalidationQueue: string[] = [];
  private isProcessing = false;
  private readonly channelName = 'cache-invalidation';
  private readonly maxRetries = 3;
  private retryCounts = new Map<string, number>();

  constructor() {
    this.setupDefaultRules();
    this.setupRealtimeListener();
  }

  private setupDefaultRules(): void {
    // Product-related cache invalidation
    this.addRule({
      pattern: /^products(?::|$)/,
      dependencies: ['categories', 'brands'],
      onInvalidate: async (key) => {
        // Invalidate related product lists
        await this.invalidatePattern(/^products-list/);
        await this.invalidatePattern(/^search-results/);
      }
    });

    // Category-related cache invalidation
    this.addRule({
      pattern: /^categories(?::|$)/,
      dependencies: ['products'],
      onInvalidate: async (key) => {
        await this.invalidatePattern(/^category-products/);
      }
    });

    // User-related cache invalidation
    this.addRule({
      pattern: /^user-(?!session)/,
      dependencies: ['orders', 'wishlist', 'cart'],
      onInvalidate: async (key) => {
        const userId = key.split(':')[1];
        if (userId) {
          await this.invalidatePattern(new RegExp(`^user-${userId}`));
        }
      }
    });

    // Cart cache invalidation
    this.addRule({
      pattern: /^cart-/,
      onInvalidate: async (key) => {
        await this.invalidatePattern(/^cart-total/);
        await this.invalidatePattern(/^cart-items/);
      }
    });

    // Search cache invalidation
    this.addRule({
      pattern: /^search-/,
      onInvalidate: async (key) => {
        await this.invalidatePattern(/^search-suggestions/);
      }
    });
  }

  private async setupRealtimeListener(): Promise<void> {
    try {
      const channel = supabase.channel(this.channelName)
        .on('postgres_changes', 
          { event: '*', schema: 'public' },
          (payload) => {
            this.handleDatabaseChange(payload);
          }
        )
        .subscribe();

      // Listen for custom invalidation events
      if (typeof window !== 'undefined') {
        window.addEventListener('cache-invalidate', ((event: CustomEvent) => {
          this.invalidate(event.detail.key, event.detail.reason);
        }) as EventListener);

        window.addEventListener('online-sync', () => {
          this.processInvalidationQueue();
        });
      }
    } catch (error) {
      console.error('Failed to setup cache invalidation listener:', error);
    }
  }

  addRule(rule: InvalidationRule): void {
    this.rules.push(rule);
  }

  async invalidate(key: string, reason?: string): Promise<void> {
    console.debug(`Invalidating cache key: ${key}`, { reason });
    
    // Delete from browser cache
    await browserCache.delete(key);
    
    // Apply invalidation rules
    await this.applyRules(key);
    
    // Remove from localStorage if present
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`xarastore-cache-${key}`);
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    
    // Broadcast invalidation to other tabs
    this.broadcastInvalidation(key, reason);
  }

  async invalidatePattern(pattern: RegExp | string): Promise<void> {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    // Invalidate from memory cache
    const cache = browserCache as any;
    const keysToDelete: string[] = [];
    
    for (const key of cache.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    await Promise.all(keysToDelete.map(key => this.invalidate(key, 'pattern-match')));
    
    // Invalidate from localStorage
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(storageKey => {
          if (storageKey.startsWith('xarastore-cache-')) {
            const key = storageKey.replace('xarastore-cache-', '');
            if (regex.test(key)) {
              localStorage.removeItem(storageKey);
            }
          }
        });
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }

  async invalidateByTable(table: string, recordId?: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'table-change',
      table,
      recordId,
      timestamp: Date.now(),
    };
    
    await this.queueInvalidation(event);
  }

  private async applyRules(key: string): Promise<void> {
    for (const rule of this.rules) {
      if (rule.pattern.test(key)) {
        try {
          // Invalidate dependencies
          if (rule.dependencies) {
            for (const dep of rule.dependencies) {
              await this.invalidatePattern(new RegExp(`^${dep}`));
            }
          }
          
          // Run custom invalidation logic
          if (rule.onInvalidate) {
            await rule.onInvalidate(key);
          }
        } catch (error) {
          console.error(`Error applying invalidation rules for ${key}:`, error);
        }
      }
    }
  }

  private async handleDatabaseChange(payload: any): Promise<void> {
    const { table, eventType, new: newRecord, old: oldRecord } = payload;
    
    const invalidationEvent: InvalidationEvent = {
      type: 'database-change',
      table,
      recordId: newRecord?.id || oldRecord?.id,
      timestamp: Date.now(),
    };

    // Determine specific cache keys to invalidate
    let cacheKeys: string[] = [];
    
    switch (table) {
      case 'products':
        cacheKeys = [
          `products:${newRecord?.id || oldRecord?.id}`,
          'products:featured',
          'products:deals',
          'products:recent',
        ];
        break;
        
      case 'categories':
        cacheKeys = [
          `categories:${newRecord?.id || oldRecord?.id}`,
          'categories:all',
        ];
        break;
        
      case 'orders':
        cacheKeys = [
          `orders:${newRecord?.id || oldRecord?.id}`,
          `user-orders:${newRecord?.user_id || oldRecord?.user_id}`,
        ];
        break;
        
      case 'users':
        cacheKeys = [
          `user:${newRecord?.id || oldRecord?.id}`,
        ];
        break;
    }

    // Queue invalidation for specific cache keys
    for (const key of cacheKeys) {
      await this.queueKeyForInvalidation(key, invalidationEvent);
    }
    
    // Also invalidate by table for pattern-based invalidation
    await this.invalidateByTable(table, newRecord?.id || oldRecord?.id);
  }

  private async queueKeyForInvalidation(key: string, event: InvalidationEvent): Promise<void> {
    if (!this.invalidationQueue.includes(key)) {
      this.invalidationQueue.push(key);
    }
    
    // Start processing if not already processing
    if (!this.isProcessing) {
      this.processInvalidationQueue();
    }
  }

  private async queueInvalidation(event: InvalidationEvent): Promise<void> {
    // Add to queue and process
    await this.processInvalidationQueue();
  }

  private async processInvalidationQueue(): Promise<void> {
    if (this.isProcessing || this.invalidationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.invalidationQueue.length > 0) {
        const key = this.invalidationQueue.shift();
        if (key) {
          try {
            await this.invalidate(key, 'queued-invalidation');
          } catch (error) {
            console.error(`Failed to invalidate ${key}:`, error);
            
            // Retry logic
            const retryCount = this.retryCounts.get(key) || 0;
            if (retryCount < this.maxRetries) {
              this.retryCounts.set(key, retryCount + 1);
              this.invalidationQueue.push(key);
            } else {
              this.retryCounts.delete(key);
            }
          }
        }
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } finally {
      this.isProcessing = false;
      this.retryCounts.clear();
    }
  }

  private broadcastInvalidation(key: string, reason?: string): void {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        const channel = new BroadcastChannel('xarastore-cache');
        channel.postMessage({
          type: 'invalidate',
          key,
          reason,
          timestamp: Date.now(),
        });
        channel.close();
      } catch (error) {
        // BroadcastChannel might not be supported
        console.debug('BroadcastChannel not supported:', error);
      }
    }
    
    // Dispatch custom event for other parts of the app
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cache-invalidated', {
        detail: { key, reason }
      }));
    }
  }

  async getInvalidationStats(): Promise<{
    queueLength: number;
    rulesCount: number;
    isProcessing: boolean;
  }> {
    return {
      queueLength: this.invalidationQueue.length,
      rulesCount: this.rules.length,
      isProcessing: this.isProcessing,
    };
  }

  async clearAll(): Promise<void> {
    // Clear all caches
    await browserCache.clear();
    
    // Clear invalidation queue
    this.invalidationQueue = [];
    this.retryCounts.clear();
    
    // Broadcast clear event
    this.broadcastInvalidation('*', 'clear-all');
  }
}

export const cacheInvalidation = new CacheInvalidationManager();
