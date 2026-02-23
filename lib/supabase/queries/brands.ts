import { supabase } from '../client';
import { Brand, Product } from '@/types';

export async function getFeaturedBrands(limit: number = 6): Promise<Brand[]> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .gt('product_count', 0)
      .order('product_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured brands:', error);
    return [];
  }
}

export async function getAllBrands(): Promise<Brand[]> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .gt('product_count', 0)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all brands:', error);
    return [];
  }
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching brand by slug:', error);
    return null;
  }
}

export async function getBrandProducts(
  brandId: string,
  page: number = 1,
  pageSize: number = 24
): Promise<{ products: Product[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `, { count: 'exact' })
      .eq('brand_id', brandId)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const products = (data || []).map((item: any) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
      sku: item.sku,
      brand: {
        id: item.brand.id,
        slug: item.brand.slug,
        name: item.brand.name,
        logo: item.brand.logo,
        productCount: item.brand.product_count,
      },
      category: {
        id: item.category.id,
        slug: item.category.slug,
        name: item.category.name,
        productCount: item.category.product_count,
      },
      images: item.images || [],
      variants: item.variants?.map((v: any) => ({
        id: v.id,
        name: v.name,
        price: parseFloat(v.price),
        originalPrice: v.original_price ? parseFloat(v.original_price) : undefined,
        sku: v.sku,
        stock: v.stock,
        attributes: v.attributes || {},
      })) || [],
      specifications: item.specifications || {},
      rating: parseFloat(item.rating) || 0,
      reviewCount: item.review_count || 0,
      stock: item.stock,
      isFeatured: item.is_featured,
      isDeal: item.is_deal,
      dealEndsAt: item.deal_ends_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { products, total: count || 0 };
  } catch (error) {
    console.error('Error fetching brand products:', error);
    return { products: [], total: 0 };
  }
}

export async function searchBrands(query: string): Promise<Brand[]> {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching brands:', error);
    return [];
  }
}

export async function updateBrandProductCount(brandId: string): Promise<void> {
  try {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .gt('stock', 0);

    await supabase
      .from('brands')
      .update({ product_count: count || 0 })
      .eq('id', brandId);
  } catch (error) {
    console.error('Error updating brand product count:', error);
  }
}
