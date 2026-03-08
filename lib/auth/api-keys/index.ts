import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { Redis } from 'ioredis';

interface ApiKeyMetadata {
  id: string;
  key_prefix: string;
  name: string;
  description?: string;
  permissions: string[];
  rate_limit: number;
  rate_window: number; // in seconds
  allowed_ips?: string[];
  allowed_domains?: string[];
  expires_at?: string;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
  revoked_at?: string;
}

interface ApiKeyValidationResult {
  valid: boolean;
  key?: ApiKeyMetadata;
  error?: string;
  permissions?: string[];
}

interface CreateApiKeyOptions {
  name: string;
  description?: string;
  permissions: string[];
  rate_limit: number;
  rate_window: number;
  allowed_ips?: string[];
  allowed_domains?: string[];
  expires_in_days?: number;
  metadata?: Record<string, any>;
}

export class ApiKeyManager {
  private static instance: ApiKeyManager;
  private redis: Redis | null = null;
  private readonly KEY_PREFIX = 'xarastore_';
  private readonly KEY_LENGTH = 32;
  private readonly PREFIX_LENGTH = 8;

  private constructor() {
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    }
  }

  static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  async createApiKey(options: CreateApiKeyOptions): Promise<{ apiKey: string; metadata: ApiKeyMetadata }> {
    try {
      const supabase = await createClient();

      // Generate random bytes for the key
      const buffer = randomBytes(this.KEY_LENGTH);
      const fullKey = buffer.toString('hex');

      // Create prefix and hashed version
      const keyPrefix = fullKey.substring(0, this.PREFIX_LENGTH);
      const keyHash = this.hashApiKey(fullKey);

      // Calculate expiration if provided
      const expiresAt = options.expires_in_days
        ? new Date(Date.now() + options.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      // Prepare metadata
      const metadata: ApiKeyMetadata = {
        id: this.generateId(),
        key_prefix: keyPrefix,
        name: options.name,
        description: options.description,
        permissions: options.permissions,
        rate_limit: options.rate_limit,
        rate_window: options.rate_window,
        allowed_ips: options.allowed_ips,
        allowed_domains: options.allowed_domains,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        usage_count: 0,
      };

      // Store in database
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          id: metadata.id,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          name: metadata.name,
          description: metadata.description,
          permissions: metadata.permissions,
          rate_limit: metadata.rate_limit,
          rate_window: metadata.rate_window,
          allowed_ips: metadata.allowed_ips,
          allowed_domains: metadata.allowed_domains,
          expires_at: metadata.expires_at,
          created_at: metadata.created_at,
        });

      if (insertError) {
        throw new Error(`Failed to store API key: ${insertError.message}`);
      }

      // Store in Redis cache if available
      if (this.redis) {
        const cacheKey = `apikey:${keyHash}`;
        await this.redis.setex(
          cacheKey,
          3600, // 1 hour cache
          JSON.stringify(metadata)
        );
      }

      // Return the full key (only time it's exposed)
      const apiKey = `${this.KEY_PREFIX}${fullKey}`;

      return { apiKey, metadata };
    } catch (error) {
      console.error('API key creation failed:', error);
      throw new Error('Failed to create API key');
    }
  }

  async validateApiKey(apiKey: string, requiredPermission?: string): Promise<ApiKeyValidationResult> {
    try {
      // Remove prefix if present
      const cleanKey = apiKey.replace(this.KEY_PREFIX, '');
      const keyHash = this.hashApiKey(cleanKey);

      // Check cache first
      let metadata: ApiKeyMetadata | null = null;

      if (this.redis) {
        const cached = await this.redis.get(`apikey:${keyHash}`);
        if (cached) {
          metadata = JSON.parse(cached);
        }
      }

      // If not in cache, check database
      if (!metadata) {
        const supabase = await createClient();

        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key_hash', keyHash)
          .single();

        if (error || !data) {
          return {
            valid: false,
            error: 'Invalid API key',
          };
        }

        // Check if revoked
        if (data.revoked_at) {
          return {
            valid: false,
            error: 'API key has been revoked',
          };
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return {
            valid: false,
            error: 'API key has expired',
          };
        }

        metadata = {
          id: data.id,
          key_prefix: data.key_prefix,
          name: data.name,
          description: data.description,
          permissions: data.permissions,
          rate_limit: data.rate_limit,
          rate_window: data.rate_window,
          allowed_ips: data.allowed_ips,
          allowed_domains: data.allowed_domains,
          expires_at: data.expires_at,
          created_at: data.created_at,
          last_used_at: data.last_used_at,
          usage_count: data.usage_count,
          revoked_at: data.revoked_at,
        };

        // Update cache
        if (this.redis) {
          await this.redis.setex(
            `apikey:${keyHash}`,
            3600,
            JSON.stringify(metadata)
          );
        }
      }

      // Check required permission
      if (requiredPermission && !metadata.permissions.includes(requiredPermission)) {
        return {
          valid: false,
          error: 'Insufficient permissions',
        };
      }

      // Update usage metrics asynchronously
      this.updateUsageMetrics(metadata.id, keyHash).catch(console.error);

      return {
        valid: true,
        key: metadata,
        permissions: metadata.permissions,
      };

    } catch (error) {
      console.error('API key validation error:', error);
      return {
        valid: false,
        error: 'Validation failed',
      };
    }
  }

  async revokeApiKey(keyId: string): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('api_keys')
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .select('key_hash')
        .single();

      if (error || !data) {
        return false;
      }

      // Remove from cache
      if (this.redis) {
        await this.redis.del(`apikey:${data.key_hash}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      return false;
    }
  }

  async listApiKeys(filters?: {
    active?: boolean;
    expired?: boolean;
    revoked?: boolean;
  }): Promise<ApiKeyMetadata[]> {
    try {
      const supabase = await createClient();

      let query = supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.active) {
        query = query
          .is('revoked_at', null)
          .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`);
      }

      if (filters?.expired) {
        query = query.lt('expires_at', new Date().toISOString());
      }

      if (filters?.revoked) {
        query = query.not('revoked_at', 'is', null);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        key_prefix: item.key_prefix,
        name: item.name,
        description: item.description,
        permissions: item.permissions,
        rate_limit: item.rate_limit,
        rate_window: item.rate_window,
        allowed_ips: item.allowed_ips,
        allowed_domains: item.allowed_domains,
        expires_at: item.expires_at,
        created_at: item.created_at,
        last_used_at: item.last_used_at,
        usage_count: item.usage_count,
        revoked_at: item.revoked_at,
      }));
    } catch (error) {
      console.error('Failed to list API keys:', error);
      return [];
    }
  }

  async rotateApiKey(keyId: string): Promise<{ newApiKey: string; metadata: ApiKeyMetadata } | null> {
    try {
      const supabase = await createClient();

      // Get existing key metadata
      const { data: existing, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .single();

      if (fetchError || !existing) {
        return null;
      }

      // Revoke old key
      await this.revokeApiKey(keyId);

      // Create new key with same permissions
      return await this.createApiKey({
        name: existing.name,
        description: existing.description,
        permissions: existing.permissions,
        rate_limit: existing.rate_limit,
        rate_window: existing.rate_window,
        allowed_ips: existing.allowed_ips,
        allowed_domains: existing.allowed_domains,
        expires_in_days: existing.expires_at
          ? Math.ceil((new Date(existing.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          : undefined,
      });

    } catch (error) {
      console.error('Failed to rotate API key:', error);
      return null;
    }
  }

  async checkRateLimit(keyId: string, identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    try {
      if (!this.redis) {
        return { allowed: true, remaining: 1000, resetAt: Date.now() + 3600000 };
      }

      const supabase = await createClient();

      // Get key details
      const { data, error } = await supabase
        .from('api_keys')
        .select('rate_limit, rate_window')
        .eq('id', keyId)
        .single();

      if (error || !data) {
        return { allowed: false, remaining: 0, resetAt: Date.now() };
      }

      const now = Date.now();
      const windowKey = `ratelimit:${keyId}:${Math.floor(now / (data.rate_window * 1000))}`;

      const current = await this.redis.incr(windowKey);
      if (current === 1) {
        await this.redis.expire(windowKey, data.rate_window);
      }

      const resetAt = (Math.floor(now / (data.rate_window * 1000)) + 1) * data.rate_window * 1000;
      const remaining = Math.max(0, data.rate_limit - current);

      return {
        allowed: current <= data.rate_limit,
        remaining,
        resetAt,
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open in case of Redis error
      return { allowed: true, remaining: 1, resetAt: Date.now() + 60000 };
    }
  }

  async validateRequestContext(apiKey: string, context: {
    ip?: string;
    origin?: string;
    userAgent?: string;
  }): Promise<boolean> {
    try {
      const cleanKey = apiKey.replace(this.KEY_PREFIX, '');
      const keyHash = this.hashApiKey(cleanKey);

      const supabase = await createClient();

      const { data, error } = await supabase
        .from('api_keys')
        .select('allowed_ips, allowed_domains')
        .eq('key_hash', keyHash)
        .single();

      if (error || !data) {
        return false;
      }

      // Check IP whitelist if configured
      if (data.allowed_ips?.length && context.ip) {
        const ipAllowed = data.allowed_ips.some((allowedIp: string) => {
          if (allowedIp.includes('/')) {
            // CIDR notation
            return this.isIpInCidr(context.ip!, allowedIp);
          }
          return context.ip === allowedIp;
        });

        if (!ipAllowed) {
          return false;
        }
      }

      // Check domain whitelist if configured
      if (data.allowed_domains?.length && context.origin) {
        try {
          const originUrl = new URL(context.origin);
          const domainAllowed = data.allowed_domains.some((allowedDomain: string) =>
            originUrl.hostname === allowedDomain || originUrl.hostname.endsWith(`.${allowedDomain}`)
          );

          if (!domainAllowed) {
            return false;
          }
        } catch {
          return false;
        }
      }

      return true;

    } catch (error) {
      console.error('Context validation failed:', error);
      return false;
    }
  }

  private async updateUsageMetrics(keyId: string, keyHash: string): Promise<void> {
    try {
      const supabase = await createClient();

      await supabase.rpc('increment_api_key_usage', {
        p_key_id: keyId,
        p_timestamp: new Date().toISOString(),
      });

      // Update cache
      if (this.redis) {
        const cached = await this.redis.get(`apikey:${keyHash}`);
        if (cached) {
          const metadata = JSON.parse(cached);
          metadata.last_used_at = new Date().toISOString();
          metadata.usage_count = (metadata.usage_count || 0) + 1;
          await this.redis.setex(`apikey:${keyHash}`, 3600, JSON.stringify(metadata));
        }
      }

      // Log usage for analytics
      await supabase.from('api_key_usage').insert({
        key_id: keyId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to update usage metrics:', error);
    }
  }

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private generateId(): string {
    return `key_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits = '32'] = cidr.split('/');
    const mask = parseInt(bits);

    const ipLong = this.ipToLong(ip);
    const rangeLong = this.ipToLong(range);
    const maskLong = this.maskToLong(mask);

    return (ipLong & maskLong) === (rangeLong & maskLong);
  }

  private ipToLong(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  private maskToLong(mask: number): number {
    return ~((1 << (32 - mask)) - 1) >>> 0;
  }
}

// Singleton instance
export const apiKeyManager = ApiKeyManager.getInstance();

// Convenience exports
export const validateApiKey = (apiKey: string, permission?: string) =>
  apiKeyManager.validateApiKey(apiKey, permission);

export const createApiKey = (options: CreateApiKeyOptions) =>
  apiKeyManager.createApiKey(options);

export const revokeApiKey = (keyId: string) =>
  apiKeyManager.revokeApiKey(keyId);

export const listApiKeys = (filters?: Parameters<typeof apiKeyManager.listApiKeys>[0]) =>
  apiKeyManager.listApiKeys(filters);

export const rotateApiKey = (keyId: string) =>
  apiKeyManager.rotateApiKey(keyId);

// Database schema for API keys
export const apiKeysSchema = `
-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  rate_limit INTEGER NOT NULL DEFAULT 100,
  rate_window INTEGER NOT NULL DEFAULT 3600,
  allowed_ips TEXT[],
  allowed_domains TEXT[],
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_api_keys_revoked ON api_keys(revoked_at) WHERE revoked_at IS NOT NULL;

-- API Key usage tracking
CREATE TABLE IF NOT EXISTS api_key_usage (
  id BIGSERIAL PRIMARY KEY,
  key_id TEXT REFERENCES api_keys(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time INTEGER,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_api_usage_key_id ON api_key_usage(key_id);
CREATE INDEX idx_api_usage_timestamp ON api_key_usage(timestamp DESC);

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_api_key_usage(
  p_key_id TEXT,
  p_timestamp TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  UPDATE api_keys
  SET 
    last_used_at = p_timestamp,
    usage_count = usage_count + 1
  WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old usage data (run via cron)
CREATE OR REPLACE FUNCTION cleanup_api_usage(days INTEGER DEFAULT 90) RETURNS void AS $$
BEGIN
  DELETE FROM api_key_usage
  WHERE timestamp < NOW() - (days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access on api_keys"
  ON api_keys
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access on api_key_usage"
  ON api_key_usage
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view their own keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view usage of their keys"
  ON api_key_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.id = api_key_usage.key_id
      AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    )
  );
`;
