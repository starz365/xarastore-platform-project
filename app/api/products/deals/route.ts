import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(12),
  type: z.enum(['all', 'flash', 'ending-soon']).default('all'),
  category: z.string().optional(),
  minDiscount: z.coerce.number().min(0).max(100).optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      minDiscount: searchParams.get('minDiscount'),
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { limit, type, category, minDiscount } = validation.data;

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
        is_deal,
        deal_ends_at,
        brand:brands(id, name, slug, logo),
        category:categories(id, name, slug)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .order('deal_ends_at', { ascending: true });

    // Filter by deal type
    if (type === 'flash') {
      const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      query = query.lte('deal_ends_at', twentyFourHoursFromNow.toISOString());
    } else if (type === 'ending-soon') {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      query = query.lte('deal_ends_at', threeDaysFromNow.toISOString());
    }

    // Filter by category
    if (category) {
      query = query.eq('category.slug', category);
    }

    // Filter by minimum discount
    if (minDiscount !== undefined) {
      // Calculate discount percentage
      query = query.filter('original_price', 'gt', 0);
      // This would require a computed column in production
    }

    const { data: products, error } = await query.limit(limit);

    if (error) {
      throw error;
    }

    // Calculate discount percentages
    const transformedProducts = products?.map(product => {
      const discount = product.original_price 
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : 0;
      
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.original_price,
        discount,
        images: product.images || [],
        rating: product.rating,
        reviewCount: product.review_count,
        stock: product.stock,
        isDeal: product.is_deal,
        dealEndsAt: product.deal_ends_at,
        brand: product.brand,
        category: product.category,
      };
    }) || [];

    const response = {
      success: true,
      data: transformedProducts,
      meta: {
        count: transformedProducts.length,
        type,
        timestamp: new Date().toISOString(),
        cache: 'hit',
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800',
        'X-Deals-Count': transformedProducts.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Deals API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals',
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
