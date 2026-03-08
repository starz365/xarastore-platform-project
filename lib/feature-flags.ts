import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  percentage?: number;
  rules?: Array<{
    condition: string;
    value: boolean;
  }>;
}

export class FeatureFlags {
  private redis: Redis;
  private static instance: FeatureFlags;
  private cache: Map<string, boolean> = new Map();
  private cacheTTL: number = 60000; // 1 minute

  constructor() {
    this.redis = Redis.fromEnv();
  }

  static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  /**
   * Check if a feature is enabled for a user
   */
  async isEnabled(featureName: string, userId?: string): Promise<boolean> {
    const cacheKey = userId ? `${featureName}:${userId}` : featureName;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Try Redis first
      const flag = await this.redis.get(`feature:${featureName}`);
      
      if (flag) {
        const parsedFlag = JSON.parse(flag as string) as FeatureFlag;
        const result = await this.evaluateFlag(parsedFlag, userId);
        this.cache.set(cacheKey, result);
        
        // Set cache expiration
        setTimeout(() => {
          this.cache.delete(cacheKey);
        }, this.cacheTTL);
        
        return result;
      }

      // Fallback to database
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('name', featureName)
        .single();

      if (error || !data) {
        return false;
      }

      const result = await this.evaluateFlag(data, userId);
      this.cache.set(cacheKey, result);
      
      // Cache in Redis
      await this.redis.setex(`feature:${featureName}`, 300, JSON.stringify(data));
      
      return result;
    } catch (error) {
      console.error(`Error checking feature flag ${featureName}:`, error);
      return false;
    }
  }

  /**
   * Evaluate flag with rules and percentage rollout
   */
  private async evaluateFlag(flag: FeatureFlag, userId?: string): Promise<boolean> {
    if (!flag.enabled) {
      return false;
    }

    // Check percentage rollout
    if (flag.percentage !== undefined && userId) {
      const hash = this.hashString(userId);
      const userPercentile = hash % 100;
      return userPercentile < flag.percentage;
    }

    // Check custom rules
    if (flag.rules && flag.rules.length > 0 && userId) {
      for (const rule of flag.rules) {
        if (await this.evaluateRule(rule.condition, userId)) {
          return rule.value;
        }
      }
    }

    return true;
  }

  /**
   * Evaluate a rule condition
   */
  private async evaluateRule(condition: string, userId: string): Promise<boolean> {
    // Simple rule evaluation - can be expanded
    const [field, operator, value] = condition.split(' ');
    
    switch (operator) {
      case '=':
        return this.getUserAttribute(userId, field) === value;
      case '!=':
        return this.getUserAttribute(userId, field) !== value;
      case 'in':
        const values = value.split(',');
        return values.includes(this.getUserAttribute(userId, field));
      default:
        return false;
    }
  }

  /**
   * Get user attribute (simplified)
   */
  private getUserAttribute(userId: string, attribute: string): string {
    // In production, fetch from user profile
    const attributes: Record<string, Record<string, string>> = {};
    return attributes[userId]?.[attribute] || '';
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all enabled features for a user
   */
  async getEnabledFeatures(userId?: string): Promise<string[]> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('feature_flags')
        .select('name, enabled, percentage, rules')
        .eq('enabled', true);

      if (error) throw error;

      const enabledFeatures: string[] = [];
      
      for (const flag of data) {
        if (await this.evaluateFlag(flag, userId)) {
          enabledFeatures.push(flag.name);
        }
      }

      return enabledFeatures;
    } catch (error) {
      console.error('Error getting enabled features:', error);
      return [];
    }
  }

  /**
   * Set a feature flag
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          name: flag.name,
          enabled: flag.enabled,
          percentage: flag.percentage,
          rules: flag.rules,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Invalidate cache
      await this.redis.del(`feature:${flag.name}`);
      this.cache.clear();
    } catch (error) {
      console.error('Error setting feature flag:', error);
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(featureName: string): Promise<void> {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('name', featureName);

      if (error) throw error;

      // Invalidate cache
      await this.redis.del(`feature:${featureName}`);
      this.cache.delete(featureName);
    } catch (error) {
      console.error('Error deleting feature flag:', error);
      throw error;
    }
  }
}
