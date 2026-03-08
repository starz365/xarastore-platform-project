import { getRedisCache } from '@/services/cache/redis';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

interface Variant {
  id: string;
  name: string;
  weight: number;
  config?: Record<string, any>;
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  variants: Variant[];
  startDate: Date;
  endDate?: Date;
  targetAudience?: string[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  metrics: string[];
  hypothesis?: string;
}

interface Assignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
  converted: boolean;
}

export class ABTestingService {
  private userId: string;
  private redis = getRedisCache();
  private static instance: Map<string, ABTestingService> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  static getInstance(userId: string): ABTestingService {
    if (!ABTestingService.instance.has(userId)) {
      ABTestingService.instance.set(userId, new ABTestingService(userId));
    }
    return ABTestingService.instance.get(userId)!;
  }

  /**
   * Get variant for an experiment
   */
  async getVariant(experimentName: string): Promise<string | null> {
    try {
      // Check if experiment is active
      const experiment = await this.getExperiment(experimentName);
      if (!experiment || experiment.status !== 'active') {
        return null;
      }

      // Check if user is in target audience
      if (!await this.isUserInTargetAudience(experiment)) {
        return null;
      }

      // Check for existing assignment
      const assignment = await this.getAssignment(experiment.id);
      if (assignment) {
        return assignment.variantId;
      }

      // Assign variant
      const variant = this.assignVariant(experiment.variants);
      await this.recordAssignment(experiment.id, variant.id);

      return variant.id;
    } catch (error) {
      console.error('Error getting variant:', error);
      return null;
    }
  }

  /**
   * Get experiment by name
   */
  private async getExperiment(name: string): Promise<Experiment | null> {
    const cacheKey = `experiment:${name}`;
    
    const cached = await this.redis.get<Experiment>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) {
      return null;
    }

    const experiment: Experiment = {
      id: data.id,
      name: data.name,
      description: data.description,
      variants: data.variants,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      targetAudience: data.target_audience,
      status: data.status,
      metrics: data.metrics,
      hypothesis: data.hypothesis,
    };

    await this.redis.set(cacheKey, experiment, 300); // 5 minutes cache

    return experiment;
  }

  /**
   * Check if user is in target audience
   */
  private async isUserInTargetAudience(experiment: Experiment): Promise<boolean> {
    if (!experiment.targetAudience || experiment.targetAudience.length === 0) {
      return true;
    }

    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', this.userId)
      .single();

    if (!user) return false;

    return experiment.targetAudience.some(condition => {
      const [field, operator, value] = condition.split(' ');
      
      switch (operator) {
        case '=':
          return user[field] === value;
        case '!=':
          return user[field] !== value;
        case '>':
          return user[field] > parseFloat(value);
        case '<':
          return user[field] < parseFloat(value);
        case 'in':
          const values = value.split(',');
          return values.includes(user[field]);
        default:
          return false;
      }
    });
  }

  /**
   * Assign variant based on weights
   */
  private assignVariant(variants: Variant[]): Variant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        return variant;
      }
    }

    return variants[0];
  }

  /**
   * Get existing assignment
   */
  private async getAssignment(experimentId: string): Promise<Assignment | null> {
    const cacheKey = `assignment:${this.userId}:${experimentId}`;
    
    const cached = await this.redis.get<Assignment>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ab_assignments')
      .select('*')
      .eq('user_id', this.userId)
      .eq('experiment_id', experimentId)
      .single();

    if (error || !data) {
      return null;
    }

    const assignment: Assignment = {
      userId: data.user_id,
      experimentId: data.experiment_id,
      variantId: data.variant_id,
      assignedAt: new Date(data.assigned_at),
      converted: data.converted,
    };

    await this.redis.set(cacheKey, assignment, 86400); // 24 hours cache

    return assignment;
  }

  /**
   * Record variant assignment
   */
  private async recordAssignment(experimentId: string, variantId: string) {
    const assignment: Assignment = {
      userId: this.userId,
      experimentId,
      variantId,
      assignedAt: new Date(),
      converted: false,
    };

    // Cache immediately
    const cacheKey = `assignment:${this.userId}:${experimentId}`;
    await this.redis.set(cacheKey, assignment, 86400);

    // Persist to database asynchronously
    this.persistAssignment(assignment).catch(console.error);
  }

  /**
   * Persist assignment to database
   */
  private async persistAssignment(assignment: Assignment) {
    const supabase = await createClient();
    
    await supabase
      .from('ab_assignments')
      .upsert({
        user_id: assignment.userId,
        experiment_id: assignment.experimentId,
        variant_id: assignment.variantId,
        assigned_at: assignment.assignedAt.toISOString(),
        converted: assignment.converted,
      });
  }

  /**
   * Track conversion
   */
  async trackConversion(experimentName: string, metric: string, value?: number) {
    try {
      const experiment = await this.getExperiment(experimentName);
      if (!experiment) return;

      const assignment = await this.getAssignment(experiment.id);
      if (!assignment) return;

      // Update assignment
      assignment.converted = true;
      await this.recordAssignment(experiment.id, assignment.variantId);

      // Track conversion event
      const supabase = await createClient();
      await supabase
        .from('ab_conversions')
        .insert({
          user_id: this.userId,
          experiment_id: experiment.id,
          variant_id: assignment.variantId,
          metric,
          value,
          converted_at: new Date().toISOString(),
        });

      // Update experiment metrics
      await this.updateExperimentMetrics(experiment.id, metric);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }

  /**
   * Update experiment metrics
   */
  private async updateExperimentMetrics(experimentId: string, metric: string) {
    const cacheKey = `experiment:metrics:${experimentId}`;
    
    const metrics = await this.redis.get<Record<string, number>>(cacheKey) || {};
    metrics[metric] = (metrics[metric] || 0) + 1;
    
    await this.redis.set(cacheKey, metrics, 3600);
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<{
    variantId: string;
    assignments: number;
    conversions: number;
    conversionRate: number;
    metrics: Record<string, number>;
  }[]> {
    const supabase = await createClient();

    // Get all assignments for experiment
    const { data: assignments } = await supabase
      .from('ab_assignments')
      .select('variant_id, converted')
      .eq('experiment_id', experimentId);

    // Get all conversions
    const { data: conversions } = await supabase
      .from('ab_conversions')
      .select('variant_id, metric, value')
      .eq('experiment_id', experimentId);

    if (!assignments) return [];

    // Group by variant
    const variantMap = new Map<string, { assignments: number; conversions: number; metrics: Record<string, number> }>();

    assignments.forEach(a => {
      const variant = variantMap.get(a.variant_id) || { assignments: 0, conversions: 0, metrics: {} };
      variant.assignments++;
      if (a.converted) {
        variant.conversions++;
      }
      variantMap.set(a.variant_id, variant);
    });

    conversions?.forEach(c => {
      const variant = variantMap.get(c.variant_id);
      if (variant) {
        variant.metrics[c.metric] = (variant.metrics[c.metric] || 0) + (c.value || 1);
      }
    });

    return Array.from(variantMap.entries()).map(([variantId, data]) => ({
      variantId,
      ...data,
      conversionRate: data.assignments > 0 ? (data.conversions / data.assignments) * 100 : 0,
    }));
  }

  /**
   * Create experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'status'>): Promise<string> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ab_experiments')
      .insert({
        name: experiment.name,
        description: experiment.description,
        variants: experiment.variants,
        start_date: experiment.startDate.toISOString(),
        end_date: experiment.endDate?.toISOString(),
        target_audience: experiment.targetAudience,
        status: 'draft',
        metrics: experiment.metrics,
        hypothesis: experiment.hypothesis,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string) {
    const supabase = await createClient();
    
    await supabase
      .from('ab_experiments')
      .update({
        status: 'active',
        start_date: new Date().toISOString(),
      })
      .eq('id', experimentId);

    // Clear cache
    const experiment = await this.getExperimentById(experimentId);
    if (experiment) {
      await this.redis.del(`experiment:${experiment.name}`);
    }
  }

  /**
   * Stop experiment
   */
  async stopExperiment(experimentId: string) {
    const supabase = await createClient();
    
    await supabase
      .from('ab_experiments')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
      })
      .eq('id', experimentId);

    // Clear cache
    const experiment = await this.getExperimentById(experimentId);
    if (experiment) {
      await this.redis.del(`experiment:${experiment.name}`);
    }
  }

  /**
   * Get experiment by ID
   */
  private async getExperimentById(experimentId: string): Promise<Experiment | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ab_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      variants: data.variants,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      targetAudience: data.target_audience,
      status: data.status,
      metrics: data.metrics,
      hypothesis: data.hypothesis,
    };
  }

  /**
   * Generate hash for consistent assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Get variant configuration
   */
  async getVariantConfig<T>(experimentName: string, defaultValue: T): Promise<T> {
    const variantId = await this.getVariant(experimentName);
    
    if (!variantId) {
      return defaultValue;
    }

    const experiment = await this.getExperiment(experimentName);
    const variant = experiment?.variants.find(v => v.id === variantId);
    
    return variant?.config as T || defaultValue;
  }
}
