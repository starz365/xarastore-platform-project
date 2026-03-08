import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  identifier?: string;
}

export class RateLimiter {
  private ratelimit: Ratelimit;
  private identifier: string;

  constructor(options: RateLimiterOptions) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(options.maxRequests, `${options.windowMs} ms`),
      analytics: true,
      prefix: 'ratelimit',
    });

    this.identifier = options.identifier || 'global';
  }

  async check(): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    try {
      const { success, limit, remaining, reset } = await this.ratelimit.limit(this.identifier);
      
      return {
        success,
        limit,
        remaining,
        reset,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open in case of Redis error
      return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
  }

  async getRemaining(): Promise<number> {
    try {
      const { remaining } = await this.ratelimit.limit(this.identifier);
      return remaining;
    } catch {
      return Number.MAX_SAFE_INTEGER;
    }
  }

  async reset(): Promise<void> {
    const redis = Redis.fromEnv();
    await redis.del(`ratelimit:${this.identifier}`);
  }
}

/**
 * IP-based rate limiter for API routes
 */
export class IPRateLimiter extends RateLimiter {
  constructor(ip: string, options: Omit<RateLimiterOptions, 'identifier'>) {
    super({
      ...options,
      identifier: `ip:${ip}`,
    });
  }
}

/**
 * User-based rate limiter for authenticated routes
 */
export class UserRateLimiter extends RateLimiter {
  constructor(userId: string, options: Omit<RateLimiterOptions, 'identifier'>) {
    super({
      ...options,
      identifier: `user:${userId}`,
    });
  }
}

/**
 * Token bucket rate limiter implementation
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly refillInterval: number; // milliseconds

  constructor(maxTokens: number, refillRate: number) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = 1000; // 1 second
    this.lastRefill = Date.now();
  }

  async tryAcquire(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillCount = Math.floor(timePassed / this.refillInterval) * this.refillRate;

    if (refillCount > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + refillCount);
      this.lastRefill = now;
    }
  }

  getRemainingTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Distributed rate limiter using Redis
 */
export class DistributedRateLimiter {
  private redis: Redis;
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.redis = Redis.fromEnv();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async check(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;
    const cleanupKey = `ratelimit:${key}:cleanup`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove old requests
      pipeline.zremrangebyscore(windowKey, 0, now - this.windowMs);
      
      // Count requests in current window
      pipeline.zcard(windowKey);
      
      // Add current request
      pipeline.zadd(windowKey, { score: now, member: `${now}-${Math.random()}` });
      
      // Set expiry on the key
      pipeline.expire(windowKey, Math.ceil(this.windowMs / 1000));
      
      const results = await pipeline.exec();
      
      const requestCount = results[1] as number;
      const allowed = requestCount < this.maxRequests;
      
      return {
        allowed,
        remaining: Math.max(0, this.maxRequests - (requestCount + 1)),
        resetTime: now + this.windowMs,
      };
    } catch (error) {
      console.error('Distributed rate limiter error:', error);
      // Fail open
      return { allowed: true, remaining: this.maxRequests, resetTime: now + this.windowMs };
    }
  }
}
