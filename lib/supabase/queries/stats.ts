import { supabase } from '../client';

export interface SiteStats {
  products: number;
  categories: number;
  brands: number;
  deals: number;
  orders: number;
}

export async function getStats(): Promise<SiteStats> {
  try {
    const [
      { count: products },
      { count: categories },
      { count: brands },
      { count: deals },
      { count: orders },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).gt('stock', 0),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_deal', true).gt('stock', 0),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_status', 'paid'),
    ]);

    return {
      products: products || 0,
      categories: categories || 0,
      brands: brands || 0,
      deals: deals || 0,
      orders: orders || 0,
    };
  } catch (error) {
    console.error('Error fetching site stats:', error);
    return {
      products: 0,
      categories: 0,
      brands: 0,
      deals: 0,
      orders: 0,
    };
  }
}

export async function getCategoryStats() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, product_count')
      .order('product_count', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching category stats:', error);
    return [];
  }
}

export async function getBrandStats() {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name, slug, logo, product_count')
      .order('product_count', { ascending: false })
      .limit(12);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching brand stats:', error);
    return [];
  }
}

export async function getDailyDealCount() {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_deal', true)
      .gt('stock', 0)
      .gte('deal_ends_at', new Date().toISOString());

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching daily deal count:', error);
    return 0;
  }
}

export async function getPopularProducts(limit: number = 8) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .order('rating', { ascending: false })
      .gt('review_count', 0)
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular products:', error);
    return [];
  }
}
