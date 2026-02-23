import { supabase } from '../client';
import { Product } from '@/types';

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  brands?: string[];
  ratings?: number[];
  inStock?: boolean;
  isDeal?: boolean;
  isFeatured?: boolean;
  attributes?: Record<string, string[]>;
}

export interface SearchOptions {
  query?: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'price-low' | 'price-high' | 'rating' | 'newest' | 'popular';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  filters: {
    priceRange: { min: number; max: number };
    categories: Array<{ id: string; name: string; count: number }>;
    brands: Array<{ id: string; name: string; count: number }>;
    ratings: Array<{ rating: number; count: number }>;
  };
}

export async function searchProducts(
  options: SearchOptions = {}
): Promise<SearchResult> {
  try {
    const {
      query = '',
      filters = {},
      sortBy = 'relevance',
      page = 1,
      pageSize = 24,
    } = options;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Use Supabase RPC for full-text search with filters
    const { data, error } = await supabase.rpc('search_products', {
      search_term: query,
      min_price: filters.minPrice,
      max_price: filters.maxPrice,
      category_ids: filters.categories,
      brand_ids: filters.brands,
      min_rating: filters.ratings ? Math.min(...filters.ratings) : undefined,
      in_stock: filters.inStock,
      is_deal: filters.isDeal,
      is_featured: filters.isFeatured,
      sort_by: sortBy,
      page_offset: from,
      page_limit: pageSize,
    });

    if (error) throw error;

    // Get total count
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get filter options for the search results
    const filterOptions = await getFilterOptions(query, filters);

    return {
      products: (data || []).map(transformSearchResult),
      total: count || 0,
      filters: filterOptions,
    };
  } catch (error) {
    console.error('Error searching products:', error);
    return {
      products: [],
      total: 0,
      filters: {
        priceRange: { min: 0, max: 0 },
        categories: [],
        brands: [],
        ratings: [],
      },
    };
  }
}

export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<Array<{ type: 'product' | 'category' | 'brand'; id: string; name: string; slug: string }>> {
  try {
    if (!query.trim()) return [];

    const [
      { data: productResults },
      { data: categoryResults },
      { data: brandResults },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, slug')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit),
      supabase
        .from('categories')
        .select('id, name, slug')
        .ilike('name', `%${query}%`)
        .limit(limit),
      supabase
        .from('brands')
        .select('id, name, slug')
        .ilike('name', `%${query}%`)
        .limit(limit),
    ]);

    const suggestions: Array<{ type: 'product' | 'category' | 'brand'; id: string; name: string; slug: string }> = [];

    productResults?.forEach(product => {
      suggestions.push({
        type: 'product',
        id: product.id,
        name: product.name,
        slug: product.slug,
      });
    });

    categoryResults?.forEach(category => {
      suggestions.push({
        type: 'category',
        id: category.id,
        name: category.name,
        slug: category.slug,
      });
    });

    brandResults?.forEach(brand => {
      suggestions.push({
        type: 'brand',
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
      });
    });

    // Sort by relevance (exact matches first, then partial matches)
    return suggestions.sort((a, b) => {
      const aExact = a.name.toLowerCase().includes(query.toLowerCase());
      const bExact = b.name.toLowerCase().includes(query.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

export async function getPopularSearches(
  limit: number = 10
): Promise<Array<{ query: string; count: number }>> {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('query, count')
      .order('count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
}

export async function logSearch(query: string): Promise<void> {
  try {
    if (!query.trim()) return;

    await supabase.rpc('log_search_query', {
      p_query: query.toLowerCase(),
    });
  } catch (error) {
    console.error('Error logging search:', error);
  }
}

export async function getRelatedSearches(
  query: string,
  limit: number = 5
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('search_logs')
      .select('query')
      .neq('query', query.toLowerCase())
      .order('count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.map(item => item.query) || [];
  } catch (error) {
    console.error('Error fetching related searches:', error);
    return [];
  }
}

export async function getSearchAnalytics(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<{
  totalSearches: number;
  uniqueSearchers: number;
  topQueries: Array<{ query: string; count: number }>;
  noResultQueries: Array<{ query: string; count: number }>;
  conversionRate: number;
}> {
  try {
    const startDate = getPeriodStart(period);

    const [
      { count: totalSearches },
      { count: uniqueSearchers },
      { data: topQueries },
      { data: noResultQueries },
      { data: conversionData },
    ] = await Promise.all([
      supabase
        .from('search_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('search_logs')
        .select('user_id', { count: 'exact', head: true })
        .not('user_id', 'is', null)
        .gte('created_at', startDate.toISOString()),
      supabase
        .from('search_logs')
        .select('query, count')
        .gte('created_at', startDate.toISOString())
        .order('count', { ascending: false })
        .limit(10),
      supabase
        .from('search_logs')
        .select('query, count')
        .eq('has_results', false)
        .gte('created_at', startDate.toISOString())
        .order('count', { ascending: false })
        .limit(10),
      supabase.rpc('get_search_conversion_rate', {
        p_start_date: startDate.toISOString(),
      }),
    ]);

    return {
      totalSearches: totalSearches || 0,
      uniqueSearchers: uniqueSearchers || 0,
      topQueries: topQueries || [],
      noResultQueries: noResultQueries || [],
      conversionRate: conversionData?.[0]?.conversion_rate || 0,
    };
  } catch (error) {
    console.error('Error fetching search analytics:', error);
    return {
      totalSearches: 0,
      uniqueSearchers: 0,
      topQueries: [],
      noResultQueries: [],
      conversionRate: 0,
    };
  }
}

async function getFilterOptions(
  query: string,
  currentFilters: SearchFilters
): Promise<SearchResult['filters']> {
  try {
    const [
      { data: priceRange },
      { data: categories },
      { data: brands },
      { data: ratings },
    ] = await Promise.all([
      supabase.rpc('get_search_price_range', {
        p_query: query,
        p_filters: JSON.stringify(currentFilters),
      }),
      supabase.rpc('get_search_categories', {
        p_query: query,
        p_filters: JSON.stringify(currentFilters),
      }),
      supabase.rpc('get_search_brands', {
        p_query: query,
        p_filters: JSON.stringify(currentFilters),
      }),
      supabase.rpc('get_search_ratings', {
        p_query: query,
        p_filters: JSON.stringify(currentFilters),
      }),
    ]);

    return {
      priceRange: priceRange?.[0] || { min: 0, max: 0 },
      categories: categories || [],
      brands: brands || [],
      ratings: ratings || [],
    };
  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      priceRange: { min: 0, max: 0 },
      categories: [],
      brands: [],
      ratings: [],
    };
  }
}

function transformSearchResult(data: any): Product {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description || '',
    price: data.price,
    originalPrice: data.original_price,
    sku: data.sku,
    brand: {
      id: data.brand_id,
      slug: data.brand_slug,
      name: data.brand_name,
      logo: data.brand_logo,
      productCount: data.brand_product_count,
    },
    category: {
      id: data.category_id,
      slug: data.category_slug,
      name: data.category_name,
      productCount: data.category_product_count,
    },
    images: data.images || [],
    variants: [],
    specifications: {},
    rating: data.rating,
    reviewCount: data.review_count,
    stock: data.stock,
    isFeatured: data.is_featured,
    isDeal: data.is_deal,
    dealEndsAt: data.deal_ends_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function getPeriodStart(period: string): Date {
  const now = new Date();
  let start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return start;
}
