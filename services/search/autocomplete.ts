import { supabase } from '@/lib/supabase/client';
import { browserCache } from '../cache/browser-cache';

export interface AutocompleteResult {
  text: string;
  type: 'product' | 'category' | 'brand' | 'search';
  id?: string;
  slug?: string;
  image?: string;
  metadata?: Record<string, any>;
  relevance: number;
}

export interface AutocompleteConfig {
  maxResults?: number;
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeBrands?: boolean;
  includePopularSearches?: boolean;
  minQueryLength?: number;
  categoryFilter?: string[];
  brandFilter?: string[];
}

export class AutocompleteService {
  private static instance: AutocompleteService;
  private readonly cacheTTL = 2 * 60 * 1000; // 2 minutes
  private readonly defaultConfig: AutocompleteConfig = {
    maxResults: 8,
    includeProducts: true,
    includeCategories: true,
    includeBrands: true,
    includePopularSearches: true,
    minQueryLength: 2,
  };

  private constructor() {}

  static getInstance(): AutocompleteService {
    if (!AutocompleteService.instance) {
      AutocompleteService.instance = new AutocompleteService();
    }
    return AutocompleteService.instance;
  }

  async getSuggestions(
    query: string,
    config?: AutocompleteConfig
  ): Promise<AutocompleteResult[]> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    
    // Validate query
    if (!query?.trim() || query.trim().length < mergedConfig.minQueryLength!) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `autocomplete:${normalizedQuery}:${JSON.stringify(mergedConfig)}`;

    return browserCache.get(
      cacheKey,
      async () => {
        const results = await Promise.all([
          mergedConfig.includeProducts ? this.getProductSuggestions(normalizedQuery, mergedConfig) : [],
          mergedConfig.includeCategories ? this.getCategorySuggestions(normalizedQuery, mergedConfig) : [],
          mergedConfig.includeBrands ? this.getBrandSuggestions(normalizedQuery, mergedConfig) : [],
          mergedConfig.includePopularSearches ? this.getPopularSearchSuggestions(normalizedQuery, mergedConfig) : [],
        ]);

        // Combine and sort all results by relevance
        const allResults = results.flat();
        return this.sortAndDeduplicate(allResults, normalizedQuery, mergedConfig.maxResults!);
      },
      {
        maxAge: this.cacheTTL,
        staleWhileRevalidate: this.cacheTTL * 2,
      }
    );
  }

  async getRecentSearches(userId?: string, limit: number = 5): Promise<string[]> {
    const cacheKey = `recent-searches:${userId || 'anonymous'}:${limit}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          if (userId) {
            // Get user-specific recent searches
            const { data, error } = await supabase
              .from('user_search_history')
              .select('query')
              .eq('user_id', userId)
              .order('searched_at', { ascending: false })
              .limit(limit);

            if (error) throw error;
            return (data || []).map(item => item.query);
          } else {
            // Get anonymous recent searches from localStorage
            if (typeof window !== 'undefined') {
              try {
                const recent = localStorage.getItem('xarastore-recent-searches');
                if (recent) {
                  return JSON.parse(recent).slice(0, limit);
                }
              } catch (error) {
                console.warn('Failed to load recent searches from localStorage:', error);
              }
            }
            return [];
          }
        } catch (error) {
          console.error('Failed to get recent searches:', error);
          return [];
        }
      },
      {
        maxAge: 30 * 1000, // 30 seconds for recent searches
      }
    );
  }

  async saveSearch(query: string, userId?: string): Promise<void> {
    if (!query.trim()) return;

    const normalizedQuery = query.trim().toLowerCase();

    try {
      if (userId) {
        // Save to database for logged-in users
        const { error } = await supabase
          .from('user_search_history')
          .upsert({
            user_id: userId,
            query: normalizedQuery,
            searched_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,query',
            ignoreDuplicates: false,
          });

        if (error) {
          console.error('Failed to save user search:', error);
        }
      }

      // Always save to localStorage for quick access
      if (typeof window !== 'undefined') {
        try {
          const recent = this.getRecentSearchesFromLocalStorage();
          const updated = [
            normalizedQuery,
            ...recent.filter(q => q !== normalizedQuery),
          ].slice(0, 10);
          
          localStorage.setItem('xarastore-recent-searches', JSON.stringify(updated));
        } catch (error) {
          console.warn('Failed to save search to localStorage:', error);
        }
      }

      // Update search popularity
      await this.updateSearchPopularity(normalizedQuery);
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  }

  async clearRecentSearches(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear from database
        const { error } = await supabase
          .from('user_search_history')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
      }

      // Clear from localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('xarastore-recent-searches');
        } catch (error) {
          console.warn('Failed to clear recent searches from localStorage:', error);
        }
      }

      // Clear cache
      const cacheKey = `recent-searches:${userId || 'anonymous'}:*`;
      await browserCache.delete(cacheKey);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
      throw error;
    }
  }

  async getTrendingSuggestions(category?: string, limit: number = 5): Promise<AutocompleteResult[]> {
    const cacheKey = `trending-suggestions:${category || 'all'}:${limit}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          // Get trending searches
          const { data: trendingSearches, error: searchError } = await supabase
            .from('search_logs')
            .select('query, category')
            .order('count', { ascending: false })
            .limit(limit * 2); // Get more to filter by category

          if (searchError) throw searchError;

          // Filter by category if specified
          const filteredSearches = category
            ? (trendingSearches || []).filter(s => s.category === category)
            : (trendingSearches || []);

          // Convert to autocomplete results
          const results: AutocompleteResult[] = filteredSearches
            .slice(0, limit)
            .map((search, index) => ({
              text: search.query,
              type: 'search' as const,
              relevance: 1.0 - (index * 0.1), // Slightly decreasing relevance
            }));

          return results;
        } catch (error) {
          console.error('Failed to get trending suggestions:', error);
          return [];
        }
      },
      {
        maxAge: 5 * 60 * 1000, // 5 minutes for trending data
      }
    );
  }

  async getPersonalizedSuggestions(userId: string, limit: number = 5): Promise<AutocompleteResult[]> {
    if (!userId) return [];

    const cacheKey = `personalized-suggestions:${userId}:${limit}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          // Get user's search history
          const { data: searchHistory, error: historyError } = await supabase
            .from('user_search_history')
            .select('query, category')
            .eq('user_id', userId)
            .order('searched_at', { ascending: false })
            .limit(20);

          if (historyError) throw historyError;

          if (!searchHistory || searchHistory.length === 0) {
            return [];
          }

          // Get user's purchase history categories
          const { data: purchaseCategories, error: purchaseError } = await supabase
            .from('orders')
            .select('items')
            .eq('user_id', userId)
            .limit(10);

          if (purchaseError) throw purchaseError;

          // Extract categories from purchase history
          const userCategories = new Set<string>();
          if (purchaseCategories) {
            purchaseCategories.forEach(order => {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                  if (item.category) {
                    userCategories.add(item.category);
                  }
                });
              }
            });
          }

          // Combine search history and purchase categories
          const suggestions = new Map<string, AutocompleteResult>();

          // Add searches from history
          searchHistory.forEach((search, index) => {
            if (!suggestions.has(search.query)) {
              suggestions.set(search.query, {
                text: search.query,
                type: 'search' as const,
                relevance: 0.9 - (index * 0.05),
                metadata: { source: 'history' },
              });
            }
          });

          // Add category-based suggestions
          if (userCategories.size > 0) {
            const categoriesArray = Array.from(userCategories);
            for (const category of categoriesArray.slice(0, 3)) {
              const categoryProducts = await this.getCategoryProductSuggestions(category, 2);
              categoryProducts.forEach(product => {
                if (!suggestions.has(product.text)) {
                  suggestions.set(product.text, {
                    ...product,
                    relevance: 0.8,
                    metadata: { source: 'category', category },
                  });
                }
              });
            }
          }

          return Array.from(suggestions.values())
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);
        } catch (error) {
          console.error('Failed to get personalized suggestions:', error);
          return [];
        }
      },
      {
        maxAge: 10 * 60 * 1000, // 10 minutes for personalized data
      }
    );
  }

  private async getProductSuggestions(
    query: string,
    config: AutocompleteConfig
  ): Promise<AutocompleteResult[]> {
    try {
      let supabaseQuery = supabase
        .from('products')
        .select('id, slug, name, images, brand:brands(name), rating, stock')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(config.maxResults! * 2); // Get more to filter

      // Apply filters
      if (config.categoryFilter && config.categoryFilter.length > 0) {
        supabaseQuery = supabaseQuery.in('category_id', config.categoryFilter);
      }

      if (config.brandFilter && config.brandFilter.length > 0) {
        supabaseQuery = supabaseQuery.in('brand_id', config.brandFilter);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      return (data || []).map(product => {
        const relevance = this.calculateProductRelevance(product, query);
        return {
          text: product.name,
          type: 'product' as const,
          id: product.id,
          slug: product.slug,
          image: product.images?.[0],
          metadata: {
            brand: product.brand?.name,
            rating: product.rating,
            stock: product.stock,
          },
          relevance,
        };
      });
    } catch (error) {
      console.error('Failed to get product suggestions:', error);
      return [];
    }
  }

  private async getCategorySuggestions(
    query: string,
    config: AutocompleteConfig
  ): Promise<AutocompleteResult[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, slug, name, product_count')
        .ilike('name', `%${query}%`)
        .limit(config.maxResults!);

      if (error) throw error;

      return (data || []).map(category => {
        const relevance = this.calculateCategoryRelevance(category, query);
        return {
          text: category.name,
          type: 'category' as const,
          id: category.id,
          slug: category.slug,
          metadata: {
            productCount: category.product_count,
          },
          relevance,
        };
      });
    } catch (error) {
      console.error('Failed to get category suggestions:', error);
      return [];
    }
  }

  private async getBrandSuggestions(
    query: string,
    config: AutocompleteConfig
  ): Promise<AutocompleteResult[]> {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, slug, name, product_count')
        .ilike('name', `%${query}%`)
        .limit(config.maxResults!);

      if (error) throw error;

      return (data || []).map(brand => {
        const relevance = this.calculateBrandRelevance(brand, query);
        return {
          text: brand.name,
          type: 'brand' as const,
          id: brand.id,
          slug: brand.slug,
          metadata: {
            productCount: brand.product_count,
          },
          relevance,
        };
      });
    } catch (error) {
      console.error('Failed to get brand suggestions:', error);
      return [];
    }
  }

  private async getPopularSearchSuggestions(
    query: string,
    config: AutocompleteConfig
  ): Promise<AutocompleteResult[]> {
    try {
      const { data, error } = await supabase
        .from('search_logs')
        .select('query, category')
        .ilike('query', `%${query}%`)
        .order('count', { ascending: false })
        .limit(config.maxResults!);

      if (error) throw error;

      return (data || []).map((search, index) => ({
        text: search.query,
        type: 'search' as const,
        metadata: {
          category: search.category,
        },
        relevance: 0.7 - (index * 0.05), // Lower relevance than direct matches
      }));
    } catch (error) {
      console.error('Failed to get popular search suggestions:', error);
      return [];
    }
  }

  private async getCategoryProductSuggestions(
    category: string,
    limit: number
  ): Promise<AutocompleteResult[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, slug, name, images')
        .eq('category.name', category)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(product => ({
        text: product.name,
        type: 'product' as const,
        id: product.id,
        slug: product.slug,
        image: product.images?.[0],
        relevance: 0.6,
      }));
    } catch (error) {
      console.error('Failed to get category product suggestions:', error);
      return [];
    }
  }

  private async updateSearchPopularity(query: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_search_count', {
        search_query: query,
      });

      if (error) {
        console.error('Failed to update search popularity:', error);
      }
    } catch (error) {
      console.error('Search popularity update failed:', error);
    }
  }

  private getRecentSearchesFromLocalStorage(): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const recent = localStorage.getItem('xarastore-recent-searches');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.warn('Failed to read recent searches from localStorage:', error);
      return [];
    }
  }

  private calculateProductRelevance(product: any, query: string): number {
    let relevance = 0.5;
    const name = product.name.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match in name
    if (name === queryLower) {
      relevance += 0.4;
    }
    // Name starts with query
    else if (name.startsWith(queryLower)) {
      relevance += 0.3;
    }
    // Name contains query
    else if (name.includes(queryLower)) {
      relevance += 0.2;
    }

    // Boost for in-stock items
    if (product.stock > 0) {
      relevance += 0.1;
    }

    // Boost for highly rated items
    if (product.rating >= 4.0) {
      relevance += 0.1;
    } else if (product.rating >= 3.0) {
      relevance += 0.05;
    }

    return Math.min(relevance, 1.0);
  }

  private calculateCategoryRelevance(category: any, query: string): number {
    let relevance = 0.4;
    const name = category.name.toLowerCase();
    const queryLower = query.toLowerCase();

    if (name === queryLower) {
      relevance += 0.3;
    } else if (name.startsWith(queryLower)) {
      relevance += 0.2;
    } else if (name.includes(queryLower)) {
      relevance += 0.1;
    }

    // Boost for popular categories
    if (category.product_count > 100) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  private calculateBrandRelevance(brand: any, query: string): number {
    let relevance = 0.4;
    const name = brand.name.toLowerCase();
    const queryLower = query.toLowerCase();

    if (name === queryLower) {
      relevance += 0.3;
    } else if (name.startsWith(queryLower)) {
      relevance += 0.2;
    } else if (name.includes(queryLower)) {
      relevance += 0.1;
    }

    // Boost for popular brands
    if (brand.product_count > 50) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  private sortAndDeduplicate(
    results: AutocompleteResult[],
    query: string,
    maxResults: number
  ): AutocompleteResult[] {
    // Deduplicate by text
    const seen = new Set<string>();
    const uniqueResults: AutocompleteResult[] = [];

    for (const result of results) {
      const key = `${result.type}:${result.text.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    // Sort by relevance (descending), then by type priority
    return uniqueResults
      .sort((a, b) => {
        if (Math.abs(b.relevance - a.relevance) > 0.1) {
          return b.relevance - a.relevance;
        }

        // Type priority: exact match > product > category > brand > search
        const typePriority: Record<string, number> = {
          'product': 4,
          'category': 3,
          'brand': 2,
          'search': 1,
        };

        const aPriority = a.text.toLowerCase() === query ? 5 : typePriority[a.type] || 0;
        const bPriority = b.text.toLowerCase() === query ? 5 : typePriority[b.type] || 0;

        return bPriority - aPriority;
      })
      .slice(0, maxResults);
  }
}

export const autocompleteService = AutocompleteService.getInstance();
