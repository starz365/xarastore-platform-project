import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
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

    const products = data.map((item: any) => ({
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

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching flash deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flash deals' },
      { status: 500 }
    );
  }
}
