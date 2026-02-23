import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const paramsSchema = z.object({
  slug: z.string().min(1),
});

const querySchema = z.object({
  includeProducts: z.coerce.boolean().default(true),
  productLimit: z.coerce.number().min(1).max(100).default(12),
  productPage: z.coerce.number().min(1).max(100).default(1),
  sortBy: z.enum(['newest', 'price-low', 'price-high', 'rating', 'popular']).default('newest'),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  brands: z.string().optional(),
  availability: z.enum(['all', 'in-stock', 'out-of-stock']).default('all'),
  minRating: z.coerce.number().min(0).max(5).optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    
    const validation = paramsSchema.safeParse({ slug });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid category slug', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const params = {
      includeProducts: searchParams.get('includeProducts'),
      productLimit: searchParams.get('productLimit'),
      productPage: searchParams.get('productPage'),
      sortBy: searchParams.get('sortBy'),
      minPrice: searchParams.get('minPrice'),
      maxPrice: searchParams.get('maxPrice'),
      brands: searchParams.get('brands'),
      availability: searchParams.get('availability'),
      minRating: searchParams.get('minRating'),
    };

    const queryValidation = querySchema.safeParse(params);
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryValidation.error.errors },
        { status: 400 }
      );
    }

    const { 
      includeProducts, 
      productLimit, 
      productPage, 
      sortBy, 
      minPrice, 
      maxPrice, 
      brands, 
      availability,
      minRating 
    } = queryValidation.data;

    // Get category details
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select(`
        id,
        slug,
        name,
        description,
        image,
        product_count,
        parent_id,
        created_at,
        updated_at,
        parent:categories!parent_id(id, slug, name)
      `)
      .eq('slug', slug)
      .single();

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get subcategories
    const { data: subcategories } = await supabase
      .from('categories')
      .select(`
        id,
        slug,
        name,
        description,
        image,
        product_count
      `)
      .eq('parent_id', category.id)
      .order('name');

    // Get sibling categories
    const { data: siblings } = await supabase
      .from('categories')
      .select(`
        id,
        slug,
        name,
        description,
        image,
        product_count
      `)
      .eq('parent_id', category.parent_id)
      .neq('id', category.id)
      .order('name');

    // Get products if requested
    let products = [];
    let productCount = 0;
    let filters = null;

    if (includeProducts) {
      const from = (productPage - 1) * productLimit;
      const to = from + productLimit - 1;

      let productQuery = supabase
        .from('products')
        .select(`
          id,
          slug,
          name,
          description,
          price,
          original_price,
          images,
          rating,
          review_count,
          stock,
          is_featured,
          is_deal,
          deal_ends_at,
          brand:brands(id, name, slug, logo),
          category:categories(id, name, slug)
        `, { count: 'exact' })
        .eq('category_id', category.id);

      // Apply filters
      if (minPrice !== undefined) {
        productQuery = productQuery.gte('price', minPrice);
      }
      if (maxPrice !== undefined) {
        productQuery = productQuery.lte('price', maxPrice);
      }
      if (brands) {
        const brandIds = brands.split(',');
        productQuery = productQuery.in('brand_id', brandIds);
      }
      if (availability === 'in-stock') {
        productQuery = productQuery.gt('stock', 0);
      } else if (availability === 'out-of-stock') {
        productQuery = productQuery.eq('stock', 0);
      }
      if (minRating !== undefined) {
        productQuery = productQuery.gte('rating', minRating);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          productQuery = productQuery.order('price', { ascending: true });
          break;
        case 'price-high':
          productQuery = productQuery.order('price', { ascending: false });
          break;
        case 'rating':
          productQuery = productQuery.order('rating', { ascending: false });
          break;
        case 'popular':
          productQuery = productQuery.order('review_count', { ascending: false });
          break;
        default:
          productQuery = productQuery.order('created_at', { ascending: false });
      }

      const { data: productData, count, error: productError } = await productQuery.range(from, to);

      if (productError) {
        throw productError;
      }

      products = productData?.map(product => ({
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
        isFeatured: product.is_featured,
        isDeal: product.is_deal,
        dealEndsAt: product.deal_ends_at,
        brand: product.brand,
        category: product.category,
      })) || [];

      productCount = count || 0;

      // Get available filters for this category
      filters = await getCategoryFilters(category.id);
    }

    // Get popular brands in this category
    const { data: popularBrands } = await supabase
      .from('products')
      .select(`
        brand:brands(id, name, slug, logo, product_count)
      `)
      .eq('category_id', category.id)
      .limit(10);

    const uniqueBrands = Array.from(
      new Map(
        popularBrands
          ?.filter(item => item.brand)
          .map(item => [item.brand.id, item.brand])
      ).values()
    );

    // Build breadcrumb trail
    const breadcrumbs = await buildBreadcrumbs(category.id);

    const response = {
      success: true,
      data: {
        category: {
          id: category.id,
          slug: category.slug,
          name: category.name,
          description: category.description,
          image: category.image,
          productCount: category.product_count,
          parent: category.parent,
          createdAt: category.created_at,
          updatedAt: category.updated_at,
        },
        subcategories: subcategories || [],
        siblings: siblings || [],
        breadcrumbs,
        popularBrands: uniqueBrands,
        products: includeProducts ? {
          items: products,
          pagination: {
            page: productPage,
            limit: productLimit,
            total: productCount,
            totalPages: Math.ceil(productCount / productLimit),
            hasNextPage: (productPage * productLimit) < productCount,
            hasPreviousPage: productPage > 1,
          },
          filters,
          sortBy,
        } : null,
      },
      meta: {
        timestamp: new Date().toISOString(),
        cache: 'hit',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'X-Category-ID': category.id,
        'X-Product-Count': productCount.toString(),
      },
    });
  } catch (error: any) {
    console.error('Get category error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch category',
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

async function getCategoryFilters(categoryId: string) {
  try {
    // Get price range
    const { data: priceRange } = await supabase
      .from('products')
      .select('price')
      .eq('category_id', categoryId)
      .gt('stock', 0)
      .order('price', { ascending: true })
      .limit(1);

    const { data: maxPriceData } = await supabase
      .from('products')
      .select('price')
      .eq('category_id', categoryId)
      .gt('stock', 0)
      .order('price', { ascending: false })
      .limit(1);

    // Get brands with counts
    const { data: brandsData } = await supabase
      .from('products')
      .select(`
        brand:brands(id, name, slug),
        count
      `)
      .eq('category_id', categoryId)
      .group('brand_id, brand:id, brand:name, brand:slug');

    return {
      priceRange: {
        min: priceRange?.[0]?.price || 0,
        max: maxPriceData?.[0]?.price || 100000,
      },
      brands: brandsData?.map(item => ({
        id: item.brand.id,
        name: item.brand.name,
        slug: item.brand.slug,
        count: item.count,
      })) || [],
      availability: {
        inStock: await getProductCount(categoryId, 'in-stock'),
        outOfStock: await getProductCount(categoryId, 'out-of-stock'),
      },
    };
  } catch (error) {
    console.error('Failed to get category filters:', error);
    return null;
  }
}

async function getProductCount(categoryId: string, type: 'in-stock' | 'out-of-stock'): Promise<number> {
  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      [type === 'in-stock' ? 'gt' : 'eq']('stock', 0);

    return count || 0;
  } catch (error) {
    return 0;
  }
}

async function buildBreadcrumbs(categoryId: string): Promise<Array<{ id: string; slug: string; name: string }>> {
  const breadcrumbs: Array<{ id: string; slug: string; name: string }> = [];
  
  let currentId = categoryId;
  
  while (currentId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id, slug, name, parent_id')
      .eq('id', currentId)
      .single();

    if (!category) break;

    breadcrumbs.unshift({
      id: category.id,
      slug: category.slug,
      name: category.name,
    });

    currentId = category.parent_id || '';
  }

  // Add home breadcrumb
  breadcrumbs.unshift({
    id: 'home',
    slug: '',
    name: 'Home',
  });

  return breadcrumbs;
}
