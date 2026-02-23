import { supabase } from '../client';
import { Product } from '@/types';

export async function getDeals(limit: number = 50): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

export async function getFlashDeals(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .eq('is_featured', true)
      .gt('stock', 0)
      .not('deal_ends_at', 'is', null)
      .lte('deal_ends_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order('deal_ends_at', { ascending: true });

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching flash deals:', error);
    return [];
  }
}

export async function getTodaysDeals(): Promise<Product[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching today\'s deals:', error);
    return [];
  }
}

export async function getTopRatedDeals(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .gte('rating', 4.0)
      .gte('review_count', 10)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false });

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching top rated deals:', error);
    return [];
  }
}

export async function getNewArrivalDeals(): Promise<Product[]> {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching new arrival deals:', error);
    return [];
  }
}

export async function getEndingSoonDeals(): Promise<Product[]> {
  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gt('stock', 0)
      .not('deal_ends_at', 'is', null)
      .lte('deal_ends_at', threeDaysFromNow.toISOString())
      .gte('deal_ends_at', new Date().toISOString())
      .order('deal_ends_at', { ascending: true });

    if (error) throw error;

    return data.map(transformProduct) || [];
  } catch (error) {
    console.error('Error fetching ending soon deals:', error);
    return [];
  }
}

export async function getDealBySlug(slug: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('slug', slug)
      .eq('is_deal', true)
      .single();

    if (error) throw error;
    if (!data) return null;

    return transformProduct(data);
  } catch (error) {
    console.error('Error fetching deal by slug:', error);
    return null;
  }
}

function transformProduct(data: any): Product {
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
