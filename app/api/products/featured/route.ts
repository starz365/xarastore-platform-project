import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(8),
  category: z.string().optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { limit, category } = validation.data;

    let query = supabase
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
      `)
      .eq('is_featured', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category.slug', category);
    }

    const { data: products, error } = await query;

    if (error) {
      throw error;
    }

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
      isFeatured: product.is_featured,
      isDeal: product.is_deal,
      dealEndsAt: product.deal_ends_at,
      brand: product.brand,
      category: product.category,
    })) || [];

    const response = {
      success: true,
      data: transformedProducts,
      meta: {
        count: transformedProducts.length,
        timestamp: new Date().toISOString(),
        cache: 'hit',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'X-Featured-Count': transformedProducts.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Featured products API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch featured products',
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
