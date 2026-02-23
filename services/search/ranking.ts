import { supabase } from '@/lib/supabase/client';

export interface RankingFactors {
  // Text relevance factors
  titleMatch: number;
  descriptionMatch: number;
  categoryMatch: number;
  brandMatch: number;
  skuMatch: number;
  
  // Business factors
  rating: number;
  reviewCount: number;
  salesCount: number;
  stockLevel: number;
  isFeatured: boolean;
  isDeal: boolean;
  profitMargin: number;
  
  // Recency factors
  createdAt: Date;
  updatedAt: Date;
  
  // User behavior factors
  clickThroughRate: number;
  conversionRate: number;
  bounceRate: number;
  
  // External factors
  seasonality: number;
  trending: boolean;
  competitorPrice: number;
}

export interface RankingWeights {
  // Text relevance weights (total: 40%)
  titleWeight: number;
  descriptionWeight: number;
  categoryWeight: number;
  brandWeight: number;
  skuWeight: number;
  
  // Business weights (total: 30%)
  ratingWeight: number;
  reviewCountWeight: number;
  salesWeight: number;
  stockWeight: number;
  featuredWeight: number;
  dealWeight: number;
  profitWeight: number;
  
  // Recency weights (total: 10%)
  recencyWeight: number;
  freshnessWeight: number;
  
  // User behavior weights (total: 15%)
  ctrWeight: number;
  conversionWeight: number;
  bounceWeight: number;
  
  // External weights (total: 5%)
  seasonalityWeight: number;
  trendingWeight: number;
  competitionWeight: number;
}

export interface RankingResult {
  productId: string;
  score: number;
  breakdown: {
    textRelevance: number;
    businessMetrics: number;
    recency: number;
    userBehavior: number;
    externalFactors: number;
  };
  factors: Partial<RankingFactors>;
}

export class SearchRankingEngine {
  private static instance: SearchRankingEngine;
  private defaultWeights: RankingWeights = {
    // Text relevance
    titleWeight: 0.20,
    descriptionWeight: 0.10,
    categoryWeight: 0.05,
    brandWeight: 0.03,
    skuWeight: 0.02,
    
    // Business metrics
    ratingWeight: 0.08,
    reviewCountWeight: 0.04,
    salesWeight: 0.06,
    stockWeight: 0.04,
    featuredWeight: 0.04,
    dealWeight: 0.03,
    profitWeight: 0.01,
    
    // Recency
    recencyWeight: 0.06,
    freshnessWeight: 0.04,
    
    // User behavior
    ctrWeight: 0.06,
    conversionWeight: 0.05,
    bounceWeight: 0.04,
    
    // External factors
    seasonalityWeight: 0.02,
    trendingWeight: 0.02,
    competitionWeight: 0.01,
  };

  private constructor() {
    this.loadCustomWeights();
  }

  static getInstance(): SearchRankingEngine {
    if (!SearchRankingEngine.instance) {
      SearchRankingEngine.instance = new SearchRankingEngine();
    }
    return SearchRankingEngine.instance;
  }

  async rankProducts(
    products: Array<{ id: string; [key: string]: any }>,
    query: string,
    context?: {
      userId?: string;
      categoryId?: string;
      season?: string;
    }
  ): Promise<RankingResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const rankingPromises = products.map(product =>
      this.calculateRanking(product, normalizedQuery, context)
    );

    const results = await Promise.all(rankingPromises);
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  async calculateRanking(
    product: any,
    query: string,
    context?: {
      userId?: string;
      categoryId?: string;
      season?: string;
    }
  ): Promise<RankingResult> {
    // Get all ranking factors
    const factors = await this.calculateFactors(product, query, context);
    
    // Calculate individual scores
    const textRelevance = this.calculateTextRelevance(factors);
    const businessMetrics = this.calculateBusinessMetrics(factors);
    const recency = this.calculateRecency(factors);
    const userBehavior = this.calculateUserBehavior(factors);
    const externalFactors = this.calculateExternalFactors(factors, context);
    
    // Calculate weighted total score
    const weights = this.getWeightsForContext(context);
    const score = (
      textRelevance * this.getTextRelevanceWeight(weights) +
      businessMetrics * this.getBusinessMetricsWeight(weights) +
      recency * this.getRecencyWeight(weights) +
      userBehavior * this.getUserBehaviorWeight(weights) +
      externalFactors * this.getExternalFactorsWeight(weights)
    ) * 100; // Scale to 0-100

    return {
      productId: product.id,
      score: Math.min(Math.max(score, 0), 100), // Clamp between 0 and 100
      breakdown: {
        textRelevance,
        businessMetrics,
        recency,
        userBehavior,
        externalFactors,
      },
      factors,
    };
  }

  async updateRankingWeights(weights: Partial<RankingWeights>): Promise<void> {
    try {
      // Store in database for persistence
      const { error } = await supabase
        .from('ranking_config')
        .upsert({
          id: 'default_weights',
          weights: { ...this.defaultWeights, ...weights },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
      
      // Update in memory
      this.defaultWeights = { ...this.defaultWeights, ...weights };
      
      console.log('Updated ranking weights');
    } catch (error) {
      console.error('Failed to update ranking weights:', error);
      throw error;
    }
  }

  async getRankingStats(): Promise<{
    averageScore: number;
    scoreDistribution: Array<{ range: string; count: number }>;
    topPerformingCategories: Array<{ category: string; averageScore: number }>;
    weights: RankingWeights;
  }> {
    try {
      // Calculate average score for recent searches
      const { data: recentRankings, error } = await supabase
        .from('search_ranking_logs')
        .select('score, category')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      if (error) throw error;

      const scores = (recentRankings || []).map(r => r.score);
      const averageScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

      // Score distribution
      const distribution = this.calculateScoreDistribution(scores);

      // Top performing categories
      const categoryScores = new Map<string, { sum: number; count: number }>();
      (recentRankings || []).forEach(rating => {
        if (rating.category) {
          const current = categoryScores.get(rating.category) || { sum: 0, count: 0 };
          categoryScores.set(rating.category, {
            sum: current.sum + rating.score,
            count: current.count + 1,
          });
        }
      });

      const topPerformingCategories = Array.from(categoryScores.entries())
        .map(([category, stats]) => ({
          category,
          averageScore: stats.sum / stats.count,
        }))
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5);

      return {
        averageScore,
        scoreDistribution: distribution,
        topPerformingCategories,
        weights: this.defaultWeights,
      };
    } catch (error) {
      console.error('Failed to get ranking stats:', error);
      throw error;
    }
  }

  async logRanking(
    productId: string,
    score: number,
    context: {
      query: string;
      position: number;
      userId?: string;
      category?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('search_ranking_logs')
        .insert({
          product_id: productId,
          score,
          query: context.query,
          position: context.position,
          user_id: context.userId,
          category: context.category,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to log ranking:', error);
      }
    } catch (error) {
      console.error('Ranking logging failed:', error);
    }
  }

  async optimizeRanking(): Promise<void> {
    try {
      console.log('Starting ranking optimization...');
      
      // Analyze recent ranking performance
      const stats = await this.getRankingStats();
      
      // Adjust weights based on performance
      await this.adjustWeightsBasedOnPerformance(stats);
      
      // Update trending scores
      await this.updateTrendingScores();
      
      // Update seasonality factors
      await this.updateSeasonalityFactors();
      
      console.log('Ranking optimization completed');
    } catch (error) {
      console.error('Ranking optimization failed:', error);
      throw error;
    }
  }

  private async calculateFactors(
    product: any,
    query: string,
    context?: any
  ): Promise<Partial<RankingFactors>> {
    const factors: Partial<RankingFactors> = {};
    const now = new Date();
    
    // Text relevance factors
    factors.titleMatch = this.calculateTextMatch(product.name, query);
    factors.descriptionMatch = this.calculateTextMatch(product.description || '', query);
    factors.categoryMatch = this.calculateTextMatch(product.category?.name || '', query);
    factors.brandMatch = this.calculateTextMatch(product.brand?.name || '', query);
    factors.skuMatch = product.sku?.toLowerCase() === query ? 1 : 0;
    
    // Business factors
    factors.rating = parseFloat(product.rating) || 0;
    factors.reviewCount = product.review_count || 0;
    factors.salesCount = await this.getSalesCount(product.id);
    factors.stockLevel = this.normalizeStockLevel(product.stock);
    factors.isFeatured = product.is_featured || false;
    factors.isDeal = product.is_deal || false;
    factors.profitMargin = await this.getProfitMargin(product.id);
    
    // Recency factors
    factors.createdAt = new Date(product.created_at);
    factors.updatedAt = new Date(product.updated_at);
    
    // User behavior factors
    const userBehavior = await this.getUserBehavior(product.id);
    factors.clickThroughRate = userBehavior.ctr;
    factors.conversionRate = userBehavior.conversion;
    factors.bounceRate = userBehavior.bounce;
    
    // External factors
    factors.seasonality = await this.getSeasonalityFactor(product.category_id, context?.season);
    factors.trending = await this.isTrending(product.id);
    factors.competitorPrice = await this.getCompetitorPrice(product.id);
    
    return factors;
  }

  private calculateTextMatch(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (textLower === queryLower) return 1.0;
    if (textLower.startsWith(queryLower)) return 0.8;
    if (textLower.includes(queryLower)) return 0.6;
    
    // Check for partial matches (words)
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    const textWords = textLower.split(/\s+/);
    
    let matchScore = 0;
    for (const queryWord of queryWords) {
      for (const textWord of textWords) {
        if (textWord.includes(queryWord)) {
          matchScore += 0.2;
          break;
        }
      }
    }
    
    return Math.min(matchScore, 0.5);
  }

  private async getSalesCount(productId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('quantity', { count: 'exact', head: true })
        .eq('product_id', productId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Failed to get sales count:', error);
      return 0;
    }
  }

  private normalizeStockLevel(stock: number): number {
    if (stock <= 0) return 0;
    if (stock >= 100) return 1.0;
    if (stock >= 50) return 0.8;
    if (stock >= 20) return 0.6;
    if (stock >= 10) return 0.4;
    if (stock >= 5) return 0.2;
    return 0.1;
  }

  private async getProfitMargin(productId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('price, cost_price')
        .eq('id', productId)
        .single();

      if (error || !data) return 0.3; // Default 30%
      
      const price = parseFloat(data.price);
      const cost = parseFloat(data.cost_price) || price * 0.7;
      
      if (cost <= 0) return 0.3;
      return Math.min((price - cost) / price, 0.7);
    } catch (error) {
      console.error('Failed to get profit margin:', error);
      return 0.3;
    }
  }

  private async getUserBehavior(productId: string): Promise<{ ctr: number; conversion: number; bounce: number }> {
    try {
      const { data, error } = await supabase
        .from('product_analytics')
        .select('impressions, clicks, purchases, bounces')
        .eq('product_id', productId)
        .single();

      if (error || !data) {
        return { ctr: 0.05, conversion: 0.02, bounce: 0.4 };
      }

      const impressions = data.impressions || 1;
      const clicks = data.clicks || 0;
      const purchases = data.purchases || 0;
      const bounces = data.bounces || 0;

      return {
        ctr: clicks / impressions,
        conversion: purchases / Math.max(clicks, 1),
        bounce: bounces / Math.max(clicks, 1),
      };
    } catch (error) {
      console.error('Failed to get user behavior:', error);
      return { ctr: 0.05, conversion: 0.02, bounce: 0.4 };
    }
  }

  private async getSeasonalityFactor(categoryId: string, season?: string): Promise<number> {
    const currentSeason = season || this.getCurrentSeason();
    
    try {
      const { data, error } = await supabase
        .from('seasonality_factors')
        .select('factor')
        .eq('category_id', categoryId)
        .eq('season', currentSeason)
        .single();

      if (error || !data) return 1.0;
      return data.factor;
    } catch (error) {
      console.error('Failed to get seasonality factor:', error);
      return 1.0;
    }
  }

  private async isTrending(productId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('product_analytics')
        .select('trending_score')
        .eq('product_id', productId)
        .single();

      if (error || !data) return false;
      return (data.trending_score || 0) > 0.7;
    } catch (error) {
      console.error('Failed to check trending status:', error);
      return false;
    }
  }

  private async getCompetitorPrice(productId: string): Promise<number> {
    // This would typically call an external competitor pricing API
    // For now, return a default value
    return 1.0;
  }

  private calculateTextRelevance(factors: Partial<RankingFactors>): number {
    const weights = this.defaultWeights;
    const totalTextWeight = 
      weights.titleWeight +
      weights.descriptionWeight +
      weights.categoryWeight +
      weights.brandWeight +
      weights.skuWeight;

    if (totalTextWeight === 0) return 0;

    const score = (
      (factors.titleMatch || 0) * weights.titleWeight +
      (factors.descriptionMatch || 0) * weights.descriptionWeight +
      (factors.categoryMatch || 0) * weights.categoryWeight +
      (factors.brandMatch || 0) * weights.brandWeight +
      (factors.skuMatch || 0) * weights.skuWeight
    ) / totalTextWeight;

    return Math.min(score, 1.0);
  }

  private calculateBusinessMetrics(factors: Partial<RankingFactors>): number {
    const weights = this.defaultWeights;
    const totalBusinessWeight = 
      weights.ratingWeight +
      weights.reviewCountWeight +
      weights.salesWeight +
      weights.stockWeight +
      weights.featuredWeight +
      weights.dealWeight +
      weights.profitWeight;

    if (totalBusinessWeight === 0) return 0;

    const normalizedReviewCount = Math.min((factors.reviewCount || 0) / 100, 1.0);
    const normalizedSales = Math.min((factors.salesCount || 0) / 1000, 1.0);

    const score = (
      (factors.rating || 0) / 5 * weights.ratingWeight +
      normalizedReviewCount * weights.reviewCountWeight +
      normalizedSales * weights.salesWeight +
      (factors.stockLevel || 0) * weights.stockWeight +
      (factors.isFeatured ? 1 : 0) * weights.featuredWeight +
      (factors.isDeal ? 1 : 0) * weights.dealWeight +
      (factors.profitMargin || 0) * weights.profitWeight
    ) / totalBusinessWeight;

    return Math.min(score, 1.0);
  }

  private calculateRecency(factors: Partial<RankingFactors>): number {
    const weights = this.defaultWeights;
    const totalRecencyWeight = weights.recencyWeight + weights.freshnessWeight;
    
    if (totalRecencyWeight === 0) return 0;

    const now = new Date();
    const daysSinceCreation = Math.max((now.getTime() - (factors.createdAt?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24), 0);
    const daysSinceUpdate = Math.max((now.getTime() - (factors.updatedAt?.getTime() || now.getTime())) / (1000 * 60 * 60 * 24), 0);

    const recencyScore = Math.max(0, 1 - (daysSinceCreation / 365));
    const freshnessScore = Math.max(0, 1 - (daysSinceUpdate / 30));

    const score = (
      recencyScore * weights.recencyWeight +
      freshnessScore * weights.freshnessWeight
    ) / totalRecencyWeight;

    return Math.min(score, 1.0);
  }

  private calculateUserBehavior(factors: Partial<RankingFactors>): number {
    const weights = this.defaultWeights;
    const totalUserWeight = weights.ctrWeight + weights.conversionWeight + weights.bounceWeight;
    
    if (totalUserWeight === 0) return 0;

    const ctrScore = Math.min((factors.clickThroughRate || 0) / 0.1, 1.0); // Normalize to 10% CTR
    const conversionScore = Math.min((factors.conversionRate || 0) / 0.05, 1.0); // Normalize to 5% conversion
    const bounceScore = Math.max(0, 1 - ((factors.bounceRate || 0) / 0.5)); // Lower bounce is better

    const score = (
      ctrScore * weights.ctrWeight +
      conversionScore * weights.conversionWeight +
      bounceScore * weights.bounceWeight
    ) / totalUserWeight;

    return Math.min(score, 1.0);
  }

  private calculateExternalFactors(factors: Partial<RankingFactors>, context?: any): number {
    const weights = this.defaultWeights;
    const totalExternalWeight = weights.seasonalityWeight + weights.trendingWeight + weights.competitionWeight;
    
    if (totalExternalWeight === 0) return 0;

    const seasonalityScore = factors.seasonality || 1.0;
    const trendingScore = factors.trending ? 1.0 : 0.5;
    const competitionScore = factors.competitorPrice || 1.0;

    const score = (
      seasonalityScore * weights.seasonalityWeight +
      trendingScore * weights.trendingWeight +
      competitionScore * weights.competitionWeight
    ) / totalExternalWeight;

    return Math.min(score, 1.0);
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private getWeightsForContext(context?: any): RankingWeights {
    // In a real implementation, this would adjust weights based on context
    // For example, boost business metrics for B2B customers
    return this.defaultWeights;
  }

  private getTextRelevanceWeight(weights: RankingWeights): number {
    return weights.titleWeight + weights.descriptionWeight + weights.categoryWeight + 
           weights.brandWeight + weights.skuWeight;
  }

  private getBusinessMetricsWeight(weights: RankingWeights): number {
    return weights.ratingWeight + weights.reviewCountWeight + weights.salesWeight + 
           weights.stockWeight + weights.featuredWeight + weights.dealWeight + 
           weights.profitWeight;
  }

  private getRecencyWeight(weights: RankingWeights): number {
    return weights.recencyWeight + weights.freshnessWeight;
  }

  private getUserBehaviorWeight(weights: RankingWeights): number {
    return weights.ctrWeight + weights.conversionWeight + weights.bounceWeight;
  }

  private getExternalFactorsWeight(weights: RankingWeights): number {
    return weights.seasonalityWeight + weights.trendingWeight + weights.competitionWeight;
  }

  private calculateScoreDistribution(scores: number[]): Array<{ range: string; count: number }> {
    const ranges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' },
    ];

    return ranges.map(range => ({
      range: range.label,
      count: scores.filter(score => score >= range.min && score <= range.max).length,
    }));
  }

  private async loadCustomWeights(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('ranking_config')
        .select('weights')
        .eq('id', 'default_weights')
        .single();

      if (error || !data) {
        console.log('Using default ranking weights');
        return;
      }

      this.defaultWeights = { ...this.defaultWeights, ...data.weights };
      console.log('Loaded custom ranking weights');
    } catch (error) {
      console.error('Failed to load custom weights:', error);
    }
  }

  private async adjustWeightsBasedOnPerformance(stats: any): Promise<void> {
    // Simple adjustment: if average score is too low, boost text relevance
    // if average score is too high, boost business metrics
    if (stats.averageScore < 40) {
      await this.updateRankingWeights({
        titleWeight: this.defaultWeights.titleWeight * 1.1,
        descriptionWeight: this.defaultWeights.descriptionWeight * 1.1,
      });
    } else if (stats.averageScore > 80) {
      await this.updateRankingWeights({
        ratingWeight: this.defaultWeights.ratingWeight * 1.1,
        salesWeight: this.defaultWeights.salesWeight * 1.1,
      });
    }
  }

  private async updateTrendingScores(): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_trending_scores');
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update trending scores:', error);
    }
  }

  private async updateSeasonalityFactors(): Promise<void> {
    try {
      const season = this.getCurrentSeason();
      const { error } = await supabase.rpc('update_seasonality_factors', {
        current_season: season,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update seasonality factors:', error);
    }
  }
}

export const rankingEngine = SearchRankingEngine.getInstance();
