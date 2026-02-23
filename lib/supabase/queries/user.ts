import { supabase } from '../client';
import { User, Address, Order, Review } from '@/types';

export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{
    full_name: string;
    phone: string;
    avatar_url: string;
  }>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
}

export async function getUserAddresses(userId: string): Promise<Address[]> {
  try {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return [];
  }
}

export async function createUserAddress(
  userId: string,
  address: Omit<Address, 'id' | 'created_at' | 'updated_at'>
): Promise<Address | null> {
  try {
    // If this is set as default, update other addresses
    if (address.is_default) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .insert({
        ...address,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user address:', error);
    return null;
  }
}

export async function updateUserAddress(
  addressId: string,
  userId: string,
  updates: Partial<Address>
): Promise<boolean> {
  try {
    // If setting as default, update other addresses
    if (updates.is_default) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .neq('id', addressId);
    }

    const { error } = await supabase
      .from('user_addresses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user address:', error);
    return false;
  }
}

export async function deleteUserAddress(
  addressId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user address:', error);
    return false;
  }
}

export async function getUserOrders(
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ orders: Order[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      orders: (data || []).map(transformOrder),
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { orders: [], total: 0 };
  }
}

export async function getUserOrder(
  orderId: string,
  userId: string
): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return transformOrder(data);
  } catch (error) {
    console.error('Error fetching user order:', error);
    return null;
  }
}

export async function getUserReviews(
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ reviews: Review[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('reviews')
      .select(`
        *,
        product:products(id, name, slug, images)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      reviews: (data || []).map(transformReview),
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    return { reviews: [], total: 0 };
  }
}

export async function getUserWishlist(
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ products: any[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('wishlist')
      .select(`
        *,
        product:products(
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      products: (data || []).map(item => ({
        ...transformProduct(item.product),
        addedAt: item.created_at,
      })),
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching user wishlist:', error);
    return { products: [], total: 0 };
  }
}

export async function addToWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist')
      .insert({
        user_id: userId,
        product_id: productId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return false;
  }
}

export async function removeFromWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return false;
  }
}

export async function isInWishlist(
  userId: string,
  productId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
}

export async function getUserStats(userId: string): Promise<{
  totalOrders: number;
  totalSpent: number;
  wishlistCount: number;
  reviewCount: number;
  addressesCount: number;
}> {
  try {
    const [
      { count: ordersCount },
      { data: ordersData },
      { count: wishlistCount },
      { count: reviewCount },
      { count: addressesCount },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('orders')
        .select('total')
        .eq('user_id', userId)
        .eq('payment_status', 'paid'),
      supabase
        .from('wishlist')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('user_addresses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    const totalSpent = ordersData?.reduce((sum, order) => sum + order.total, 0) || 0;

    return {
      totalOrders: ordersCount || 0,
      totalSpent,
      wishlistCount: wishlistCount || 0,
      reviewCount: reviewCount || 0,
      addressesCount: addressesCount || 0,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalOrders: 0,
      totalSpent: 0,
      wishlistCount: 0,
      reviewCount: 0,
      addressesCount: 0,
    };
  }
}

function transformOrder(data: any): Order {
  return {
    id: data.id,
    orderNumber: data.order_number,
    userId: data.user_id,
    items: data.items,
    subtotal: data.subtotal,
    shipping: data.shipping,
    tax: data.tax,
    total: data.total,
    status: data.status,
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    createdAt: data.created_at,
    estimatedDelivery: data.estimated_delivery,
  };
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
    variants: data.variants?.map((v: any) => ({
      id: v.id,
      name: v.name,
      price: parseFloat(v.price),
      originalPrice: v.original_price ? parseFloat(v.original_price) : undefined,
      sku: v.sku,
      stock: v.stock,
      attributes: v.attributes || {},
    })) || [],
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
