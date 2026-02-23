import Redis from 'ioredis';
import { createClient } from 'redis';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  tls?: any;
  retryStrategy?: (times: number) => number | null;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
}

export class RedisCache {
  private client: Redis | null = null;
  private redisClient: any = null;
  private config: RedisConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: RedisConfig = {}) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      retryStrategy: (times) => {
        this.reconnectAttempts = times;
        if (times > this.maxReconnectAttempts) {
          return null;
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      if (this.config.url) {
        this.client = new Redis(this.config.url, this.config);
      } else {
        this.client = new Redis(this.config);
      }

      this.client.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('Redis connection closed');
        this.isConnected = false;
      });

      // Wait for connection
      await this.client.ping();
      
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnection();
      
      const data = await this.client!.get(key);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client!.setex(key, ttlSeconds, serialized);
      } else {
        await this.client!.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const result = await this.client!.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Redis expire error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      
      return await this.client!.ttl(key);
    } catch (error) {
      console.error(`Redis ttl error for key ${key}:`, error);
      return -2; // Key doesn't exist
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      await this.ensureConnection();
      
      return await this.client!.incrby(key, by);
    } catch (error) {
      console.error(`Redis increment error for key ${key}:`, error);
      throw error;
    }
  }

  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      await this.ensureConnection();
      
      return await this.client!.decrby(key, by);
    } catch (error) {
      console.error(`Redis decrement error for key ${key}:`, error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      await this.ensureConnection();
      
      return await this.client!.keys(pattern);
    } catch (error) {
      console.error(`Redis keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  async flush(pattern?: string): Promise<number> {
    try {
      await this.ensureConnection();
      
      if (pattern) {
        const matchingKeys = await this.keys(pattern);
        if (matchingKeys.length > 0) {
          return await this.client!.del(...matchingKeys);
        }
        return 0;
      } else {
        await this.client!.flushdb();
        return -1; // Indicates full flush
      }
    } catch (error) {
      console.error('Redis flush error:', error);
      return 0;
    }
  }

  async hset(
    key: string,
    field: string,
    value: any
  ): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const serialized = JSON.stringify(value);
      const result = await this.client!.hset(key, field, serialized);
      return result === 1 || result === 0;
    } catch (error) {
      console.error(`Redis hset error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      await this.ensureConnection();
      
      const data = await this.client!.hget(key, field);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      console.error(`Redis hget error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      await this.ensureConnection();
      
      const data = await this.client!.hgetall(key);
      if (!data) return {};
      
      const result: Record<string, any> = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value as string);
      }
      
      return result;
    } catch (error) {
      console.error(`Redis hgetall error for key ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      
      return await this.client!.hdel(key, ...fields);
    } catch (error) {
      console.error(`Redis hdel error for key ${key}:`, error);
      return 0;
    }
  }

  async sadd(key: string, ...members: any[]): Promise<number> {
    try {
      await this.ensureConnection();
      
      const serialized = members.map(m => JSON.stringify(m));
      return await this.client!.sadd(key, ...serialized);
    } catch (error) {
      console.error(`Redis sadd error for key ${key}:`, error);
      return 0;
    }
  }

  async smembers<T>(key: string): Promise<T[]> {
    try {
      await this.ensureConnection();
      
      const data = await this.client!.smembers(key);
      return data.map((item: string) => JSON.parse(item));
    } catch (error) {
      console.error(`Redis smembers error for key ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: any): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const serialized = JSON.stringify(member);
      const result = await this.client!.sismember(key, serialized);
      return result === 1;
    } catch (error) {
      console.error(`Redis sismember error for key ${key}:`, error);
      return false;
    }
  }

  async srem(key: string, ...members: any[]): Promise<number> {
    try {
      await this.ensureConnection();
      
      const serialized = members.map(m => JSON.stringify(m));
      return await this.client!.srem(key, ...serialized);
    } catch (error) {
      console.error(`Redis srem error for key ${key}:`, error);
      return 0;
    }
  }

  async zadd(
    key: string,
    score: number,
    member: any
  ): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const serialized = JSON.stringify(member);
      const result = await this.client!.zadd(key, score, serialized);
      return result === 1 || result === 0;
    } catch (error) {
      console.error(`Redis zadd error for key ${key}:`, error);
      return false;
    }
  }

  async zrange<T>(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false
  ): Promise<T[]> {
    try {
      await this.ensureConnection();
      
      const args: any[] = [key, start, stop];
      if (withScores) {
        args.push('WITHSCORES');
      }
      
      const data = await this.client!.zrange(...args);
      
      if (withScores) {
        const result: any[] = [];
        for (let i = 0; i < data.length; i += 2) {
          result.push({
            member: JSON.parse(data[i]),
            score: parseFloat(data[i + 1]),
          });
        }
        return result;
      }
      
      return data.map((item: string) => JSON.parse(item));
    } catch (error) {
      console.error(`Redis zrange error for key ${key}:`, error);
      return [];
    }
  }

  async zrem(key: string, ...members: any[]): Promise<number> {
    try {
      await this.ensureConnection();
      
      const serialized = members.map(m => JSON.stringify(m));
      return await this.client!.zrem(key, ...serialized);
    } catch (error) {
      console.error(`Redis zrem error for key ${key}:`, error);
      return 0;
    }
  }

  async publish(channel: string, message: any): Promise<number> {
    try {
      await this.ensureConnection();
      
      const serialized = JSON.stringify(message);
      return await this.client!.publish(channel, serialized);
    } catch (error) {
      console.error(`Redis publish error for channel ${channel}:`, error);
      return 0;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    try {
      await this.ensureConnection();
      
      const subscriber = this.client!.duplicate();
      
      subscriber.on('message', (ch: string, message: string) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            console.error('Failed to parse Redis message:', error);
          }
        }
      });
      
      await subscriber.subscribe(channel);
      
      // Keep subscription alive
      const keepAlive = setInterval(() => {
        subscriber.ping();
      }, 30000);
      
      // Cleanup on disconnect
      subscriber.on('end', () => {
        clearInterval(keepAlive);
      });
      
    } catch (error) {
      console.error(`Redis subscribe error for channel ${channel}:`, error);
      throw error;
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
      
      // Fetch fresh data
      const freshData = await fetcher();
      
      // Store in cache
      await this.set(key, freshData, ttlSeconds);
      
      return freshData;
    } catch (error) {
      console.error(`Redis getOrSet error for key ${key}:`, error);
      // Fallback to fetcher on cache error
      return await fetcher();
    }
  }

  async withCache<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    options: {
      forceRefresh?: boolean;
      staleWhileRevalidate?: number;
    } = {}
  ): Promise<T> {
    try {
      if (options.forceRefresh) {
        const freshData = await fetcher();
        await this.set(key, freshData, ttlSeconds);
        return freshData;
      }
      
      const cached = await this.get<{ data: T; timestamp: number }>(key);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        const isStale = age > ttlSeconds * 1000;
        const isTooStale = age > (ttlSeconds + (options.staleWhileRevalidate || 0)) * 1000;
        
        if (!isStale) {
          return cached.data;
        }
        
        if (!isTooStale && options.staleWhileRevalidate) {
          // Return stale data while revalidating in background
          fetcher().then(freshData => {
            this.set(key, { data: freshData, timestamp: Date.now() }, ttlSeconds);
          }).catch(console.error);
          
          return cached.data;
        }
      }
      
      // Fetch fresh data
      const freshData = await fetcher();
      await this.set(key, { data: freshData, timestamp: Date.now() }, ttlSeconds);
      
      return freshData;
    } catch (error) {
      console.error(`Redis withCache error for key ${key}:`, error);
      return await fetcher();
    }
  }

  async lock(
    key: string,
    ttlSeconds: number = 30,
    retryDelay: number = 100,
    maxRetries: number = 10
  ): Promise<string | null> {
    const lockId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    for (let i = 0; i < maxRetries; i++) {
      const acquired = await this.set(`lock:${key}`, lockId, ttlSeconds);
      
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
    ttlSeconds: number,
    operation: () => Promise<T>,
    options: {
      retryDelay?: number;
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const lockId = await this.lock(
      key,
      ttlSeconds,
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

  async getStats(): Promise<{
    connected: boolean;
    memory: any;
    stats: any;
    info: any;
  }> {
    try {
      await this.ensureConnection();
      
      const [memory, stats, info] = await Promise.all([
        this.client!.info('memory'),
        this.client!.info('stats'),
        this.client!.info(),
      ]);
      
      return {
        connected: this.isConnected,
        memory: this.parseInfo(memory),
        stats: this.parseInfo(stats),
        info: this.parseInfo(info),
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        connected: this.isConnected,
        memory: {},
        stats: {},
        info: {},
      };
    }
  }

  private parseInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('#') || !line.includes(':')) continue;
      
      const [key, value] = line.split(':');
      result[key.trim()] = value.trim();
    }
    
    return result;
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }
    
    try {
      await this.client!.ping();
    } catch (error) {
      console.error('Redis ping failed, reconnecting...');
      this.isConnected = false;
      await this.connect();
    }
  }
}

// Singleton instance
let redisCacheInstance: RedisCache | null = null;

export function getRedisCache(): RedisCache {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCache();
  }
  return redisCacheInstance;
}
