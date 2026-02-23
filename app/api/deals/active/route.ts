import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const minDiscount = searchParams.get('minDiscount');
    const sortBy = searchParams.get('sort') || 'end_time';

    const from = (page - 1) * limit;
    const now = new Date().toISOString();

    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .eq('is_deal', true)
      .gte('deal_ends_at', now)
      .gt('stock', 0)
      .order(sortBy, { ascending: sortBy === 'end_time' });

    // Apply filters
    if (category) {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (categoryData) {
        query = query.eq('category_id', categoryData.id);
      }
    }

    if (minDiscount) {
      query = query.gte('original_price', 0); // Placeholder for discount calculation
    }

    const { data: products, count, error } = await query
      .range(from, from + limit - 1);

    if (error) {
      throw error;
    }

    // Calculate discounts
    const deals = products?.map(product => {
      const discountPercentage = product.original_price
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : 0;

      return {
        ...product,
        discountPercentage,
        isUrgent: product.deal_ends_at
          ? (new Date(product.deal_ends_at).getTime() - Date.now()) <= 24 * 60 * 60 * 1000
          : false,
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: deals,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching active deals:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, discountPercentage, endTime } = body;

    // Validate input
    if (!productId || !discountPercentage || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (discountPercentage <= 0 || discountPercentage >= 100) {
      return NextResponse.json(
        { error: 'Invalid discount percentage' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('price')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Calculate sale price
    const salePrice = product.price * (1 - discountPercentage / 100);

    // Create deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        product_id: productId,
        discount_percentage: discountPercentage,
        original_price: product.price,
        sale_price: salePrice,
        end_time: endTime,
        is_active: true,
      })
      .select()
      .single();

    if (dealError) {
      throw dealError;
    }

    // Update product to mark as deal
    await supabase
      .from('products')
      .update({
        is_deal: true,
        deal_ends_at: endTime,
        original_price: product.price,
        price: salePrice,
      })
      .eq('id', productId);

    return NextResponse.json({
      success: true,
      data: deal,
      message: 'Deal created successfully',
    });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create deal',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
