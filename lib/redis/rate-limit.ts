import { Redis } from 'ioredis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Create rate limiters for different endpoints
export const ratelimit = {
  // General API rate limiting: 100 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:api',
  }),

  // Authentication endpoints: 10 requests per minute
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  }),

  // Newsletter subscription: 3 requests per hour
  newsletter: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'ratelimit:newsletter',
  }),

  // Contact form: 5 requests per hour
  contact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'ratelimit:contact',
  }),

  // Payment endpoints: 20 requests per minute
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
    prefix: 'ratelimit:payment',
  }),

  // Analytics endpoints: 50 requests per minute
  analytics: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: true,
    prefix: 'ratelimit:analytics',
  }),

  // Search endpoints: 30 requests per minute
  search: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'ratelimit:search',
  }),

  // IP-based global rate limiting: 1000 requests per day
  global: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 d'),
    analytics: true,
    prefix: 'ratelimit:global',
  }),

  // Helper function to limit by identifier
  limit: async (identifier: string, limit = 100, window = '1 m') => {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      analytics: true,
      prefix: `ratelimit:custom:${identifier}`,
    });

    return await limiter.limit(identifier);
  },
};

// Middleware for API routes
export async function rateLimitMiddleware(
  request: Request,
  limiter: keyof typeof ratelimit = 'api'
) {
  const identifier = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'anonymous';
  
  const result = await ratelimit[limiter].limit(identifier);

  if (!result.success) {
    return {
      success: false,
      limit: result.limit,
      reset: result.reset,
      remaining: result.remaining,
    };
  }

  return {
    success: true,
    limit: result.limit,
    reset: result.reset,
    remaining: result.remaining,
  };
}

// Cleanup function for expired rate limit records
export async function cleanupRateLimits() {
  try {
    // Delete keys older than 7 days
    const pattern = 'ratelimit:*';
    const keys = await redis.keys(pattern);
    
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const key of keys) {
      const lastAccessed = await redis.get(`${key}:last_accessed`);
      if (lastAccessed && parseInt(lastAccessed) < weekAgo) {
        await redis.del(key);
        await redis.del(`${key}:last_accessed`);
      }
    }
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
}

// Monitor rate limit usage
export async function getRateLimitStats() {
  try {
    const keys = await redis.keys('ratelimit:*:count');
    const stats: Record<string, any> = {};

    for (const key of keys) {
      const count = await redis.get(key);
      const identifier = key.replace('ratelimit:', '').replace(':count', '');
      stats[identifier] = parseInt(count || '0');
    }

    return stats;
  } catch (error) {
    console.error('Rate limit stats error:', error);
    return {};
  }
}

// Check if IP is banned (for excessive abuse)
export async function isIpBanned(ip: string): Promise<boolean> {
  try {
    const banKey = `ip_ban:${ip}`;
    const isBanned = await redis.get(banKey);
    return !!isBanned;
  } catch (error) {
    console.error('IP ban check error:', error);
    return false;
  }
}

// Ban IP for specified duration (in seconds)
export async function banIp(ip: string, duration: number = 3600): Promise<void> {
  try {
    const banKey = `ip_ban:${ip}`;
    await redis.set(banKey, '1', 'EX', duration);
    
    // Log ban event
    await redis.lpush('ip_ban_logs', JSON.stringify({
      ip,
      banned_at: new Date().toISOString(),
      duration,
      reason: 'excessive_rate_limit_violation',
    }));
  } catch (error) {
    console.error('IP ban error:', error);
  }
}

// Unban IP
export async function unbanIp(ip: string): Promise<void> {
  try {
    const banKey = `ip_ban:${ip}`;
    await redis.del(banKey);
  } catch (error) {
    console.error('IP unban error:', error);
  }
}

// Get banned IPs
export async function getBannedIps(): Promise<string[]> {
  try {
    const keys = await redis.keys('ip_ban:*');
    return keys.map(key => key.replace('ip_ban:', ''));
  } catch (error) {
    console.error('Get banned IPs error:', error);
    return [];
  }
}

// Auto-ban based on excessive violations
export async function autoBanExcessiveViolators() {
  try {
    const violationKey = 'rate_limit_violations';
    const violations = await redis.lrange(violationKey, 0, -1);
    
    for (const violation of violations) {
      const { ip, count, last_violation } = JSON.parse(violation);
      
      // If more than 100 violations in last hour, ban for 24 hours
      if (count > 100 && Date.now() - new Date(last_violation).getTime() < 3600000) {
        await banIp(ip, 24 * 3600);
        await redis.lrem(violationKey, 0, violation);
      }
    }
  } catch (error) {
    console.error('Auto-ban error:', error);
  }
}

// Track violation
export async function trackViolation(ip: string) {
  try {
    const violationKey = 'rate_limit_violations';
    const existing = await redis.lrange(violationKey, 0, -1);
    
    let found = false;
    const updatedViolations = existing.map(v => {
      const data = JSON.parse(v);
      if (data.ip === ip) {
        found = true;
        return JSON.stringify({
          ip,
          count: data.count + 1,
          last_violation: new Date().toISOString(),
        });
      }
      return v;
    });

    if (!found) {
      updatedViolations.push(JSON.stringify({
        ip,
        count: 1,
        last_violation: new Date().toISOString(),
      }));
    }

    // Keep only last 1000 violations
    updatedViolations.splice(1000);

    await redis.del(violationKey);
    if (updatedViolations.length > 0) {
      await redis.rpush(violationKey, ...updatedViolations);
    }
  } catch (error) {
    console.error('Track violation error:', error);
  }
}

// Export Redis instance for other uses
export { redis };
