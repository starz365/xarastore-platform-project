import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const paramsSchema = z.object({
  reviewId: z.string().uuid(),
});

const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  title: z.string().min(1).max(100).optional(),
  comment: z.string().min(10).max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    const validation = paramsSchema.safeParse({ reviewId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: review, error } = await supabase
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
        product:products(id, name, slug, images),
        user:users(full_name, avatar_url)
      `)
      .eq('id', reviewId)
      .eq('is_verified', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    const transformedReview = {
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
        images: review.product.images || [],
      } : null,
      user: review.user ? {
        name: review.user.full_name,
        avatar: review.user.avatar_url,
      } : null,
    };

    const response = {
      success: true,
      data: transformedReview,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'ETag': `"${review.updated_at}"`,
      },
    });
  } catch (error: any) {
    console.error('Get review error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch review',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    const validation = paramsSchema.safeParse({ reviewId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const updateValidation = updateReviewSchema.safeParse(body);
    if (!updateValidation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: updateValidation.error.errors },
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // Check if review exists and belongs to user
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id, user_id, created_at')
      .eq('id', reviewId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError || !existingReview) {
      return NextResponse.json(
        { error: 'Review not found or access denied' },
        { status: 404 }
      );
    }

    // Check if review can be edited (within 7 days)
    const reviewDate = new Date(existingReview.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    if (reviewDate < sevenDaysAgo) {
      return NextResponse.json(
        { error: 'Review can only be edited within 7 days of posting' },
        { status: 400 }
      );
    }

    // Update review
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
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
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    const transformedReview = {
      id: updatedReview.id,
      rating: updatedReview.rating,
      title: updatedReview.title,
      comment: updatedReview.comment,
      images: updatedReview.images || [],
      isVerified: updatedReview.is_verified,
      createdAt: updatedReview.created_at,
      updatedAt: updatedReview.updated_at,
      product: updatedReview.product ? {
        id: updatedReview.product.id,
        name: updatedReview.product.name,
        slug: updatedReview.product.slug,
      } : null,
      user: updatedReview.user ? {
        name: updatedReview.user.full_name,
        avatar: updatedReview.user.avatar_url,
      } : null,
    };

    const response = {
      success: true,
      data: transformedReview,
      message: 'Review updated successfully',
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Update review error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update review',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    
    const validation = paramsSchema.safeParse({ reviewId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if review exists and belongs to user
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id, user_id, created_at')
      .eq('id', reviewId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError || !existingReview) {
      return NextResponse.json(
        { error: 'Review not found or access denied' },
        { status: 404 }
      );
    }

    // Delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      throw deleteError;
    }

    const response = {
      success: true,
      message: 'Review deleted successfully',
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Delete review error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete review',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
