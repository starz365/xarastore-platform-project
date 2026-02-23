import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
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
    console.error('Error fetching today\'s deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s deals' },
      { status: 500 }
    );
  }
}
