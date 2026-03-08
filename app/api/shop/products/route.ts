import { NextRequest, NextResponse } from 'next/server'
import { getShopProducts } from '@/lib/supabase/queries/shop'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  try {
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters safely
    const search = searchParams.get('q') ?? undefined
    const category = searchParams.get('category') ?? undefined
    const brand = searchParams.get('brand') ?? undefined

    const minPrice = searchParams.get('min_price')
      ? Number(searchParams.get('min_price'))
      : undefined

    const maxPrice = searchParams.get('max_price')
      ? Number(searchParams.get('max_price'))
      : undefined

    const sortBy = searchParams.get('sort') ?? 'featured'

    const page = searchParams.get('page')
      ? Number(searchParams.get('page'))
      : 1

    const limit = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : 24

    const minRating = searchParams.get('rating')
      ? Number(searchParams.get('rating'))
      : undefined

    const availability = searchParams.get('availability') ?? 'all'

    // Validate pagination
    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      )
    }

    // Resolve category slug → id
    let categoryId: string | undefined
    if (category) {
      const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle()

      if (error) {
        console.error('Category lookup error:', error)
      }

      categoryId = data?.id
    }

    // Resolve brand slug → id
    let brandId: string | undefined
    if (brand) {
      const { data, error } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand)
        .maybeSingle()

      if (error) {
        console.error('Brand lookup error:', error)
      }

      brandId = data?.id
    }

    const inStockOnly = availability === 'in_stock'

    // Fetch products from query layer
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
    })

    // Normalize product response
    const products =
      result?.products?.map((product: any) => ({
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
      })) ?? []

    // Cache + CORS headers
    const headers = new Headers({
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'CDN-Cache-Control': 'public, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })

    return NextResponse.json(
      {
        products,
        total: result?.total ?? 0,
        page: result?.page ?? page,
        totalPages: result?.totalPages ?? 1,
        hasMore: (result?.page ?? page) < (result?.totalPages ?? 1),
      },
      { headers }
    )
  } catch (error: any) {
    console.error('Shop API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
