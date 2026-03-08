import { getRedisCache } from '@/services/cache/redis';
import { createClient } from '@/lib/supabase/server';

interface UserEvent {
  userId: string;
  type: 'view' | 'purchase' | 'cart_add' | 'wishlist' | 'search' | 'category_view';
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface UserProfile {
  userId: string;
  segments: string[];
  preferences: Record<string, number>;
  browsingHistory: Array<{ productId: string; timestamp: Date; weight: number }>;
  purchaseHistory: Array<{ productId: string; timestamp: Date; amount: number }>;
  categoryAffinity: Record<string, number>;
  brandAffinity: Record<string, number>;
  priceRange: { min: number; max: number; avg: number };
  lastActive: Date;
  totalSpent: number;
  averageOrderValue: number;
}

interface Recommendation {
  productId: string;
  score: number;
  reason: string;
}

export class PersonalizationEngine {
  private userId: string;
  private redis = getRedisCache();
  private static instance: Map<string, PersonalizationEngine> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  static getInstance(userId: string): PersonalizationEngine {
    if (!PersonalizationEngine.instance.has(userId)) {
      PersonalizationEngine.instance.set(userId, new PersonalizationEngine(userId));
    }
    return PersonalizationEngine.instance.get(userId)!;
  }

  /**
   * Track user event
   */
  async trackEvent(event: Omit<UserEvent, 'userId' | 'timestamp'>) {
    try {
      const userEvent: UserEvent = {
        ...event,
        userId: this.userId,
        timestamp: new Date(),
      };

      // Store in Redis for real-time processing
      const eventKey = `events:${this.userId}:${Date.now()}`;
      await this.redis.set(eventKey, userEvent, 86400); // 24 hours

      // Update user profile based on event
      await this.updateUserProfile(userEvent);

      // Queue for batch processing
      await this.queueForProcessing(userEvent);

      return true;
    } catch (error) {
      console.error('Failed to track event:', error);
      return false;
    }
  }

  /**
   * Update user profile based on event
   */
  private async updateUserProfile(event: UserEvent) {
    const profile = await this.getUserProfile();
    
    switch (event.type) {
      case 'view':
        if (event.productId) {
          profile.browsingHistory.push({
            productId: event.productId,
            timestamp: event.timestamp,
            weight: 1,
          });
          
          // Update category affinity
          const product = await this.getProductDetails(event.productId);
          if (product?.category) {
            profile.categoryAffinity[product.category] = (profile.categoryAffinity[product.category] || 0) + 1;
          }
          
          // Update brand affinity
          if (product?.brand) {
            profile.brandAffinity[product.brand] = (profile.brandAffinity[product.brand] || 0) + 1;
          }
        }
        break;

      case 'purchase':
        if (event.productId) {
          profile.purchaseHistory.push({
            productId: event.productId,
            timestamp: event.timestamp,
            amount: event.metadata?.amount || 0,
          });
          
          profile.totalSpent += event.metadata?.amount || 0;
          profile.averageOrderValue = profile.totalSpent / profile.purchaseHistory.length;
        }
        break;

      case 'search':
        if (event.searchQuery) {
          // Update search preferences
          profile.preferences[`search:${event.searchQuery}`] = (profile.preferences[`search:${event.searchQuery}`] || 0) + 1;
        }
        break;
    }

    // Keep only last 100 browsing history items
    if (profile.browsingHistory.length > 100) {
      profile.browsingHistory = profile.browsingHistory.slice(-100);
    }

    profile.lastActive = new Date();

    // Save updated profile
    await this.saveUserProfile(profile);
  }

  /**
   * Queue event for batch processing
   */
  private async queueForProcessing(event: UserEvent) {
    const queueKey = 'events:queue';
    await this.redis.lpush(queueKey, event);
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<UserProfile> {
    const cacheKey = `profile:${this.userId}`;
    
    const cached = await this.redis.get<UserProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    // Default profile
    const profile: UserProfile = {
      userId: this.userId,
      segments: [],
      preferences: {},
      browsingHistory: [],
      purchaseHistory: [],
      categoryAffinity: {},
      brandAffinity: {},
      priceRange: { min: 0, max: 0, avg: 0 },
      lastActive: new Date(),
      totalSpent: 0,
      averageOrderValue: 0,
    };

    // Load from database
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    if (data) {
      Object.assign(profile, data);
    }

    // Cache for 1 hour
    await this.redis.set(cacheKey, profile, 3600);

    return profile;
  }

  /**
   * Save user profile
   */
  private async saveUserProfile(profile: UserProfile) {
    const cacheKey = `profile:${this.userId}`;
    
    // Update cache
    await this.redis.set(cacheKey, profile, 3600);

    // Persist to database asynchronously
    this.persistProfile(profile).catch(console.error);
  }

  /**
   * Persist profile to database
   */
  private async persistProfile(profile: UserProfile) {
    const supabase = await createClient();
    
    await supabase
      .from('user_profiles')
      .upsert({
        user_id: profile.userId,
        segments: profile.segments,
        preferences: profile.preferences,
        browsing_history: profile.browsingHistory,
        purchase_history: profile.purchaseHistory,
        category_affinity: profile.categoryAffinity,
        brand_affinity: profile.brandAffinity,
        price_range: profile.priceRange,
        last_active: profile.lastActive,
        total_spent: profile.totalSpent,
        average_order_value: profile.averageOrderValue,
        updated_at: new Date().toISOString(),
      });
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(options: {
    type: 'collaborative' | 'content-based' | 'popular' | 'trending';
    limit?: number;
    excludeProductIds?: string[];
    context?: Record<string, any>;
  }): Promise<Recommendation[]> {
    const cacheKey = `recs:${this.userId}:${options.type}:${options.limit || 10}`;
    
    const cached = await this.redis.get<Recommendation[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let recommendations: Recommendation[] = [];

    switch (options.type) {
      case 'collaborative':
        recommendations = await this.getCollaborativeFiltering(options.limit || 10);
        break;
      case 'content-based':
        recommendations = await this.getContentBased(options.limit || 10);
        break;
      case 'popular':
        recommendations = await this.getPopularProducts(options.limit || 10);
        break;
      case 'trending':
        recommendations = await this.getTrendingProducts(options.limit || 10);
        break;
    }

    // Filter out excluded products
    if (options.excludeProductIds) {
      recommendations = recommendations.filter(r => !options.excludeProductIds!.includes(r.productId));
    }

    // Cache for 1 hour
    await this.redis.set(cacheKey, recommendations, 3600);

    return recommendations;
  }

  /**
   * Collaborative filtering recommendations
   */
  private async getCollaborativeFiltering(limit: number): Promise<Recommendation[]> {
    const profile = await this.getUserProfile();

    // Find similar users based on purchase history
    const similarUsers = await this.findSimilarUsers(profile);
    
    // Get products purchased by similar users
    const recommendations = await this.getProductsFromUsers(similarUsers, profile.purchaseHistory.map(p => p.productId));

    return recommendations.slice(0, limit);
  }

  /**
   * Content-based recommendations
   */
  private async getContentBased(limit: number): Promise<Recommendation[]> {
    const profile = await this.getUserProfile();

    // Get products similar to user's browsing/purchase history
    const seedProducts = [
      ...profile.browsingHistory.slice(-10).map(h => h.productId),
      ...profile.purchaseHistory.slice(-5).map(h => h.productId),
    ];

    const recommendations: Recommendation[] = [];

    for (const productId of seedProducts) {
      const similar = await this.getSimilarProducts(productId, 5);
      recommendations.push(...similar);
    }

    // Deduplicate and score
    const unique = new Map<string, Recommendation>();
    recommendations.forEach(r => {
      if (!unique.has(r.productId)) {
        unique.set(r.productId, r);
      } else {
        // Combine scores
        unique.get(r.productId)!.score += r.score;
      }
    });

    return Array.from(unique.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get popular products
   */
  private async getPopularProducts(limit: number): Promise<Recommendation[]> {
    const popularKey = 'analytics:popular:products';
    
    const popular = await this.redis.get<Array<{ productId: string; score: number }>>(popularKey);
    
    if (!popular) {
      return [];
    }

    return popular.slice(0, limit).map(p => ({
      productId: p.productId,
      score: p.score,
      reason: 'Popular with other shoppers',
    }));
  }

  /**
   * Get trending products
   */
  private async getTrendingProducts(limit: number): Promise<Recommendation[]> {
    const trendingKey = 'analytics:trending:products';
    
    const trending = await this.redis.get<Array<{ productId: string; score: number }>>(trendingKey);
    
    if (!trending) {
      return [];
    }

    return trending.slice(0, limit).map(p => ({
      productId: p.productId,
      score: p.score,
      reason: 'Trending now',
    }));
  }

  /**
   * Find similar users
   */
  private async findSimilarUsers(profile: UserProfile): Promise<string[]> {
    const supabase = await createClient();
    
    // Find users with similar purchase patterns
    const { data } = await supabase.rpc('find_similar_users', {
      p_user_id: this.userId,
      p_limit: 50,
    });

    return data || [];
  }

  /**
   * Get products purchased by specific users
   */
  private async getProductsFromUsers(userIds: string[], excludeProductIds: string[]): Promise<Recommendation[]> {
    const supabase = await createClient();
    
    const { data } = await supabase
      .from('order_items')
      .select(`
        product_id,
        count,
        orders!inner(user_id)
      `)
      .in('orders.user_id', userIds)
      .not.in('product_id', excludeProductIds)
      .order('count', { ascending: false })
      .limit(100);

    return (data || []).map(item => ({
      productId: item.product_id,
      score: item.count,
      reason: 'Others like you bought this',
    }));
  }

  /**
   * Get similar products based on attributes
   */
  private async getSimilarProducts(productId: string, limit: number): Promise<Recommendation[]> {
    const supabase = await createClient();
    
    const { data } = await supabase.rpc('find_similar_products', {
      p_product_id: productId,
      p_limit: limit,
    });

    return (data || []).map((item: any) => ({
      productId: item.product_id,
      score: item.similarity,
      reason: 'Similar to items you viewed',
    }));
  }

  /**
   * Get product details
   */
  private async getProductDetails(productId: string): Promise<{ category: string; brand: string } | null> {
    const cacheKey = `product:${productId}`;
    
    const cached = await this.redis.get<{ category: string; brand: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = await createClient();
    const { data } = await supabase
      .from('products')
      .select('category, brand')
      .eq('id', productId)
      .single();

    if (data) {
      await this.redis.set(cacheKey, data, 3600);
    }

    return data;
  }

  /**
   * Get user segments
   */
  async getUserSegments(): Promise<string[]> {
    const profile = await this.getUserProfile();
    
    // Calculate segments based on behavior
    const segments: string[] = [];

    if (profile.totalSpent > 10000) {
      segments.push('high_value');
    } else if (profile.totalSpent > 1000) {
      segments.push('medium_value');
    }

    if (profile.purchaseHistory.length > 10) {
      segments.push('frequent_buyer');
    }

    if (profile.browsingHistory.length > 50) {
      segments.push('active_browser');
    }

    const daysSinceLastPurchase = this.getDaysSinceLastPurchase(profile);
    if (daysSinceLastPurchase > 30 && daysSinceLastPurchase < 90) {
      segments.push('lapsed');
    } else if (daysSinceLastPurchase > 90) {
      segments.push('churned');
    }

    // Check for first-time visitor
    if (profile.purchaseHistory.length === 0 && profile.browsingHistory.length < 5) {
      segments.push('first_time');
    }

    return segments;
  }

  /**
   * Calculate days since last purchase
   */
  private getDaysSinceLastPurchase(profile: UserProfile): number {
    if (profile.purchaseHistory.length === 0) {
      return Infinity;
    }

    const lastPurchase = profile.purchaseHistory[profile.purchaseHistory.length - 1];
    const days = (Date.now() - new Date(lastPurchase.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    
    return days;
  }

  /**
   * Get personalized pricing
   */
  async getPersonalizedPricing(productId: string, basePrice: number): Promise<number> {
    const segments = await this.getUserSegments();
    
    let multiplier = 1.0;

    if (segments.includes('high_value')) {
      multiplier = 0.9; // 10% discount for high-value customers
    } else if (segments.includes('lapsed')) {
      multiplier = 0.85; // 15% discount to win back
    } else if (segments.includes('first_time')) {
      multiplier = 0.8; // 20% discount for first-time
    }

    return Math.round(basePrice * multiplier);
  }

  /**
   * Get next best action
   */
  async getNextBestAction(): Promise<{ action: string; productId?: string; reason: string }> {
    const profile = await this.getUserProfile();
    const segments = await this.getUserSegments();

    // Determine next best action based on user state
    if (profile.purchaseHistory.length === 0) {
      // New user - recommend popular items
      const popular = await this.getPopularProducts(1);
      return {
        action: 'view_product',
        productId: popular[0]?.productId,
        reason: 'Start your shopping journey with our most popular item',
      };
    }

    if (segments.includes('lapsed')) {
      return {
        action: 'send_offer',
        reason: "We haven't seen you in a while - here's a special offer",
      };
    }

    // Recommend based on browsing history
    if (profile.browsingHistory.length > 0) {
      const lastViewed = profile.browsingHistory[profile.browsingHistory.length - 1];
      return {
        action: 'view_product',
        productId: lastViewed.productId,
        reason: 'Continue where you left off',
      };
    }

    // Default - show recommendations
    const recs = await this.getRecommendations({ type: 'popular', limit: 1 });
    return {
      action: 'view_recommendations',
      reason: 'Discover products tailored for you',
    };
  }
}
