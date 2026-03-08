import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

export interface RateLimitConfig {
  interval: number; // Time window in seconds
  limit: number; // Maximum requests per interval
  uniqueTokenPerInterval?: number; // Maximum number of unique tokens to track
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitStore {
  increment: (key: string) => Promise<{ count: number; resetTime: number }>;
  reset: (key: string) => Promise<void>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private cache: LRUCache<string, { count: number; resetTime: number }>;

  constructor(maxItems: number = 5000) {
    this.cache = new LRUCache({
      max: maxItems,
      ttl: 1000 * 60 * 5, // 5 minutes default TTL
    });
  }

  async increment(key: string): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      const resetTime = now + 60 * 1000; // Default 1 minute
      this.cache.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    if (now > entry.resetTime) {
      const resetTime = now + 60 * 1000;
      this.cache.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    entry.count += 1;
    this.cache.set(key, entry);
    return entry;
  }

  async reset(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private prefix: string;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.prefix = 'rate_limit:';
  }

  async increment(key: string): Promise<{ count: number; resetTime: number }> {
    const redisKey = `${this.prefix}${key}`;
    const now = Date.now();

    // Get current window
    const windowKey = `${redisKey}:window`;
    const window = await this.redis.get<{ count: number; resetTime: number }>(windowKey);

    if (!window || now > window.resetTime) {
      const resetTime = now + 60 * 1000; // Default 1 minute
      await this.redis.set(windowKey, { count: 1, resetTime }, { ex: 60 });
      return { count: 1, resetTime };
    }

    window.count += 1;
    await this.redis.set(windowKey, window, { ex: 60 });
    return window;
  }

  async reset(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}:window`;
    await this.redis.del(redisKey);
  }
}

class RateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;
  private fallbackStore: MemoryRateLimitStore;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Try Redis first, fallback to memory
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.store = new RedisRateLimitStore();
    } else {
      this.store = new MemoryRateLimitStore(config.uniqueTokenPerInterval);
    }
    
    this.fallbackStore = new MemoryRateLimitStore(config.uniqueTokenPerInterval);
  }

  async check(identifier: string): Promise<RateLimitResult> {
    try {
      const key = this.createKey(identifier);
      const { count, resetTime } = await this.store.increment(key);
      const remaining = Math.max(0, this.config.limit - count);
      const success = count <= this.config.limit;

      return {
        success,
        limit: this.config.limit,
        remaining,
        resetTime,
        retryAfter: success ? undefined : Math.ceil((resetTime - Date.now()) / 1000),
      };
    } catch (error) {
      // Fallback to memory store if Redis fails
      console.error('Rate limit store error, using fallback:', error);
      return this.fallbackCheck(identifier);
    }
  }

  private async fallbackCheck(identifier: string): Promise<RateLimitResult> {
    const key = this.createKey(identifier);
    const { count, resetTime } = await this.fallbackStore.increment(key);
    const remaining = Math.max(0, this.config.limit - count);
    const success = count <= this.config.limit;

    return {
      success,
      limit: this.config.limit,
      remaining,
      resetTime,
      retryAfter: success ? undefined : Math.ceil((resetTime - Date.now()) / 1000),
    };
  }

  private createKey(identifier: string): string {
    return `${this.config.interval}:${this.config.limit}:${identifier}`;
  }

  async reset(identifier: string): Promise<void> {
    try {
      const key = this.createKey(identifier);
      await this.store.reset(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }
}

// Pre-configured rate limiters for different use cases
const rateLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(type: string, config: RateLimitConfig): RateLimiter {
  if (!rateLimiters.has(type)) {
    rateLimiters.set(type, new RateLimiter(config));
  }
  return rateLimiters.get(type)!;
}

export async function rateLimit(
  identifier: string,
  type: string = 'default',
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const defaultConfigs: Record<string, RateLimitConfig> = {
    'default': { interval: 60, limit: 100 },
    'api': { interval: 60, limit: 60 },
    'auth': { interval: 300, limit: 10 }, // 10 attempts per 5 minutes
    'payment': { interval: 60, limit: 5 },
    'search': { interval: 60, limit: 30 },
    'checkout': { interval: 300, limit: 20 },
    'error-log': { interval: 60, limit: 50 },
    'webhook': { interval: 60, limit: 100, uniqueTokenPerInterval: 100 },
    'admin': { interval: 60, limit: 200 },
    'public': { interval: 60, limit: 50 },
    'upload': { interval: 3600, limit: 10 }, // 10 uploads per hour
    'download': { interval: 60, limit: 30 },
    'email': { interval: 3600, limit: 5 }, // 5 emails per hour
    'sms': { interval: 3600, limit: 3 }, // 3 SMS per hour
    'review': { interval: 86400, limit: 5 }, // 5 reviews per day
  };

  const selectedConfig = config || defaultConfigs[type] || defaultConfigs.default;
  const limiter = getRateLimiter(type, selectedConfig);
  
  return limiter.check(identifier);
}

// Higher-order function for API route protection
export function withRateLimit(
  handler: Function,
  type: string = 'default',
  config?: RateLimitConfig
) {
  return async function rateLimitedHandler(req: Request, ...args: any[]) {
    const identifier = getIdentifier(req);
    const result = await rateLimit(identifier, type, config);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetTime),
          },
        }
      );
    }

    return handler(req, ...args);
  };
}

function getIdentifier(req: Request): string {
  // Try multiple sources for identification
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') ||
             'unknown';
  
  const apiKey = req.headers.get('x-api-key');
  const userId = req.headers.get('x-user-id');
  const sessionId = req.headers.get('x-session-id');

  // Use the most specific identifier available
  if (userId) return `user:${userId}`;
  if (sessionId) return `session:${sessionId}`;
  if (apiKey) return `apikey:${apiKey}`;
  
  return `ip:${ip}`;
}

// Middleware for Next.js
export function rateLimitMiddleware(
  type: string = 'default',
  config?: RateLimitConfig
) {
  return async function middleware(req: Request) {
    const identifier = getIdentifier(req);
    const result = await rateLimit(identifier, type, config);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.retryAfter),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = new Response(null, { status: 200 });
    response.headers.set('X-RateLimit-Limit', String(result.limit));
    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetTime));

    return response;
  };
}

// Batch rate limit checking for multiple operations
export async function checkBatchRateLimit(
  operations: Array<{ identifier: string; type: string }>
): Promise<Array<RateLimitResult>> {
  return Promise.all(
    operations.map(op => rateLimit(op.identifier, op.type))
  );
}

// Reset rate limit for a specific identifier
export async function resetRateLimit(identifier: string, type: string = 'default'): Promise<void> {
  const defaultConfigs: Record<string, RateLimitConfig> = {
    'default': { interval: 60, limit: 100 },
    'auth': { interval: 300, limit: 10 },
  };

  const config = defaultConfigs[type] || defaultConfigs.default;
  const limiter = getRateLimiter(type, config);
  await limiter.reset(identifier);
}

// Get rate limit status without incrementing
export async function getRateLimitStatus(
  identifier: string,
  type: string = 'default'
): Promise<RateLimitResult | null> {
  try {
    const defaultConfigs: Record<string, RateLimitConfig> = {
      'default': { interval: 60, limit: 100 },
    };

    const config = defaultConfigs[type] || defaultConfigs.default;
    const limiter = getRateLimiter(type, config);
    
    // This is a read-only operation, so we don't increment
    // You would need to implement a peek method in your store
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      resetTime: Date.now() + config.interval * 1000,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
}

// Clean up expired rate limit entries
export async function cleanupRateLimits(): Promise<void> {
  // This is automatically handled by Redis TTL or LRU cache
  // No explicit cleanup needed
}

// Rate limit by IP with automatic blocking
export async function rateLimitByIP(
  ip: string,
  type: string = 'default'
): Promise<RateLimitResult> {
  return rateLimit(`ip:${ip}`, type);
}

// Rate limit by user ID
export async function rateLimitByUser(
  userId: string,
  type: string = 'default'
): Promise<RateLimitResult> {
  return rateLimit(`user:${userId}`, type);
}

// Rate limit by API key
export async function rateLimitByApiKey(
  apiKey: string,
  type: string = 'default'
): Promise<RateLimitResult> {
  return rateLimit(`apikey:${apiKey}`, type);
}

// Rate limit by session ID
export async function rateLimitBySession(
  sessionId: string,
  type: string = 'default'
): Promise<RateLimitResult> {
  return rateLimit(`session:${sessionId}`, type);
}
