import { supabase } from '@/lib/supabase/client';
import { browserCache } from '../cache/browser-cache';
import { cacheInvalidation } from '../cache/cache-invalidation';

export interface SearchParams {
  query: string;
  filters?: {
    category?: string[];
    brand?: string[];
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    inStock?: boolean;
    isDeal?: boolean;
    attributes?: Record<string, string[]>;
  };
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popular';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  rating: number;
  reviewCount: number;
  stock: number;
  isDeal: boolean;
  dealEndsAt?: string;
  attributes?: Record<string, string>;
  relevanceScore: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    brands: Array<{ id: string; name: string; slug: string; count: number }>;
    priceRanges: Array<{ min: number; max: number; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
    attributes: Record<string, Array<{ value: string; count: number }>>;
  };
  suggestions?: string[];
  spellCheck?: {
    original: string;
    corrected: string;
    suggested: boolean;
  };
}

export class SearchClient {
  private static instance: SearchClient;
  private readonly cachePrefix = 'search';
  private readonly defaultPageSize = 24;
  private readonly maxQueryLength = 100;
  private readonly minQueryLength = 1;

  private constructor() {}

  static getInstance(): SearchClient {
    if (!SearchClient.instance) {
      SearchClient.instance = new SearchClient();
    }
    return SearchClient.instance;
  }

  async search(params: SearchParams): Promise<SearchResponse> {
    // Validate query
    if (!params.query?.trim() || params.query.trim().length < this.minQueryLength) {
      throw new Error('Search query is too short');
    }

    if (params.query.length > this.maxQueryLength) {
      throw new Error('Search query is too long');
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(params);
    
    // Try to get from cache first
    try {
      const cached = await browserCache.get<SearchResponse>(
        cacheKey,
        async () => this.performSearch(params),
        {
          maxAge: 2 * 60 * 1000, // 2 minutes
          staleWhileRevalidate: 5 * 60 * 1000, // 5 minutes
        }
      );
      
      return cached;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search failed. Please try again.');
    }
  }

  async autocomplete(query: string, limit: number = 5): Promise<Array<{
    text: string;
    type: 'product' | 'category' | 'brand';
    id?: string;
    slug?: string;
    image?: string;
    count?: number;
  }>> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const cacheKey = `autocomplete:${query.toLowerCase()}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        const results = await Promise.all([
          this.autocompleteProducts(query, limit),
          this.autocompleteCategories(query, Math.ceil(limit / 2)),
          this.autocompleteBrands(query, Math.ceil(limit / 2)),
        ]);

        // Combine and deduplicate results
        const allResults = results.flat();
        
        // Sort by relevance (exact matches first, then partial matches)
        return allResults.sort((a, b) => {
          const aExact = a.text.toLowerCase() === query.toLowerCase();
          const bExact = b.text.toLowerCase() === query.toLowerCase();
          
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          const aStartsWith = a.text.toLowerCase().startsWith(query.toLowerCase());
          const bStartsWith = b.text.toLowerCase().startsWith(query.toLowerCase());
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          
          return 0;
        }).slice(0, limit);
      },
      {
        maxAge: 30 * 1000, // 30 seconds
      }
    );
  }

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) {
      return [];
    }

    const cacheKey = `search-suggestions:${query.toLowerCase()}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          // Get popular searches that start with the query
          const { data, error } = await supabase
            .from('search_logs')
            .select('query')
            .ilike('query', `${query}%`)
            .order('count', { ascending: false })
            .limit(10);

          if (error) throw error;

          return [...new Set(data.map(item => item.query))].slice(0, 5);
        } catch (error) {
          console.error('Failed to get search suggestions:', error);
          return [];
        }
      },
      {
        maxAge: 60 * 1000, // 1 minute
      }
    );
  }

  async logSearch(query: string, resultsCount: number): Promise<void> {
    if (!query.trim()) return;

    try {
      // Update search log in database
      const { error } = await supabase.rpc('log_search', {
        search_query: query,
        results_count: resultsCount,
      });

      if (error) {
        console.error('Failed to log search:', error);
      }
    } catch (error) {
      console.error('Search logging failed:', error);
    }
  }

  async getPopularSearches(limit: number = 10): Promise<Array<{ query: string; count: number }>> {
    const cacheKey = `popular-searches:${limit}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          const { data, error } = await supabase
            .from('search_logs')
            .select('query, count')
            .order('count', { ascending: false })
            .limit(limit);

          if (error) throw error;
          return data || [];
        } catch (error) {
          console.error('Failed to get popular searches:', error);
          return [];
        }
      },
      {
        maxAge: 5 * 60 * 1000, // 5 minutes
      }
    );
  }

  async getTrendingSearches(hours: number = 24, limit: number = 10): Promise<string[]> {
    const cacheKey = `trending-searches:${hours}:${limit}`;
    
    return browserCache.get(
      cacheKey,
      async () => {
        try {
          const { data, error } = await supabase
            .from('search_logs')
            .select('query, count')
            .gte('last_searched_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
            .order('count', { ascending: false })
            .limit(limit);

          if (error) throw error;
          return (data || []).map(item => item.query);
        } catch (error) {
          console.error('Failed to get trending searches:', error);
          return [];
        }
      },
      {
        maxAge: 15 * 60 * 1000, // 15 minutes
      }
    );
  }

  private async performSearch(params: SearchParams): Promise<SearchResponse> {
    const page = params.page || 1;
    const pageSize = params.pageSize || this.defaultPageSize;
    const offset = (page - 1) * pageSize;

    try {
      // Call Supabase function for full-text search with facets
      const { data, error } = await supabase.rpc('search_products', {
        search_term: params.query,
        min_price: params.filters?.minPrice,
        max_price: params.filters?.maxPrice,
        category_ids: params.filters?.category,
        brand_ids: params.filters?.brand,
        min_rating: params.filters?.rating,
        in_stock_only: params.filters?.inStock,
        is_deal_only: params.filters?.isDeal,
        sort_by: params.sort || 'relevance',
        page: page,
        page_size: pageSize,
      });

      if (error) throw error;

      // Extract results and facets
      const results = data.results || [];
      const total = data.total || 0;
      const facets = data.facets || {
        categories: [],
        brands: [],
        priceRanges: [],
        ratings: [],
        attributes: {},
      };

      // Get search suggestions
      const suggestions = await this.getSearchSuggestions(params.query);

      // Check for spelling corrections
      const spellCheck = await this.checkSpelling(params.query);

      // Log the search for analytics
      this.logSearch(params.query, total).catch(() => {
        // Silent fail for logging
      });

      return {
        results: results.map(this.transformResult),
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
        facets,
        suggestions,
        spellCheck,
      };
    } catch (error) {
      console.error('Search execution error:', error);
      throw error;
    }
  }

  private async autocompleteProducts(query: string, limit: number) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, slug, name, images, brand:brands(name)')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map(product => ({
        text: product.name,
        type: 'product' as const,
        id: product.id,
        slug: product.slug,
        image: product.images?.[0],
      }));
    } catch (error) {
      console.error('Product autocomplete error:', error);
      return [];
    }
  }

  private async autocompleteCategories(query: string, limit: number) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, slug, name, product_count')
        .ilike('name', `%${query}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map(category => ({
        text: category.name,
        type: 'category' as const,
        id: category.id,
        slug: category.slug,
        count: category.product_count,
      }));
    } catch (error) {
      console.error('Category autocomplete error:', error);
      return [];
    }
  }

  private async autocompleteBrands(query: string, limit: number) {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, slug, name, product_count')
        .ilike('name', `%${query}%`)
        .limit(limit);

      if (error) throw error;

      return (data || []).map(brand => ({
        text: brand.name,
        type: 'brand' as const,
        id: brand.id,
        slug: brand.slug,
        count: brand.product_count,
      }));
    } catch (error) {
      console.error('Brand autocomplete error:', error);
      return [];
    }
  }

  private async checkSpelling(query: string) {
    // In a real implementation, this would use a spelling correction service
    // For now, we'll implement a simple dictionary-based approach
    const commonMisspellings: Record<string, string> = {
      'smatphone': 'smartphone',
      'labtop': 'laptop',
      'hedphones': 'headphones',
      'tv': 'television',
      'fridge': 'refrigerator',
      'ac': 'air conditioner',
    };

    const words = query.toLowerCase().split(' ');
    const corrections: string[] = [];
    let hasCorrection = false;

    for (const word of words) {
      const correction = commonMisspellings[word];
      if (correction) {
        corrections.push(correction);
        hasCorrection = true;
      } else {
        corrections.push(word);
      }
    }

    if (hasCorrection) {
      const corrected = corrections.join(' ');
      if (corrected !== query) {
        return {
          original: query,
          corrected,
          suggested: true,
        };
      }
    }

    return undefined;
  }

  private generateCacheKey(params: SearchParams): string {
    const components = [
      this.cachePrefix,
      params.query.toLowerCase().replace(/\s+/g, '-'),
      params.sort || 'relevance',
      params.page || 1,
      params.pageSize || this.defaultPageSize,
    ];

    if (params.filters) {
      if (params.filters.category) {
        components.push(`cat-${params.filters.category.sort().join('-')}`);
      }
      if (params.filters.brand) {
        components.push(`brand-${params.filters.brand.sort().join('-')}`);
      }
      if (params.filters.minPrice !== undefined) {
        components.push(`min-${params.filters.minPrice}`);
      }
      if (params.filters.maxPrice !== undefined) {
        components.push(`max-${params.filters.maxPrice}`);
      }
      if (params.filters.rating !== undefined) {
        components.push(`rating-${params.filters.rating}`);
      }
      if (params.filters.inStock !== undefined) {
        components.push(`stock-${params.filters.inStock}`);
      }
      if (params.filters.isDeal !== undefined) {
        components.push(`deal-${params.filters.isDeal}`);
      }
    }

    return components.join(':');
  }

  private transformResult(data: any): SearchResult {
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      originalPrice: data.original_price ? parseFloat(data.original_price) : undefined,
      images: data.images || [],
      brand: {
        id: data.brand_id,
        name: data.brand_name,
        slug: data.brand_slug,
      },
      category: {
        id: data.category_id,
        name: data.category_name,
        slug: data.category_slug,
      },
      rating: parseFloat(data.rating) || 0,
      reviewCount: data.review_count || 0,
      stock: data.stock,
      isDeal: data.is_deal,
      dealEndsAt: data.deal_ends_at,
      attributes: data.attributes || {},
      relevanceScore: data.relevance_score || 0,
    };
  }
}

export const searchClient = SearchClient.getInstance();
