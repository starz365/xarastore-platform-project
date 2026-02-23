export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetUsers: string[]; // User IDs or segments
  targetCountries: string[];
  targetDevices: ('desktop' | 'mobile' | 'tablet')[];
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, any>;
}

export interface FeatureFlagRule {
  type: 'user_id' | 'user_segment' | 'country' | 'device' | 'date' | 'percentage';
  condition: any;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  variant?: string;
  metadata?: Record<string, any>;
}

export class FeatureFlagManager {
  private static instance: FeatureFlagManager;
  private flags: Map<string, FeatureFlag> = new Map();
  private userContext: {
    userId?: string;
    sessionId?: string;
    country?: string;
    device?: 'desktop' | 'mobile' | 'tablet';
    userSegments?: string[];
  } = {};
  private readonly LOCAL_STORAGE_KEY = 'xarastore_feature_flags';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private lastFetchTime: number = 0;

  private constructor() {
    this.loadFromLocalStorage();
    this.setupContext();
  }

  static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  private setupContext(): void {
    // Get user context from various sources
    this.userContext = {
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      country: this.getUserCountry(),
      device: this.getUserDevice(),
      userSegments: this.getUserSegments(),
    };
  }

  private getUserId(): string | undefined {
    // Get user ID from auth or localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_id') || undefined;
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('session_id') || undefined;
    }
    return undefined;
  }

  private getUserCountry(): string | undefined {
    // Try to get from geolocation or IP
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_country') || 'KE'; // Default to Kenya
    }
    return 'KE';
  }

  private getUserDevice(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent;
      if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        return /iPad|Tablet/i.test(userAgent) ? 'tablet' : 'mobile';
      }
    }
    return 'desktop';
  }

  private getUserSegments(): string[] {
    const segments: string[] = [];
    
    // Add based on user behavior
    if (typeof window !== 'undefined') {
      const isReturning = localStorage.getItem('is_returning_user') === 'true';
      if (isReturning) {
        segments.push('returning');
      }
      
      const hasPurchased = localStorage.getItem('has_purchased') === 'true';
      if (hasPurchased) {
        segments.push('purchased');
      }
    }
    
    return segments;
  }

  async initialize(): Promise<void> {
    await this.fetchFlags();
    
    // Refresh flags periodically
    setInterval(() => this.fetchFlags(), this.CACHE_TTL);
    
    // Refresh on user interaction
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => this.fetchFlags());
    }
  }

  async fetchFlags(): Promise<void> {
    const now = Date.now();
    
    // Don't fetch too frequently
    if (now - this.lastFetchTime < this.CACHE_TTL) {
      return;
    }

    try {
      // In production, fetch from your API
      const response = await fetch('/api/feature-flags');
      
      if (response.ok) {
        const flags = await response.json();
        this.updateFlags(flags);
        this.lastFetchTime = now;
      }
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    }
  }

  private updateFlags(flags: FeatureFlag[]): void {
    this.flags.clear();
    
    for (const flag of flags) {
      this.flags.set(flag.name, {
        ...flag,
        startDate: flag.startDate ? new Date(flag.startDate) : undefined,
        endDate: flag.endDate ? new Date(flag.endDate) : undefined,
      });
    }
    
    this.saveToLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (stored) {
        const flags = JSON.parse(stored);
        this.updateFlags(flags);
      }
    } catch (error) {
      console.error('Failed to load feature flags from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const flags = Array.from(this.flags.values());
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(flags));
    } catch (error) {
      console.error('Failed to save feature flags to localStorage:', error);
    }
  }

  evaluate(flagName: string, context?: Partial<typeof this.userContext>): FeatureFlagEvaluation {
    const flag = this.flags.get(flagName);
    const evalContext = { ...this.userContext, ...context };
    
    // Default evaluation
    const defaultEvaluation: FeatureFlagEvaluation = {
      enabled: false,
      reason: 'Flag not found',
    };
    
    if (!flag) {
      return defaultEvaluation;
    }
    
    // Check if flag is globally disabled
    if (!flag.enabled) {
      return {
        enabled: false,
        reason: 'Flag globally disabled',
      };
    }
    
    // Check date range
    if (flag.startDate && new Date() < flag.startDate) {
      return {
        enabled: false,
        reason: 'Flag start date not reached',
      };
    }
    
    if (flag.endDate && new Date() > flag.endDate) {
      return {
        enabled: false,
        reason: 'Flag expired',
      };
    }
    
    // Check country targeting
    if (flag.targetCountries.length > 0 && evalContext.country) {
      if (!flag.targetCountries.includes(evalContext.country)) {
        return {
          enabled: false,
          reason: `Country ${evalContext.country} not targeted`,
        };
      }
    }
    
    // Check device targeting
    if (flag.targetDevices.length > 0 && evalContext.device) {
      if (!flag.targetDevices.includes(evalContext.device)) {
        return {
          enabled: false,
          reason: `Device ${evalContext.device} not targeted`,
        };
      }
    }
    
    // Check user targeting
    if (flag.targetUsers.length > 0 && evalContext.userId) {
      if (!flag.targetUsers.includes(evalContext.userId)) {
        return {
          enabled: false,
          reason: 'User not in target list',
        };
      }
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const rolloutKey = `${flagName}:${evalContext.userId || evalContext.sessionId || 'anonymous'}`;
      const hash = this.hashString(rolloutKey);
      const percentage = (hash % 100) + 1; // 1-100
      
      if (percentage > flag.rolloutPercentage) {
        return {
          enabled: false,
          reason: `Rollout percentage: ${percentage} > ${flag.rolloutPercentage}`,
        };
      }
    }
    
    // All checks passed
    return {
      enabled: true,
      reason: 'All conditions met',
      metadata: flag.metadata,
    };
  }

  isEnabled(flagName: string, context?: Partial<typeof this.userContext>): boolean {
    return this.evaluate(flagName, context).enabled;
  }

  getVariant(flagName: string, variants: string[], context?: Partial<typeof this.userContext>): string {
    const evaluation = this.evaluate(flagName, context);
    
    if (!evaluation.enabled) {
      return variants[0]; // Default variant
    }
    
    // Determine variant based on consistent hashing
    const variantKey = `${flagName}:${context?.userId || context?.sessionId || 'anonymous'}`;
    const hash = this.hashString(variantKey);
    const index = hash % variants.length;
    
    return variants[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }

  async trackFlagExposure(flagName: string, variant?: string): Promise<void> {
    try {
      await fetch('/api/feature-flags/exposure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagName,
          variant,
          userId: this.userContext.userId,
          sessionId: this.userContext.sessionId,
          country: this.userContext.country,
          device: this.userContext.device,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track flag exposure:', error);
    }
  }

  async trackFlagConversion(flagName: string, conversion: string, value?: number): Promise<void> {
    try {
      await fetch('/api/feature-flags/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagName,
          conversion,
          value,
          userId: this.userContext.userId,
          sessionId: this.userContext.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track flag conversion:', error);
    }
  }

  getFlagMetadata(flagName: string): Record<string, any> | undefined {
    const flag = this.flags.get(flagName);
    return flag?.metadata;
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getEnabledFlags(context?: Partial<typeof this.userContext>): FeatureFlag[] {
    return this.getAllFlags().filter(flag => 
      this.evaluate(flag.name, context).enabled
    );
  }

  async setFlagForUser(flagName: string, userId: string, enabled: boolean): Promise<void> {
    try {
      await fetch('/api/feature-flags/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagName,
          userId,
          enabled,
        }),
      });
      
      // Invalidate cache
      this.lastFetchTime = 0;
      await this.fetchFlags();
    } catch (error) {
      console.error('Failed to set flag for user:', error);
    }
  }

  async setFlagOverride(flagName: string, enabled: boolean, ttl?: number): Promise<void> {
    const overrideKey = `flag_override_${flagName}`;
    
    if (typeof window !== 'undefined') {
      const override = {
        enabled,
        expires: ttl ? Date.now() + ttl * 1000 : undefined,
      };
      
      localStorage.setItem(overrideKey, JSON.stringify(override));
    }
  }

  clearFlagOverride(flagName: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`flag_override_${flagName}`);
    }
  }

  getFlagOverrides(): Record<string, boolean> {
    const overrides: Record<string, boolean> = {};
    
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key?.startsWith('flag_override_')) {
          try {
            const override = JSON.parse(localStorage.getItem(key)!);
            
            // Check if override is expired
            if (!override.expires || override.expires > Date.now()) {
              const flagName = key.replace('flag_override_', '');
              overrides[flagName] = override.enabled;
            } else {
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.error('Failed to parse flag override:', error);
          }
        }
      }
    }
    
    return overrides;
  }

  async getFlagAnalytics(flagName: string, timeframe: 'day' | 'week' | 'month' = 'day'): Promise<{
    exposures: number;
    conversions: number;
    conversionRate: number;
    uniqueUsers: number;
    byVariant?: Record<string, {
      exposures: number;
      conversions: number;
      conversionRate: number;
    }>;
  }> {
    try {
      const response = await fetch(
        `/api/feature-flags/analytics?flag=${flagName}&timeframe=${timeframe}`
      );
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get flag analytics:', error);
    }
    
    return {
      exposures: 0,
      conversions: 0,
      conversionRate: 0,
      uniqueUsers: 0,
    };
  }

  createExperiment(
    name: string,
    variants: Array<{ name: string; weight: number }>,
    targetMetric: string
  ): void {
    const experimentFlag: FeatureFlag = {
      name: `experiment_${name}`,
      description: `A/B test for ${name}`,
      enabled: true,
      rolloutPercentage: 100,
      targetUsers: [],
      targetCountries: [],
      targetDevices: ['desktop', 'mobile', 'tablet'],
      metadata: {
        type: 'experiment',
        variants,
        targetMetric,
        startDate: new Date().toISOString(),
      },
    };
    
    this.flags.set(experimentFlag.name, experimentFlag);
    this.saveToLocalStorage();
  }

  getExperimentVariant(experimentName: string, context?: Partial<typeof this.userContext>): string {
    const flagName = `experiment_${experimentName}`;
    const flag = this.flags.get(flagName);
    
    if (!flag || !flag.metadata?.variants) {
      return 'control';
    }
    
    const variants = flag.metadata.variants as Array<{ name: string; weight: number }>;
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    
    // Consistent hashing for variant assignment
    const variantKey = `${flagName}:${context?.userId || context?.sessionId || 'anonymous'}`;
    const hash = this.hashString(variantKey);
    const random = hash % totalWeight;
    
    let accumulatedWeight = 0;
    for (const variant of variants) {
      accumulatedWeight += variant.weight;
      if (random < accumulatedWeight) {
        return variant.name;
      }
    }
    
    return variants[0].name;
  }

  async logExperimentExposure(experimentName: string, variant: string): Promise<void> {
    await this.trackFlagExposure(`experiment_${experimentName}`, variant);
  }

  async logExperimentConversion(experimentName: string, variant: string, value?: number): Promise<void> {
    await this.trackFlagConversion(`experiment_${experimentName}`, 'conversion', value);
  }

  getExperiments(): Array<{
    name: string;
    variants: Array<{ name: string; weight: number }>;
    startDate: Date;
    targetMetric: string;
  }> {
    return this.getAllFlags()
      .filter(flag => flag.metadata?.type === 'experiment')
      .map(flag => ({
        name: flag.name.replace('experiment_', ''),
        variants: flag.metadata.variants,
        startDate: new Date(flag.metadata.startDate),
        targetMetric: flag.metadata.targetMetric,
      }));
  }

  clearCache(): void {
    this.flags.clear();
    this.lastFetchTime = 0;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    }
  }
}

export const featureFlags = FeatureFlagManager.getInstance();

// Initialize on module load
if (typeof window !== 'undefined') {
  featureFlags.initialize().catch(console.error);
}
