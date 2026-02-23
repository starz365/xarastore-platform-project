import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  page: z.coerce.number().min(1).max(100).default(1),
  limit: z.coerce.number().min(1).max(100).default(24),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  categories: z.string().optional(),
  brands: z.string().optional(),
  sortBy: z.enum(['newest', 'price-low', 'price-high', 'rating', 'popular']).default('newest'),
  availability: z.enum(['all', 'in-stock', 'out-of-stock']).default('all'),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate parameters
    const params = {
      q: searchParams.get('q') || undefined,
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      categories: searchParams.get('categories'),
      brands: searchParams.get('brands'),
      sortBy: searchParams.get('sortBy'),
      availability: searchParams.get('availability'),
      minRating: searchParams.get('minRating'),
    };

    const validation = searchSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { q, page, limit, minPrice, maxPrice, categories, brands, sortBy, availability, minRating } = validation.data;
    
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(id, name, slug, logo),
        category:categories(id, name, slug),
        variants:product_variants(*)
      `, { count: 'exact' });

    // Text search
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm},sku.ilike.${searchTerm}`);
    }

    // Price filter
    if (minPrice !== undefined) {
      query = query.gte('price', minPrice);
    }
    if (maxPrice !== undefined) {
      query = query.lte('price', maxPrice);
    }

    // Category filter
    if (categories) {
      const categoryIds = categories.split(',');
      query = query.in('category_id', categoryIds);
    }

    // Brand filter
    if (brands) {
      const brandIds = brands.split(',');
      query = query.in('brand_id', brandIds);
    }

    // Availability filter
    if (availability === 'in-stock') {
      query = query.gt('stock', 0);
    } else if (availability === 'out-of-stock') {
      query = query.eq('stock', 0);
    }

    // Rating filter
    if (minRating !== undefined) {
      query = query.gte('rating', minRating);
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'popular':
        query = query.order('review_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Execute query
    const { data: products, count, error } = await query.range(from, to);

    if (error) {
      throw error;
    }

    // Transform response
    const transformedProducts = products?.map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.original_price,
      images: product.images || [],
      rating: product.rating,
      reviewCount: product.review_count,
      stock: product.stock,
      brand: product.brand,
      category: product.category,
      variants: product.variants,
      isFeatured: product.is_featured,
      isDeal: product.is_deal,
      dealEndsAt: product.deal_ends_at,
    })) || [];

    // Get filters for response
    const filters = await getAvailableFilters(q, minPrice, maxPrice, categories, brands, availability);

    const response = {
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNextPage: (page * limit) < (count || 0),
          hasPreviousPage: page > 1,
        },
        filters,
        query: q,
      },
      meta: {
        timestamp: new Date().toISOString(),
        queryTime: Date.now(),
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
        'X-Total-Count': count?.toString() || '0',
      },
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error.message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}

async function getAvailableFilters(
  q?: string,
  minPrice?: number,
  maxPrice?: number,
  categories?: string,
  brands?: string,
  availability?: string
) {
  try {
    // Get price range
    const { data: priceRange } = await supabase
      .from('products')
      .select('price')
      .gt('stock', 0)
      .order('price', { ascending: true })
      .limit(1);

    const { data: maxPriceData } = await supabase
      .from('products')
      .select('price')
      .gt('stock', 0)
      .order('price', { ascending: false })
      .limit(1);

    // Get categories with counts
    const { data: categoriesData } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        slug,
        product_count
      `)
      .order('name');

    // Get brands with counts
    const { data: brandsData } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        slug,
        product_count
      `)
      .order('name');

    return {
      priceRange: {
        min: priceRange?.[0]?.price || 0,
        max: maxPriceData?.[0]?.price || 100000,
      },
      categories: categoriesData?.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.product_count,
      })) || [],
      brands: brandsData?.map(brand => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        count: brand.product_count,
      })) || [],
    };
  } catch (error) {
    console.error('Failed to get filters:', error);
    return null;
  }
}
