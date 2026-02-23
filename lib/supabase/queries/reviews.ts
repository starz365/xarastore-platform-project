import { supabase } from '../client';
import { Review } from '@/types';

export async function getProductReviews(
  productId: string,
  filters?: {
    rating?: number;
    verified?: boolean;
    hasImages?: boolean;
    sortBy?: 'recent' | 'helpful' | 'rating_high' | 'rating_low';
  },
  page: number = 1,
  pageSize: number = 10
): Promise<{ reviews: Review[]; averageRating: number; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:users(id, email, full_name, avatar_url)
      `, { count: 'exact' })
      .eq('product_id', productId);

    // Apply filters
    if (filters?.rating) {
      query = query.eq('rating', filters.rating);
    }
    if (filters?.verified !== undefined) {
      query = query.eq('is_verified', filters.verified);
    }
    if (filters?.hasImages) {
      query = query.not('images', 'eq', '{}');
    }

    // Apply sorting
    switch (filters?.sortBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false });
        break;
      case 'helpful':
        // Assuming we have a helpful_count column
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'rating_high':
        query = query.order('rating', { ascending: false });
        break;
      case 'rating_low':
        query = query.order('rating', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    // Get average rating
    const { data: avgData, error: avgError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId);

    if (avgError) throw avgError;

    const averageRating = avgData?.length
      ? avgData.reduce((sum, review) => sum + review.rating, 0) / avgData.length
      : 0;

    return {
      reviews: (data || []).map(transformReview),
      averageRating: parseFloat(averageRating.toFixed(1)),
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return { reviews: [], averageRating: 0, total: 0 };
  }
}

export async function createReview(
  userId: string,
  reviewData: {
    productId: string;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
    orderId?: string;
  }
): Promise<Review | null> {
  try {
    // Check if user has purchased the product
    const hasPurchased = await verifyPurchase(userId, reviewData.productId);
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        product_id: reviewData.productId,
        user_id: userId,
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment,
        images: reviewData.images || [],
        is_verified: hasPurchased,
        order_id: reviewData.orderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        user:users(id, email, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update product rating via trigger
    await supabase.rpc('update_product_rating', {
      p_product_id: reviewData.productId,
    });

    return transformReview(data);
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  updates: {
    rating?: number;
    title?: string;
    comment?: string;
    images?: string[];
  }
): Promise<Review | null> {
  try {
    // Verify review ownership
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (!existingReview) {
      throw new Error('Review not found or unauthorized');
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users(id, email, full_name, avatar_url)
      `)
      .single();

    if (error) throw error;

    // Update product rating via trigger
    await supabase.rpc('update_product_rating', {
      p_product_id: existingReview.product_id,
    });

    return transformReview(data);
  } catch (error) {
    console.error('Error updating review:', error);
    return null;
  }
}

export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<boolean> {
  try {
    // Get product ID before deletion
    const { data: review } = await supabase
      .from('reviews')
      .select('product_id')
      .eq('id', reviewId)
      .eq('user_id', userId)
      .single();

    if (!review) {
      throw new Error('Review not found or unauthorized');
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userId);

    if (error) throw error;

    // Update product rating via trigger
    await supabase.rpc('update_product_rating', {
      p_product_id: review.product_id,
    });

    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    return false;
  }
}

export async function markReviewAsHelpful(
  reviewId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if user already marked as helpful
    const { data: existing } = await supabase
      .from('review_helpful')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove helpful mark
      await supabase
        .from('review_helpful')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId);
    } else {
      // Add helpful mark
      await supabase
        .from('review_helpful')
        .insert({
          review_id: reviewId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });
    }

    return true;
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    return false;
  }
}

export async function reportReview(
  reviewId: string,
  userId: string,
  reason: string,
  description?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('review_reports')
      .insert({
        review_id: reviewId,
        user_id: userId,
        reason,
        description,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error reporting review:', error);
    return false;
  }
}

export async function getReviewStats(productId: string): Promise<{
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  verifiedReviews: number;
  reviewsWithImages: number;
}> {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating, is_verified, images')
      .eq('product_id', productId);

    if (error) throw error;

    const totalReviews = reviews?.length || 0;
    const averageRating = reviews?.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let verifiedReviews = 0;
    let reviewsWithImages = 0;

    reviews?.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1;
      if (review.is_verified) verifiedReviews++;
      if (review.images?.length) reviewsWithImages++;
    });

    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews,
      ratingDistribution,
      verifiedReviews,
      reviewsWithImages,
    };
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      verifiedReviews: 0,
      reviewsWithImages: 0,
    };
  }
}

export async function getRecentReviews(limit: number = 5): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:users(id, email, full_name, avatar_url),
        product:products(id, name, slug, images)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(transformReview);
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    return [];
  }
}

export async function getTopReviewedProducts(limit: number = 5): Promise<
  Array<{
    product: any;
    reviewCount: number;
    averageRating: number;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        reviews:reviews(rating)
      `)
      .order('review_count', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(product => {
      const reviews = product.reviews || [];
      const averageRating = reviews.length
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0;

      return {
        product: transformProduct(product),
        reviewCount: reviews.length,
        averageRating: parseFloat(averageRating.toFixed(1)),
      };
    });
  } catch (error) {
    console.error('Error fetching top reviewed products:', error);
    return [];
  }
}

async function verifyPurchase(userId: string, productId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('items')
      .eq('user_id', userId)
      .eq('payment_status', 'paid');

    if (error) throw error;

    return data?.some(order =>
      order.items.some((item: any) => item.product_id === productId)
    ) || false;
  } catch (error) {
    console.error('Error verifying purchase:', error);
    return false;
  }
}

function transformReview(data: any): Review {
  return {
    id: data.id,
    productId: data.product_id,
    userId: data.user_id,
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    images: data.images || [],
    isVerified: data.is_verified,
    createdAt: data.created_at,
    user: data.user ? {
      id: data.user.id,
      email: data.user.email,
      name: data.user.full_name,
      avatar: data.user.avatar_url,
    } : undefined,
    product: data.product ? {
      id: data.product.id,
      name: data.product.name,
      slug: data.product.slug,
      images: data.product.images || [],
    } : undefined,
  };
}

function transformProduct(data: any) {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    price: parseFloat(data.price),
    originalPrice: data.original_price ? parseFloat(data.original_price) : undefined,
    sku: data.sku,
    brand: {
      id: data.brand.id,
      slug: data.brand.slug,
      name: data.brand.name,
      logo: data.brand.logo,
      productCount: data.brand.product_count,
    },
    category: {
      id: data.category.id,
      slug: data.category.slug,
      name: data.category.name,
      productCount: data.category.product_count,
    },
    images: data.images || [],
    specifications: data.specifications || {},
    rating: parseFloat(data.rating) || 0,
    reviewCount: data.review_count || 0,
    stock: data.stock,
    isFeatured: data.is_featured,
    isDeal: data.is_deal,
    dealEndsAt: data.deal_ends_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
