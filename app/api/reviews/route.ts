import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(1).max(100).optional(),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).max(5).optional(),
});

const getReviewsSchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().min(1).max(100).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  sortBy: z.enum(['newest', 'highest', 'lowest', 'most-helpful']).default('newest'),
  rating: z.coerce.number().min(1).max(5).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      productId: searchParams.get('productId'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      rating: searchParams.get('rating'),
    };

    const validation = getReviewsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, page, limit, sortBy, rating } = validation.data;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        comment,
        images,
        is_verified,
        created_at,
        updated_at,
        product:products(id, name, slug),
        user:users(full_name, avatar_url)
      `, { count: 'exact' })
      .eq('is_verified', true); // Only show verified reviews

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (rating) {
      query = query.eq('rating', rating);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'highest':
        query = query.order('rating', { ascending: false });
        break;
      case 'lowest':
        query = query.order('rating', { ascending: true });
        break;
      case 'most-helpful':
        // In production, you'd have a helpfulness score
        query = query.order('created_at', { ascending: false });
        break;
    }

    const { data: reviews, count, error } = await query.range(from, to);

    if (error) {
      throw error;
    }

    // Get review statistics if productId is provided
    let statistics = null;
    if (productId) {
      const { data: stats } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_verified', true);

      if (stats) {
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;
        let totalReviews = 0;

        stats.forEach(review => {
          ratingCounts[review.rating]++;
          totalRating += review.rating;
          totalReviews++;
        });

        statistics = {
          average: totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : '0.0',
          total: totalReviews,
          distribution: ratingCounts,
        };
      }
    }

    const transformedReviews = reviews?.map(review => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images || [],
      isVerified: review.is_verified,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      product: review.product ? {
        id: review.product.id,
        name: review.product.name,
        slug: review.product.slug,
      } : null,
      user: review.user ? {
        name: review.user.full_name,
        avatar: review.user.avatar_url,
      } : null,
    })) || [];

    const response = {
      success: true,
      data: {
        reviews: transformedReviews,
        statistics,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNextPage: (page * limit) < (count || 0),
          hasPreviousPage: page > 1,
        },
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('Get reviews error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reviews',
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
    
    const validation = createReviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, rating, title, comment, images } = validation.data;

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

    // Check if user has purchased this product
    const hasPurchased = await checkUserPurchase(session.user.id, productId);
    const isVerified = hasPurchased; // Verified if purchased

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', productId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already reviewed this product',
        },
        { status: 409 }
      );
    }

    // Create review
    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        product_id: productId,
        user_id: session.user.id,
        rating,
        title,
        comment,
        images: images || [],
        is_verified: isVerified,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        id,
        rating,
        title,
        comment,
        images,
        is_verified,
        created_at,
        product:products(id, name, slug),
        user:users(full_name, avatar_url)
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    // The product rating is automatically updated via database trigger

    const response = {
      success: true,
      data: {
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images || [],
        isVerified: review.is_verified,
        createdAt: review.created_at,
        product: review.product ? {
          id: review.product.id,
          name: review.product.name,
          slug: review.product.slug,
        } : null,
        user: review.user ? {
          name: review.user.full_name,
          avatar: review.user.avatar_url,
        } : null,
      },
      message: isVerified 
        ? 'Review submitted successfully' 
        : 'Review submitted (awaiting verification)',
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Create review error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create review',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function checkUserPurchase(userId: string, productId: string): Promise<boolean> {
  try {
    // Check if user has any orders containing this product
    const { data: orders } = await supabase
      .from('orders')
      .select('items')
      .eq('user_id', userId)
      .eq('status', 'delivered');

    if (!orders) return false;

    for (const order of orders) {
      const hasProduct = order.items?.some((item: any) => 
        item.productId === productId
      );
      if (hasProduct) return true;
    }

    return false;
  } catch (error) {
    console.error('Purchase check error:', error);
    return false;
  }
}
