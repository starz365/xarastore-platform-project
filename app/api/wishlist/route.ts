import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const wishlistItemSchema = z.object({
  productId: z.string().uuid(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get wishlist items with product details
    const { data: wishlistItems, count, error } = await supabase
      .from('wishlist')
      .select(`
        id,
        created_at,
        product:products(
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
          brand:brands(name, slug, logo),
          category:categories(name, slug)
        )
      `, { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    // Transform response
    const transformedItems = wishlistItems?.map(item => ({
      id: item.id,
      createdAt: item.created_at,
      product: item.product ? {
        id: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        originalPrice: item.product.original_price,
        images: item.product.images || [],
        rating: item.product.rating,
        reviewCount: item.product.review_count,
        stock: item.product.stock,
        isFeatured: item.product.is_featured,
        isDeal: item.product.is_deal,
        dealEndsAt: item.product.deal_ends_at,
        brand: item.product.brand,
        category: item.product.category,
      } : null,
    })) || [];

    const response = {
      success: true,
      data: transformedItems,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: (page * limit) < (count || 0),
        hasPreviousPage: page > 1,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get wishlist error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wishlist',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = wishlistItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid wishlist item', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId } = validation.data;

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already in wishlist
    const { data: existingItem } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product already in wishlist',
        },
        { status: 409 }
      );
    }

    // Add to wishlist
    const { data: wishlistItem, error: insertError } = await supabase
      .from('wishlist')
      .insert({
        user_id: session.user.id,
        product_id: productId,
        created_at: new Date().toISOString(),
      })
      .select(`
        id,
        created_at,
        product:products(
          id,
          slug,
          name,
          price,
          images,
          brand:brands(name, slug)
        )
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    const response = {
      success: true,
      data: {
        id: wishlistItem.id,
        createdAt: wishlistItem.created_at,
        product: wishlistItem.product ? {
          id: wishlistItem.product.id,
          slug: wishlistItem.product.slug,
          name: wishlistItem.product.name,
          price: wishlistItem.product.price,
          images: wishlistItem.product.images || [],
          brand: wishlistItem.product.brand,
        } : null,
      },
      message: 'Added to wishlist',
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Add to wishlist error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add to wishlist',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const itemId = searchParams.get('itemId');

    if (!productId && !itemId) {
      return NextResponse.json(
        { error: 'productId or itemId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('wishlist')
      .delete()
      .eq('user_id', session.user.id);

    if (productId) {
      query = query.eq('product_id', productId);
    } else if (itemId) {
      query = query.eq('id', itemId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    const response = {
      success: true,
      message: productId ? 'Product removed from wishlist' : 'Wishlist item removed',
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Remove from wishlist error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove from wishlist',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
