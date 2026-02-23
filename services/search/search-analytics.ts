import { supabase } from '@/lib/supabase/client';
import { browserCache } from '../cache/browser-cache';

export interface SearchAnalyticsEvent {
  type: 'search' | 'click' | 'conversion' | 'impression' | 'filter' | 'sort';
  query?: string;
  productId?: string;
  position?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SearchAnalyticsMetrics {
  totalSearches: number;
  uniqueSearchers: number;
  clickThroughRate: number;
  conversionRate: number;
  averagePosition: number;
  zeroResultRate: number;
  popularQueries: Array<{ query: string; count: number; ctr: number }>;
  popularFilters: Array<{ filter: string; value: string; count: number }>;
  popularSorts: Array<{ sort: string; count: number }>;
  timeSeries: Array<{ date: string; searches: number; clicks: number }>;
}

export interface SearchQueryAnalysis {
  query: string;
  totalSearches: number;
  uniqueUsers: number;
  clicks: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  averagePosition: number;
  zeroResultCount: number;
  popularProducts: Array<{ productId: string; clicks: number; conversions: number }>;
  searchTerms: Array<{ term: string; frequency: number }>;
  relatedQueries: string[];
  seasonality: Record<string, number>;
}

export class SearchAnalyticsService {
  private static instance: SearchAnalyticsService;
  private readonly sessionId: string;
  private readonly analyticsQueue: SearchAnalyticsEvent[] = [];
  private isProcessingQueue = false;
  private readonly batchSize = 10;
  private readonly flushInterval = 5000; // 5 seconds

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startQueueProcessor();
    
    // Listen for page visibility changes
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushQueue();
        }
      });
      
      window.addEventListener('beforeunload', () => {
        this.flushQueue();
      });
    }
  }

  static getInstance(): SearchAnalyticsService {
    if (!SearchAnalyticsService.instance) {
      SearchAnalyticsService.instance = new SearchAnalyticsService();
    }
    return SearchAnalyticsService.instance;
  }

  trackSearch(query: string, filters?: Record<string, any>, sortBy?: string): void {
    const event: SearchAnalyticsEvent = {
      type: 'search',
      query,
      filters,
      sortBy,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metadata: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
      },
    };

    this.queueEvent(event);
    
    // Update search popularity in real-time cache
    this.updateSearchPopularity(query);
  }

  trackClick(query: string, productId: string, position: number): void {
    const event: SearchAnalyticsEvent = {
      type: 'click',
      query,
      productId,
      position,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metadata: {
        userAgent: navigator.userAgent,
      },
    };

    this.queueEvent(event);
    
    // Update product click analytics
    this.updateProductClickAnalytics(productId, query, position);
  }

  trackConversion(query: string, productId: string, orderId: string): void {
    const event: SearchAnalyticsEvent = {
      type: 'conversion',
      query,
      productId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metadata: {
        orderId,
        userAgent: navigator.userAgent,
      },
    };

    this.queueEvent(event);
    
    // Update product conversion analytics
    this.updateProductConversionAnalytics(productId, query);
  }

  trackImpression(query: string, productId: string, position: number): void {
    const event: SearchAnalyticsEvent = {
      type: 'impression',
      query,
      productId,
      position,
      sessionId: this.sessionId,
      timestamp: new Date(),
    };

    this.queueEvent(event);
  }

  trackFilter(query: string, filterName: string, filterValue: any): void {
    const event: SearchAnalyticsEvent = {
      type: 'filter',
      query,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metadata: {
        filterName,
        filterValue,
      },
    };

    this.queueEvent(event);
  }

  trackSort(query: string, sortBy: string): void {
    const event: SearchAnalyticsEvent = {
      type: 'sort',
      query,
      sessionId: this.sessionId,
      timestamp: new Date(),
      metadata: {
        sortBy,
      },
    };

    this.queueEvent(event);
  }

  async getSearchMetrics(
    startDate: Date,
    endDate: Date,
    filters?: {
      query?: string;
      category?: string;
      userId?: string;
    }
  ): Promise<SearchAnalyticsMetrics> {
    const cacheKey = `search-metrics:${startDate.toISOString()}:${endDate.toISOString()}:${JSON.stringify(filters || {})}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          // Build query for search events
          let query = supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('event_type', 'search');

          if (filters?.query) {
            query = query.eq('query', filters.query);
          }
          if (filters?.category) {
            query = query.eq('category', filters.category);
          }
          if (filters?.userId) {
            query = query.eq('user_id', filters.userId);
          }

          const { data: searchEvents, error: searchError } = await query;
          if (searchError) throw searchError;

          // Get click events
          const { data: clickEvents, error: clickError } = await supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('event_type', 'click');

          if (clickError) throw clickError;

          // Get conversion events
          const { data: conversionEvents, error: conversionError } = await supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('event_type', 'conversion');

          if (conversionError) throw conversionError;

          // Calculate metrics
          const totalSearches = searchEvents?.length || 0;
          const uniqueSearchers = new Set(searchEvents?.map(e => e.session_id) || []).size;
          
          const clicks = clickEvents?.length || 0;
          const conversions = conversionEvents?.length || 0;
          
          const clickThroughRate = totalSearches > 0 ? clicks / totalSearches : 0;
          const conversionRate = clicks > 0 ? conversions / clicks : 0;
          
          // Calculate average position for clicks
          const clickPositions = clickEvents?.map(e => e.position || 0).filter(p => p > 0) || [];
          const averagePosition = clickPositions.length > 0
            ? clickPositions.reduce((sum, pos) => sum + pos, 0) / clickPositions.length
            : 0;

          // Get zero result searches
          const { data: zeroResultEvents, error: zeroResultError } = await supabase
            .from('search_analytics')
            .select('query')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('event_type', 'search')
            .eq('result_count', 0);

          const zeroResultRate = totalSearches > 0
            ? (zeroResultEvents?.length || 0) / totalSearches
            : 0;

          // Get popular queries
          const queryCounts = new Map<string, { count: number; clicks: number }>();
          searchEvents?.forEach(event => {
            if (event.query) {
              const current = queryCounts.get(event.query) || { count: 0, clicks: 0 };
              queryCounts.set(event.query, {
                count: current.count + 1,
                clicks: current.clicks,
              });
            }
          });

          clickEvents?.forEach(event => {
            if (event.query) {
              const current = queryCounts.get(event.query) || { count: 0, clicks: 0 };
              queryCounts.set(event.query, {
                count: current.count,
                clicks: current.clicks + 1,
              });
            }
          });

          const popularQueries = Array.from(queryCounts.entries())
            .map(([query, stats]) => ({
              query,
              count: stats.count,
              ctr: stats.count > 0 ? stats.clicks / stats.count : 0,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

          // Get popular filters
          const filterCounts = new Map<string, Map<string, number>>();
          searchEvents?.forEach(event => {
            if (event.filters) {
              Object.entries(event.filters).forEach(([filter, value]) => {
                if (!filterCounts.has(filter)) {
                  filterCounts.set(filter, new Map());
                }
                const valueCounts = filterCounts.get(filter)!;
                const valueKey = String(value);
                valueCounts.set(valueKey, (valueCounts.get(valueKey) || 0) + 1);
              });
            }
          });

          const popularFilters: Array<{ filter: string; value: string; count: number }> = [];
          filterCounts.forEach((valueCounts, filter) => {
            valueCounts.forEach((count, value) => {
              popularFilters.push({ filter, value, count });
            });
          });

          popularFilters.sort((a, b) => b.count - a.count).slice(0, 10);

          // Get popular sorts
          const sortCounts = new Map<string, number>();
          searchEvents?.forEach(event => {
            if (event.sort_by) {
              sortCounts.set(event.sort_by, (sortCounts.get(event.sort_by) || 0) + 1);
            }
          });

          const popularSorts = Array.from(sortCounts.entries())
            .map(([sort, count]) => ({ sort, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          // Get time series data
          const timeSeries = await this.getTimeSeriesData(startDate, endDate);

          return {
            totalSearches,
            uniqueSearchers,
            clickThroughRate,
            conversionRate,
            averagePosition,
            zeroResultRate,
            popularQueries,
            popularFilters,
            popularSorts,
            timeSeries,
          };
        } catch (error) {
          console.error('Failed to get search metrics:', error);
          throw error;
        }
      },
      {
        maxAge: 5 * 60 * 1000, // 5 minutes cache
      }
    );
  }

  async analyzeQuery(query: string, days: number = 30): Promise<SearchQueryAnalysis> {
    const cacheKey = `query-analysis:${query}:${days}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          const endDate = new Date();

          // Get all events for this query
          const { data: searchEvents, error: searchError } = await supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('query', query);

          if (searchError) throw searchError;

          const { data: clickEvents, error: clickError } = await supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('query', query)
            .eq('event_type', 'click');

          if (clickError) throw clickError;

          const { data: conversionEvents, error: conversionError } = await supabase
            .from('search_analytics')
            .select('*')
            .gte('timestamp', startDate.toISOString())
            .lte('timestamp', endDate.toISOString())
            .eq('query', query)
            .eq('event_type', 'conversion');

          if (conversionError) throw conversionError;

          // Calculate basic metrics
          const totalSearches = searchEvents?.length || 0;
          const uniqueUsers = new Set(searchEvents?.map(e => e.user_id || e.session_id) || []).size;
          const clicks = clickEvents?.length || 0;
          const conversions = conversionEvents?.length || 0;
          const clickThroughRate = totalSearches > 0 ? clicks / totalSearches : 0;
          const conversionRate = clicks > 0 ? conversions / clicks : 0;

          // Calculate average position
          const clickPositions = clickEvents?.map(e => e.position || 0).filter(p => p > 0) || [];
          const averagePosition = clickPositions.length > 0
            ? clickPositions.reduce((sum, pos) => sum + pos, 0) / clickPositions.length
            : 0;

          // Count zero result searches
          const zeroResultCount = searchEvents?.filter(e => e.result_count === 0).length || 0;

          // Get popular products for this query
          const productClicks = new Map<string, { clicks: number; conversions: number }>();
          clickEvents?.forEach(event => {
            if (event.product_id) {
              const current = productClicks.get(event.product_id) || { clicks: 0, conversions: 0 };
              productClicks.set(event.product_id, {
                clicks: current.clicks + 1,
                conversions: current.conversions,
              });
            }
          });

          conversionEvents?.forEach(event => {
            if (event.product_id) {
              const current = productClicks.get(event.product_id) || { clicks: 0, conversions: 0 };
              productClicks.set(event.product_id, {
                clicks: current.clicks,
                conversions: current.conversions + 1,
              });
            }
          });

          const popularProducts = Array.from(productClicks.entries())
            .map(([productId, stats]) => ({
              productId,
              clicks: stats.clicks,
              conversions: stats.conversions,
            }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

          // Extract search terms
          const termFrequency = new Map<string, number>();
          const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          words.forEach(word => {
            termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
          });

          const searchTerms = Array.from(termFrequency.entries())
            .map(([term, frequency]) => ({ term, frequency }))
            .sort((a, b) => b.frequency - a.frequency);

          // Get related queries
          const relatedQueries = await this.getRelatedQueries(query);

          // Calculate seasonality
          const seasonality = await this.calculateQuerySeasonality(query, days);

          return {
            query,
            totalSearches,
            uniqueUsers,
            clicks,
            conversions,
            clickThroughRate,
            conversionRate,
            averagePosition,
            zeroResultCount,
            popularProducts,
            searchTerms,
            relatedQueries,
            seasonality,
          };
        } catch (error) {
          console.error('Failed to analyze query:', error);
          throw error;
        }
      },
      {
        maxAge: 10 * 60 * 1000, // 10 minutes cache
      }
    );
  }

  async getSearchPerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: SearchAnalyticsMetrics;
    topQueries: SearchQueryAnalysis[];
    recommendations: string[];
  }> {
    try {
      const summary = await this.getSearchMetrics(startDate, endDate);
      
      // Analyze top 5 queries
      const topQueries = await Promise.all(
        summary.popularQueries.slice(0, 5).map(async query => 
          this.analyzeQuery(query.query, 30)
        )
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(summary, topQueries);

      return {
        summary,
        topQueries,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  async exportAnalyticsData(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json'
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (format === 'csv') {
        return this.convertToCSV(data || []);
      } else {
        return JSON.stringify(data || [], null, 2);
      }
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  async clearOldAnalyticsData(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('search_analytics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) throw error;

      console.log(`Cleared analytics data older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to clear old analytics data:', error);
      throw error;
    }
  }

  private async getTimeSeriesData(startDate: Date, endDate: Date): Promise<Array<{ date: string; searches: number; clicks: number }>> {
    try {
      // Group by day
      const { data, error } = await supabase
        .rpc('get_search_time_series', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get time series data:', error);
      return [];
    }
  }

  private async getRelatedQueries(query: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_related_queries', {
          search_query: query,
          limit_count: 5,
        });

      if (error) throw error;

      return data?.map((item: any) => item.query) || [];
    } catch (error) {
      console.error('Failed to get related queries:', error);
      return [];
    }
  }

  private async calculateQuerySeasonality(query: string, days: number): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_query_seasonality', {
          search_query: query,
          days_count: days,
        });

      if (error) throw error;

      return data || {};
    } catch (error) {
      console.error('Failed to calculate query seasonality:', error);
      return {};
    }
  }

  private generateRecommendations(
    metrics: SearchAnalyticsMetrics,
    topQueries: SearchQueryAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // CTR recommendations
    if (metrics.clickThroughRate < 0.05) {
      recommendations.push(
        "Improve search result relevance. Consider adding synonyms for common queries.",
        "Optimize product titles and descriptions for better keyword matching."
      );
    }

    // Conversion rate recommendations
    if (metrics.conversionRate < 0.02) {
      recommendations.push(
        "Review pricing competitiveness for top-searched products.",
        "Improve product images and descriptions on search result pages."
      );
    }

    // Zero result rate recommendations
    if (metrics.zeroResultRate > 0.2) {
      recommendations.push(
        "Add synonyms and expand product catalog for queries with no results.",
        "Implement 'Did you mean?' suggestions for misspelled queries."
      );
    }

    // Average position recommendations
    if (metrics.averagePosition > 5) {
      recommendations.push(
        "Optimize ranking factors for products that receive clicks but are positioned low.",
        "Consider boosting popular products in search results."
      );
    }

    // Query-specific recommendations
    topQueries.forEach(query => {
      if (query.clickThroughRate < 0.1) {
        recommendations.push(
          `Optimize search results for "${query.query}" - low CTR indicates poor result relevance.`
        );
      }
      if (query.zeroResultCount > 0) {
        recommendations.push(
          `Add products for "${query.query}" - ${query.zeroResultCount} searches returned no results.`
        );
      }
    });

    return [...new Set(recommendations)].slice(0, 10);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2) + '_' + Date.now();
  }

  private queueEvent(event: SearchAnalyticsEvent): void {
    this.analyticsQueue.push(event);
    
    // If queue is getting large, trigger immediate processing
    if (this.analyticsQueue.length >= this.batchSize * 2) {
      this.processQueue();
    }
  }

  private startQueueProcessor(): void {
    // Process queue every flush interval
    setInterval(() => {
      if (this.analyticsQueue.length > 0) {
        this.processQueue();
      }
    }, this.flushInterval);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.analyticsQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Take a batch of events
      const batch = this.analyticsQueue.splice(0, this.batchSize);
      
      // Send to database
      await this.sendBatchToDatabase(batch);
      
      // If there are more events, process them
      if (this.analyticsQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    } catch (error) {
      console.error('Failed to process analytics queue:', error);
      
      // Put events back in queue for retry
      this.analyticsQueue.unshift(...batch);
      
      // Retry after delay
      setTimeout(() => this.processQueue(), 5000);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async sendBatchToDatabase(events: SearchAnalyticsEvent[]): Promise<void> {
    const records = events.map(event => ({
      event_type: event.type,
      query: event.query,
      product_id: event.productId,
      position: event.position,
      filters: event.filters,
      sort_by: event.sortBy,
      session_id: event.sessionId,
      user_id: event.userId,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
    }));

    const { error } = await supabase
      .from('search_analytics')
      .insert(records);

    if (error) throw error;
  }

  private async flushQueue(): Promise<void> {
    if (this.analyticsQueue.length === 0) return;
    
    try {
      await this.sendBatchToDatabase([...this.analyticsQueue]);
      this.analyticsQueue.length = 0; // Clear queue
    } catch (error) {
      console.error('Failed to flush analytics queue:', error);
      // Save to localStorage for later retry
      this.saveQueueToLocalStorage();
    }
  }

  private saveQueueToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const existing = localStorage.getItem('xarastore-analytics-queue');
      const existingQueue = existing ? JSON.parse(existing) : [];
      const combinedQueue = [...existingQueue, ...this.analyticsQueue];
      
      localStorage.setItem('xarastore-analytics-queue', JSON.stringify(combinedQueue));
      this.analyticsQueue.length = 0;
    } catch (error) {
      console.error('Failed to save analytics queue to localStorage:', error);
    }
  }

  private async updateSearchPopularity(query: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_search_popularity', {
        search_query: query,
      });

      if (error) {
        console.error('Failed to update search popularity:', error);
      }
    } catch (error) {
      console.error('Search popularity update failed:', error);
    }
  }

  private async updateProductClickAnalytics(productId: string, query: string, position: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_product_click_analytics', {
        p_product_id: productId,
        p_query: query,
        p_position: position,
      });

      if (error) {
        console.error('Failed to update product click analytics:', error);
      }
    } catch (error) {
      console.error('Product click analytics update failed:', error);
    }
  }

  private async updateProductConversionAnalytics(productId: string, query: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_product_conversion_analytics', {
        p_product_id: productId,
        p_query: query,
      });

      if (error) {
        console.error('Failed to update product conversion analytics:', error);
      }
    } catch (error) {
      console.error('Product conversion analytics update failed:', error);
    }
  }

  async retryFailedEvents(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('xarastore-analytics-queue');
      if (!stored) return;
      
      const failedEvents: SearchAnalyticsEvent[] = JSON.parse(stored).map((event: any) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      }));
      
      if (failedEvents.length > 0) {
        await this.sendBatchToDatabase(failedEvents);
        localStorage.removeItem('xarastore-analytics-queue');
        console.log(`Retried ${failedEvents.length} failed analytics events`);
      }
    } catch (error) {
      console.error('Failed to retry analytics events:', error);
    }
  }
}

export const searchAnalytics = SearchAnalyticsService.getInstance();

// Initialize retry on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    searchAnalytics.retryFailedEvents();
  }, 5000);
}0
