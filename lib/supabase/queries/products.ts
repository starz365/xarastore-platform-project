import { supabase } from '../client';
import { Product, Category, Brand } from '@/types';

// Add timeout to fetch operations
const FETCH_TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

export async function getFeaturedProducts(limit: number = 8): Promise<Product[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('is_featured', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    if (error) throw error;

    return (data || []).map(transformProduct);
  } catch (error) {
    // Don't log aborted requests
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching featured products:', error);
    return [];
  }
}

export async function getDeals(limit: number = 20): Promise<Product[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('is_deal', true)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    if (error) throw error;

    return (data || []).map(transformProduct);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching deals:', error);
    return [];
  }
}

export async function getFlashDeals(): Promise<Product[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('is_deal', true)
        .gt('stock', 0)
        .lte('deal_ends_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .order('deal_ends_at', { ascending: true })
        .limit(8)
    );

    if (error) throw error;

    return (data || []).map(transformProduct);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching flash deals:', error);
    return [];
  }
}

export async function getEndingSoonDeals(): Promise<Product[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('is_deal', true)
        .gt('stock', 0)
        .not('deal_ends_at', 'is', null)
        .lte('deal_ends_at', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
        .order('deal_ends_at', { ascending: true })
        .limit(8)
    );

    if (error) throw error;

    return (data || []).map(transformProduct);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching ending soon deals:', error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('slug', slug)
        .single()
    );

    if (error) throw error;
    if (!data) return null;

    return transformProduct(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    console.error('Error fetching product by slug:', error);
    return null;
  }
}

export async function getProductsByCategory(
  categorySlug: string,
  page: number = 1,
  pageSize: number = 24
): Promise<{ products: Product[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: category, error: categoryError } = await fetchWithTimeout(
      supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()
    );

    if (categoryError || !category) {
      return { products: [], total: 0 };
    }

    const { data: products, count, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `, { count: 'exact' })
        .eq('category_id', category.id)
        .gt('stock', 0)
        .order('created_at', { ascending: false })
        .range(from, to)
    );

    if (error) throw error;

    return {
      products: (products || []).map(transformProduct),
      total: count || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { products: [], total: 0 };
    }
    console.error('Error fetching products by category:', error);
    return { products: [], total: 0 };
  }
}

export async function searchProducts(
  query: string,
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    brandIds?: string[];
    categoryIds?: string[];
    sortBy?: string;
  },
  page: number = 1,
  pageSize: number = 24
): Promise<{ products: Product[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let supabaseQuery = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `, { count: 'exact' })
      .gt('stock', 0);

    // Text search
    if (query.trim()) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`
      );
    }

    // Price filter
    if (filters?.minPrice) {
      supabaseQuery = supabaseQuery.gte('price', filters.minPrice);
    }
    if (filters?.maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', filters.maxPrice);
    }

    // Brand filter
    if (filters?.brandIds?.length) {
      supabaseQuery = supabaseQuery.in('brand_id', filters.brandIds);
    }

    // Category filter
    if (filters?.categoryIds?.length) {
      supabaseQuery = supabaseQuery.in('category_id', filters.categoryIds);
    }

    // Sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price-low':
          supabaseQuery = supabaseQuery.order('price', { ascending: true });
          break;
        case 'price-high':
          supabaseQuery = supabaseQuery.order('price', { ascending: false });
          break;
        case 'newest':
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
          break;
        case 'rating':
          supabaseQuery = supabaseQuery.order('rating', { ascending: false });
          break;
        default:
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
      }
    } else {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
    }

    const { data, count, error } = await fetchWithTimeout(
      supabaseQuery.range(from, to)
    );

    if (error) throw error;

    return {
      products: (data || []).map(transformProduct),
      total: count || 0,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { products: [], total: 0 };
    }
    console.error('Error searching products:', error);
    return { products: [], total: 0 };
  }
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit: number = 4
): Promise<Product[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('category_id', categoryId)
        .neq('id', productId)
        .gt('stock', 0)
        .order('rating', { ascending: false })
        .limit(limit)
    );

    if (error) throw error;

    return (data || []).map(transformProduct);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching related products:', error);
    return [];
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('categories')
        .select('*')
        .order('name')
    );

    if (error) {
      // Don't log the full error object
      return [];
    }

    // Filter categories with product count > 0 if the column exists
    const categoriesWithProducts = (data || []).filter(cat => {
      // Check if product_count exists and is > 0, otherwise include all
      return cat.product_count === undefined || cat.product_count > 0;
    });

    return categoriesWithProducts;
  } catch (error) {
    // Silently fail and return empty array
    return [];
  }
}

export async function getBrands(): Promise<Brand[]> {
  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('brands')
        .select('*')
        .order('name')
    );

    if (error) throw error;

    return data || [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    console.error('Error fetching brands:', error);
    return [];
  }
}

export async function transformProduct(data: any): Product {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    price: parseFloat(data.price),
    originalPrice: data.original_price ? parseFloat(data.original_price) : undefined,
    sku: data.sku,
    brand: {
      id: data.brand?.id || '',
      slug: data.brand?.slug || '',
      name: data.brand?.name || '',
      logo: data.brand?.logo || '',
      productCount: data.brand?.product_count || 0,
    },
    category: {
      id: data.category?.id || '',
      slug: data.category?.slug || '',
      name: data.category?.name || '',
      productCount: data.category?.product_count || 0,
    },
    images: data.images || [],
    variants: data.variants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: parseFloat(v.price),
      originalPrice: v.original_price ? parseFloat(v.original_price) : undefined,
      sku: v.sku,
      stock: v.stock,
      attributes: v.attributes || {},
    })) || [],
    specifications: data.specifications || {},
    rating: parseFloat(data.rating) || 0,
    reviewCount: data.review_count || 0,
    stock: data.stock,
    isFeatured: data.is_featured || false,
    isDeal: data.is_deal || false,
    dealEndsAt: data.deal_ends_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
