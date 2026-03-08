import { createClient } from '../server';
import { cache } from 'react';

export const getCategories = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, name, description, parent_id, product_count, image')
      .order('product_count', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
});

export const getBrands = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('brands')
      .select('id, slug, name, logo, product_count')
      .order('product_count', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
});

export const getProductCounts = cache(async () => {
  try {
    const supabase = await createClient();
    
    const { data: categories } = await supabase
      .from('categories')
      .select('id, product_count');

    const { data: brands } = await supabase
      .from('brands')
      .select('id, product_count');

    const { count: total } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    return {
      total: total || 0,
      categories: categories?.reduce((acc, cat) => {
        acc[cat.id] = cat.product_count;
        return acc;
      }, {} as Record<string, number>) || {},
      brands: brands?.reduce((acc, brand) => {
        acc[brand.id] = brand.product_count;
        return acc;
      }, {} as Record<string, number>) || {},
    };
  } catch (error) {
    console.error('Error fetching product counts:', error);
    return { total: 0, categories: {}, brands: {} };
  }
});

export const getActiveFilters = cache(async (categorySlug: string, brandSlug: string) => {
  try {
    const supabase = await createClient();
    let category = null;
    let brand = null;

    if (categorySlug) {
      const { data } = await supabase
        .from('categories')
        .select('id, slug, name, description')
        .eq('slug', categorySlug)
        .single();
      category = data;
    }

    if (brandSlug) {
      const { data } = await supabase
        .from('brands')
        .select('id, slug, name, logo')
        .eq('slug', brandSlug)
        .single();
      brand = data;
    }

    return { category, brand };
  } catch (error) {
    console.error('Error fetching active filters:', error);
    return { category: null, brand: null };
  }
});

export const getShopProducts = cache(async (
  filters: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    page?: number;
    limit?: number;
    minRating?: number;
    inStockOnly?: boolean;
  }
) => {
  try {
    const supabase = await createClient();
    const page = filters.page || 1;
    const limit = filters.limit || 24;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `, { count: 'exact' });

    // Apply filters
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.brandId) {
      query = query.eq('brand_id', filters.brandId);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters.inStockOnly) {
      query = query.gt('stock', 0);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price_low':
        query = query.order('price', { ascending: true });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('name', { ascending: false });
        break;
      default:
        query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      products: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return { products: [], total: 0, page: 1, totalPages: 0 };
  }
});

export const getPriceRange = cache(async () => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('price')
      .order('price', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { min: 0, max: 0 };
    }

    const prices = data.map(p => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  } catch (error) {
    console.error('Error fetching price range:', error);
    return { min: 0, max: 0 };
  }
});

export const getPopularCategories = cache(async (limit: number = 6) => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('id, slug, name, image, product_count')
      .gt('product_count', 0)
      .order('product_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular categories:', error);
    return [];
  }
});

export const getTrendingProducts = cache(async (limit: number = 8) => {
  try {
    const supabase = await createClient();
    // Get products ordered by views or purchases (you would need to implement tracking)
    const { data, error } = await supabase
      .from('products')
      .select('*, brand:brands(*), category:categories(*)')
      .gt('stock', 0)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending products:', error);
    return [];
  }
});
