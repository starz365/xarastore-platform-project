
import { NextRequest, NextResponse } from 'next/server';
import { getShopProducts } from '@/lib/supabase/queries/shop';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const search = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const minPrice = searchParams.get('min_price') ? parseInt(searchParams.get('min_price')!) : undefined;
    const maxPrice = searchParams.get('max_price') ? parseInt(searchParams.get('max_price')!) : undefined;
    const sortBy = searchParams.get('sort') || 'featured';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 24;
    const minRating = searchParams.get('rating') ? parseInt(searchParams.get('rating')!) : undefined;
    const availability = searchParams.get('availability') || 'all';

    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get category and brand IDs from slugs
    let categoryId: string | undefined;
    let brandId: string | undefined;

    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();
      
      if (categoryData) {
        categoryId = categoryData.id;
      }
    }

    if (brand) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand)
        .single();
      
      if (brandData) {
        brandId = brandData.id;
      }
    }

    // Apply availability filter
    const inStockOnly = availability === 'in_stock';

    // Fetch products
    const result = await getShopProducts({
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      sortBy,
      page,
      limit,
      minRating,
      inStockOnly,
    });

    // Transform products for response
    const products = result.products.map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.original_price,
      images: product.images,
      rating: product.rating,
      reviewCount: product.review_count,
      stock: product.stock,
      brand: product.brand,
      category: product.category,
      variants: product.variants,
      specifications: product.specifications,
      isFeatured: product.is_featured,
      isDeal: product.is_deal,
      dealEndsAt: product.deal_ends_at,
      createdAt: product.created_at,
    }));

    // Set cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    headers.set('CDN-Cache-Control', 'public, s-maxage=300');
    
    // Add CORS headers
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return NextResponse.json({
      products,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages,
    }, { headers });
  } catch (error: any) {
    console.error('Shop API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  return new NextResponse(null, { headers });
}
