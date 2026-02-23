import { supabase } from '@/lib/supabase/client';

export interface UserSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  userCount: number;
  isDynamic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR';
}

export interface SegmentCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  value2?: any; // For between operator
}

export interface UserProfile {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  traits: Record<string, any>;
  events: UserEvent[];
  segments: string[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface UserEvent {
  type: string;
  name: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface SegmentStats {
  totalUsers: number;
  segmentDistribution: Array<{ segment: string; count: number; percentage: number }>;
  growthRate: number;
  retentionRate: number;
  averageValue: number;
}

export class CustomerDataPlatform {
  private static instance: CustomerDataPlatform;
  private readonly batchSize = 100;
  private isProcessing = false;

  private constructor() {
    this.initializeSegments();
  }

  static getInstance(): CustomerDataPlatform {
    if (!CustomerDataPlatform.instance) {
      CustomerDataPlatform.instance = new CustomerDataPlatform();
    }
    return CustomerDataPlatform.instance;
  }

  async identify(userId: string, traits: Record<string, any>): Promise<void> {
    try {
      const userProfile = await this.getOrCreateUserProfile(userId);
      
      const updatedTraits = {
        ...userProfile.traits,
        ...traits,
        lastIdentifiedAt: new Date().toISOString(),
      };

      await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          traits: updatedTraits,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      // Re-evaluate segments for this user
      await this.evaluateUserSegments(userId);
    } catch (error) {
      console.error('Failed to identify user:', error);
      throw error;
    }
  }

  async track(userId: string, eventName: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      const event: UserEvent = {
        type: 'track',
        name: eventName,
        properties,
        timestamp: new Date(),
      };

      // Store event
      await supabase
        .from('user_events')
        .insert({
          user_id: userId,
          event_type: event.type,
          event_name: event.name,
          properties: event.properties,
          timestamp: event.timestamp.toISOString(),
        });

      // Update user profile
      await supabase
        .from('user_profiles')
        .update({
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Re-evaluate segments based on new event
      await this.evaluateUserSegments(userId);

      // Trigger automated actions based on event
      await this.triggerAutomatedActions(userId, event);
    } catch (error) {
      console.error('Failed to track event:', error);
      throw error;
    }
  }

  async page(userId: string, pageName: string, properties: Record<string, any> = {}): Promise<void> {
    try {
      const event: UserEvent = {
        type: 'page',
        name: pageName,
        properties: {
          ...properties,
          url: window?.location.href,
          path: window?.location.pathname,
          title: document?.title,
        },
        timestamp: new Date(),
      };

      await supabase
        .from('user_events')
        .insert({
          user_id: userId,
          event_type: event.type,
          event_name: event.name,
          properties: event.properties,
          timestamp: event.timestamp.toISOString(),
        });

      // Update user's browsing behavior
      await this.updateUserBrowsingBehavior(userId, pageName, properties);
    } catch (error) {
      console.error('Failed to track page view:', error);
      throw error;
    }
  }

  async group(userId: string, groupId: string, traits: Record<string, any> = {}): Promise<void> {
    try {
      await supabase
        .from('user_groups')
        .upsert({
          user_id: userId,
          group_id: groupId,
          traits,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,group_id',
        });
    } catch (error) {
      console.error('Failed to add user to group:', error);
      throw error;
    }
  }

  async createSegment(segment: Omit<UserSegment, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('user_segments')
        .insert({
          name: segment.name,
          description: segment.description,
          criteria: segment.criteria,
          is_dynamic: segment.isDynamic,
          is_active: segment.isActive,
          user_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Calculate initial user count
      await this.calculateSegmentUsers(data.id);

      return data.id;
    } catch (error) {
      console.error('Failed to create segment:', error);
      throw error;
    }
  }

  async updateSegment(segmentId: string, updates: Partial<UserSegment>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.criteria !== undefined) updateData.criteria = updates.criteria;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error } = await supabase
        .from('user_segments')
        .update(updateData)
        .eq('id', segmentId);

      if (error) throw error;

      // Recalculate users if criteria changed
      if (updates.criteria !== undefined) {
        await this.calculateSegmentUsers(segmentId);
      }
    } catch (error) {
      console.error('Failed to update segment:', error);
      throw error;
    }
  }

  async deleteSegment(segmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete segment:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profile) {
        return null;
      }

      // Get user events (last 100)
      const { data: events, error: eventsError } = await supabase
        .from('user_events')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;

      // Get user segments
      const { data: segments, error: segmentsError } = await supabase
        .from('user_segment_memberships')
        .select('segment_id')
        .eq('user_id', userId);

      if (segmentsError) throw segmentsError;

      return {
        userId: profile.user_id,
        email: profile.traits?.email,
        firstName: profile.traits?.firstName,
        lastName: profile.traits?.lastName,
        phone: profile.traits?.phone,
        location: profile.traits?.location,
        traits: profile.traits || {},
        events: (events || []).map(event => ({
          type: event.event_type,
          name: event.event_name,
          properties: event.properties || {},
          timestamp: new Date(event.timestamp),
        })),
        segments: (segments || []).map(s => s.segment_id),
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
        lastActiveAt: new Date(profile.last_active_at),
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  async getSegmentUsers(segmentId: string, page: number = 1, pageSize: number = 50): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const offset = (page - 1) * pageSize;

      // Get user IDs in segment
      const { data: memberships, error: membershipsError, count } = await supabase
        .from('user_segment_memberships')
        .select('user_id', { count: 'exact' })
        .eq('segment_id', segmentId)
        .range(offset, offset + pageSize - 1);

      if (membershipsError) throw membershipsError;

      // Get user profiles
      const userIds = memberships?.map(m => m.user_id) || [];
      const userProfiles: UserProfile[] = [];

      for (const userId of userIds) {
        try {
          const profile = await this.getUserProfile(userId);
          if (profile) {
            userProfiles.push(profile);
          }
        } catch (error) {
          console.error(`Failed to get profile for user ${userId}:`, error);
        }
      }

      return {
        users: userProfiles,
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to get segment users:', error);
      throw error;
    }
  }

  async getSegmentStats(segmentId: string): Promise<{
    segment: UserSegment;
    stats: SegmentStats;
    recentActivity: Array<{ date: string; events: number }>;
  }> {
    try {
      // Get segment
      const { data: segment, error: segmentError } = await supabase
        .from('user_segments')
        .select('*')
        .eq('id', segmentId)
        .single();

      if (segmentError) throw segmentError;

      // Get total users in platform
      const { count: totalUsers, error: totalError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get segment user count
      const { count: segmentCount, error: segmentCountError } = await supabase
        .from('user_segment_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId);

      if (segmentCountError) throw segmentCountError;

      // Get segment distribution
      const { data: allSegments, error: segmentsError } = await supabase
        .from('user_segments')
        .select('id, name, user_count')
        .eq('is_active', true);

      if (segmentsError) throw segmentsError;

      const segmentDistribution = (allSegments || []).map(s => ({
        segment: s.name,
        count: s.user_count,
        percentage: totalUsers ? (s.user_count / totalUsers) * 100 : 0,
      }));

      // Calculate growth rate (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: previousCount, error: previousError } = await supabase
        .from('user_segment_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId)
        .lt('joined_at', thirtyDaysAgo.toISOString());

      const growthRate = previousCount && previousCount > 0
        ? ((segmentCount || 0) - previousCount) / previousCount
        : 0;

      // Calculate retention rate (users active in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count: activeUsers, error: activeError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .in('user_id', await this.getSegmentUserIds(segmentId))
        .gte('last_active_at', sevenDaysAgo.toISOString());

      const retentionRate = segmentCount && segmentCount > 0
        ? (activeUsers || 0) / segmentCount
        : 0;

      // Calculate average value (total spent by segment users)
      const averageValue = await this.calculateSegmentAverageValue(segmentId);

      // Get recent activity
      const recentActivity = await this.getSegmentRecentActivity(segmentId);

      return {
        segment: this.transformSegment(segment),
        stats: {
          totalUsers: totalUsers || 0,
          segmentDistribution,
          growthRate,
          retentionRate,
          averageValue,
        },
        recentActivity,
      };
    } catch (error) {
      console.error('Failed to get segment stats:', error);
      throw error;
    }
  }

  async exportSegmentData(segmentId: string, format: 'csv' | 'json'): Promise<string> {
    try {
      const { users } = await this.getSegmentUsers(segmentId, 1, 1000); // Limit to 1000 users for export

      if (format === 'csv') {
        return this.convertProfilesToCSV(users);
      } else {
        return JSON.stringify(users, null, 2);
      }
    } catch (error) {
      console.error('Failed to export segment data:', error);
      throw error;
    }
  }

  async syncAllUserSegments(): Promise<{ processed: number; updated: number }> {
    if (this.isProcessing) {
      throw new Error('Segment sync already in progress');
    }

    this.isProcessing = true;
    let processed = 0;
    let updated = 0;

    try {
      console.log('Starting user segment synchronization...');

      // Get all active segments
      const { data: segments, error: segmentsError } = await supabase
        .from('user_segments')
        .select('*')
        .eq('is_active', true)
        .eq('is_dynamic', true);

      if (segmentsError) throw segmentsError;

      // Get all users
      let lastId: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('user_profiles')
          .select('user_id')
          .order('user_id')
          .limit(this.batchSize);

        if (lastId) {
          query = query.gt('user_id', lastId);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) throw usersError;

        if (!users || users.length === 0) {
          hasMore = false;
          break;
        }

        // Evaluate each user against all segments
        for (const user of users) {
          for (const segment of segments || []) {
            const matches = await this.evaluateUserAgainstSegment(user.user_id, segment.criteria);
            
            if (matches) {
              // Add user to segment if not already a member
              const { error: membershipError } = await supabase
                .from('user_segment_memberships')
                .upsert({
                  user_id: user.user_id,
                  segment_id: segment.id,
                  joined_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,segment_id',
                  ignoreDuplicates: true,
                });

              if (!membershipError) {
                updated++;
              }
            } else {
              // Remove user from segment if they no longer match
              const { error: deleteError } = await supabase
                .from('user_segment_memberships')
                .delete()
                .eq('user_id', user.user_id)
                .eq('segment_id', segment.id);

              if (!deleteError && deleteError?.code !== 'PGRST116') {
                updated++;
              }
            }
          }

          processed++;
          
          // Log progress every 100 users
          if (processed % 100 === 0) {
            console.log(`Processed ${processed} users, updated ${updated} memberships`);
          }
          
          lastId = user.user_id;
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update segment user counts
      for (const segment of segments || []) {
        await this.calculateSegmentUsers(segment.id);
      }

      console.log(`Segment sync completed: ${processed} users processed, ${updated} memberships updated`);
      
      return { processed, updated };
    } catch (error) {
      console.error('Segment sync failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  private async initializeSegments(): Promise<void> {
    try {
      // Check if default segments exist
      const { count } = await supabase
        .from('user_segments')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        await this.createDefaultSegments();
      }
    } catch (error) {
      console.error('Failed to initialize segments:', error);
    }
  }

  private async createDefaultSegments(): Promise<void> {
    const defaultSegments = [
      {
        name: 'New Customers',
        description: 'Customers who made their first purchase in the last 30 days',
        criteria: {
          conditions: [
            {
              field: 'events.purchase',
              operator: 'greater_than',
              value: 0,
            },
            {
              field: 'traits.firstPurchaseDate',
              operator: 'greater_than',
              value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ],
          operator: 'AND',
        },
        isDynamic: true,
        isActive: true,
      },
      {
        name: 'Loyal Customers',
        description: 'Customers with 3+ purchases and average order value > 5000 KES',
        criteria: {
          conditions: [
            {
              field: 'traits.totalOrders',
              operator: 'greater_than',
              value: 2,
            },
            {
              field: 'traits.averageOrderValue',
              operator: 'greater_than',
              value: 5000,
            },
          ],
          operator: 'AND',
        },
        isDynamic: true,
        isActive: true,
      },
      {
        name: 'At Risk Customers',
        description: 'Customers who haven\'t made a purchase in the last 90 days',
        criteria: {
          conditions: [
            {
              field: 'traits.lastPurchaseDate',
              operator: 'less_than',
              value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              field: 'traits.totalOrders',
              operator: 'greater_than',
              value: 0,
            },
          ],
          operator: 'AND',
        },
        isDynamic: true,
        isActive: true,
      },
      {
        name: 'High Value Customers',
        description: 'Customers with total lifetime value > 10000 KES',
        criteria: {
          conditions: [
            {
              field: 'traits.totalSpent',
              operator: 'greater_than',
              value: 10000,
            },
          ],
          operator: 'AND',
        },
        isDynamic: true,
        isActive: true,
      },
      {
        name: 'Cart Abandoners',
        description: 'Users who added items to cart but didn\'t complete purchase',
        criteria: {
          conditions: [
            {
              field: 'events.add_to_cart',
              operator: 'greater_than',
              value: 0,
            },
            {
              field: 'events.purchase',
              operator: 'equals',
              value: 0,
            },
          ],
          operator: 'AND',
        },
        isDynamic: true,
        isActive: true,
      },
    ];

    for (const segment of defaultSegments) {
      try {
        await this.createSegment(segment);
      } catch (error) {
        console.error(`Failed to create default segment "${segment.name}":`, error);
      }
    }

    console.log('Created default segments');
  }

  private async getOrCreateUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            traits: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        return newProfile;
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get or create user profile:', error);
      throw error;
    }
  }

  private async evaluateUserSegments(userId: string): Promise<void> {
    try {
      // Get all active dynamic segments
      const { data: segments, error } = await supabase
        .from('user_segments')
        .select('*')
        .eq('is_active', true)
        .eq('is_dynamic', true);

      if (error) throw error;

      // Evaluate user against each segment
      for (const segment of segments || []) {
        const matches = await this.evaluateUserAgainstSegment(userId, segment.criteria);
        
        if (matches) {
          // Add user to segment
          await supabase
            .from('user_segment_memberships')
            .upsert({
              user_id: userId,
              segment_id: segment.id,
              joined_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,segment_id',
            });
        } else {
          // Remove user from segment
          await supabase
            .from('user_segment_memberships')
            .delete()
            .eq('user_id', userId)
            .eq('segment_id', segment.id);
        }
      }
    } catch (error) {
      console.error('Failed to evaluate user segments:', error);
    }
  }

  private async evaluateUserAgainstSegment(userId: string, criteria: SegmentCriteria): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) return false;

      const results = await Promise.all(
        criteria.conditions.map(condition => 
          this.evaluateCondition(userProfile, condition)
        )
      );

      if (criteria.operator === 'AND') {
        return results.every(result => result);
      } else {
        return results.some(result => result);
      }
    } catch (error) {
      console.error('Failed to evaluate user against segment:', error);
      return false;
    }
  }

  private async evaluateCondition(userProfile: UserProfile, condition: SegmentCondition): Promise<boolean> {
    const { field, operator, value, value2 } = condition;
    
    // Get field value from user profile
    let fieldValue: any;
    
    if (field.startsWith('traits.')) {
      const traitPath = field.replace('traits.', '');
      fieldValue = this.getNestedValue(userProfile.traits, traitPath);
    } else if (field.startsWith('events.')) {
      const eventType = field.replace('events.', '');
      fieldValue = userProfile.events.filter(e => e.name === eventType).length;
    } else {
      fieldValue = (userProfile as any)[field];
    }

    // Apply operator
    switch (operator) {
      case 'equals':
        return fieldValue == value;
      case 'not_equals':
        return fieldValue != value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'between':
        return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(value2);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current ? current[key] : undefined;
    }, obj);
  }

  private async calculateSegmentUsers(segmentId: string): Promise<void> {
    try {
      const { count, error } = await supabase
        .from('user_segment_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('segment_id', segmentId);

      if (error) throw error;

      await supabase
        .from('user_segments')
        .update({
          user_count: count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', segmentId);
    } catch (error) {
      console.error('Failed to calculate segment users:', error);
    }
  }

  private async getSegmentUserIds(segmentId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_segment_memberships')
        .select('user_id')
        .eq('segment_id', segmentId);

      if (error) throw error;
      return (data || []).map(m => m.user_id);
    } catch (error) {
      console.error('Failed to get segment user IDs:', error);
      return [];
    }
  }

  private async calculateSegmentAverageValue(segmentId: string): Promise<number> {
    try {
      const userIds = await this.getSegmentUserIds(segmentId);
      if (userIds.length === 0) return 0;

      const { data, error } = await supabase
        .from('orders')
        .select('total, user_id')
        .in('user_id', userIds)
        .eq('payment_status', 'paid');

      if (error) throw error;

      const totalValue = (data || []).reduce((sum, order) => sum + order.total, 0);
      return data && data.length > 0 ? totalValue / data.length : 0;
    } catch (error) {
      console.error('Failed to calculate segment average value:', error);
      return 0;
    }
  }

  private async getSegmentRecentActivity(segmentId: string): Promise<Array<{ date: string; events: number }>> {
    try {
      const userIds = await this.getSegmentUserIds(segmentId);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .rpc('get_segment_activity_timeseries', {
          segment_user_ids: userIds,
          days_back: 30,
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get segment recent activity:', error);
      return [];
    }
  }

  private async updateUserBrowsingBehavior(userId: string, pageName: string, properties: Record<string, any>): Promise<void> {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('traits')
        .eq('user_id', userId)
        .single();

      if (!profile) return;

      const traits = profile.traits || {};
      const browsingHistory = traits.browsingHistory || [];
      
      browsingHistory.unshift({
        page: pageName,
        timestamp: new Date().toISOString(),
        properties,
      });

      // Keep only last 50 page views
      traits.browsingHistory = browsingHistory.slice(0, 50);
      traits.lastBrowsedPage = pageName;
      traits.lastBrowsedAt = new Date().toISOString();

      await supabase
        .from('user_profiles')
        .update({
          traits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Failed to update browsing behavior:', error);
    }
  }

  private async triggerAutomatedActions(userId: string, event: UserEvent): Promise<void> {
    // This is a simplified version - in production, this would integrate with a workflow automation system
    try {
      // Example: Trigger cart abandonment email
      if (event.name === 'add_to_cart') {
        // Schedule cart abandonment email if purchase doesn't happen within 1 hour
        setTimeout(async () => {
          const { data: recentPurchase } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
            .single();

          if (!recentPurchase) {
            // User hasn't purchased, send cart abandonment email
            console.log(`Trigger cart abandonment email for user ${userId}`);
            // In production, call email service here
          }
        }, 60 * 60 * 1000); // 1 hour
      }

      // Example: Trigger welcome email for new users
      if (event.name === 'user_registration') {
        console.log(`Trigger welcome email for new user ${userId}`);
        // In production, call email service here
      }
    } catch (error) {
      console.error('Failed to trigger automated actions:', error);
    }
  }

  private transformSegment(data: any): UserSegment {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      criteria: data.criteria,
      userCount: data.user_count,
      isDynamic: data.is_dynamic,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private convertProfilesToCSV(profiles: UserProfile[]): string {
    if (profiles.length === 0) return '';
    
    // Create headers from first profile
    const sampleProfile = profiles[0];
    const headers = [
      'userId',
      'email',
      'firstName',
      'lastName',
      'phone',
      'location',
      'segments',
      'createdAt',
      'lastActiveAt',
      'totalOrders',
      'totalSpent',
      'averageOrderValue',
    ];

    const rows = profiles.map(profile => {
      const traits = profile.traits || {};
      const totalOrders = traits.totalOrders || 0;
      const totalSpent = traits.totalSpent || 0;
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      return [
        profile.userId,
        profile.email || '',
        profile.firstName || '',
        profile.lastName || '',
        profile.phone || '',
        profile.location || '',
        profile.segments.join(';'),
        profile.createdAt.toISOString(),
        profile.lastActiveAt.toISOString(),
        totalOrders,
        totalSpent,
        averageOrderValue,
      ].map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const cdp = CustomerDataPlatform.getInstance();

// Auto-sync segments every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    cdp.syncAllUserSegments().catch(console.error);
  }, 60 * 60 * 1000); // 1 hour
}
