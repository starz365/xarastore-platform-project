import { redisCache } from '@/services/cache/redis';

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval?: number; // Max unique tokens per interval
}

export function rateLimit(options: RateLimitOptions) {
  return {
    check: async (limit: number, token: string) => {
      const tokenCountKey = `rate_limit:${token}:count`;
      const intervalKey = `rate_limit:${token}:interval`;
      
      const currentCount = await redisCache.get<number>(tokenCountKey) || 0;
      
      if (currentCount === 0) {
        // First request in this interval
        await redisCache.set(tokenCountKey, 1, options.interval / 1000);
        await redisCache.set(intervalKey, Date.now(), options.interval / 1000);
        return false;
      }
      
      if (currentCount >= limit) {
        // Rate limit exceeded
        return true;
      }
      
      // Increment counter
      await redisCache.increment(tokenCountKey, 1);
      return false;
    },
    
    getRemaining: async (token: string) => {
      const tokenCountKey = `rate_limit:${token}:count`;
      const currentCount = await redisCache.get<number>(tokenCountKey) || 0;
      return Math.max(0, 100 - currentCount); // Assuming limit of 100
    },
    
    reset: async (token: string) => {
      const tokenCountKey = `rate_limit:${token}:count`;
      const intervalKey = `rate_limit:${token}:interval`;
      
      await redisCache.del(tokenCountKey);
      await redisCache.del(intervalKey);
    },
  };
}

// API rate limiting middleware
export async function checkRateLimit(
  request: NextRequest,
  limit: number = 100,
  interval: number = 60 * 1000
): Promise<{ limited: boolean; remaining: number }> {
  const ip = request.ip || 'unknown';
  const path = request.nextUrl.pathname;
  const token = `${ip}:${path}`;
  
  const limiter = rateLimit({ interval });
  const limited = await limiter.check(limit, token);
  const remaining = await limiter.getRemaining(token);
  
  // Add rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + interval / 1000).toString());
  
  return { limited, remaining };
}

// IP-based rate limiting
export const ipRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

// User-based rate limiting
export const userRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 5000,
});

// Global rate limiting for public endpoints
export const globalRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10000,
});
