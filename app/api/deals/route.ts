import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { rateLimiter } from '@/lib/utils/rate-limiter';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const isRateLimited = await rateLimiter(ip, 'deals');
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type') || 'all'; // all, flash, ending_soon, featured
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minDiscount = parseInt(searchParams.get('min_discount') || '0');
    const maxDiscount = parseInt(searchParams.get('max_discount') || '100');
    const sortBy = searchParams.get('sort_by') || 'discount_desc';
    const excludeExpired = searchParams.get('exclude_expired') !== 'false';

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    if (minDiscount < 0 || maxDiscount > 100 || minDiscount > maxDiscount) {
      return NextResponse.json(
        { error: 'Invalid discount range' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Build base query for deals
    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `, { count: 'exact' })
      .eq('is_deal', true)
      .eq('is_active', true)
      .gt('stock', 0);

    // Apply deal type filters
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    switch (type) {
      case 'flash':
        query = query
          .lt('deal_ends_at', twentyFourHoursFromNow.toISOString())
          .order('deal_ends_at', { ascending: true });
        break;
      case 'ending_soon':
        query = query
          .lt('deal_ends_at', threeDaysFromNow.toISOString())
          .order('deal_ends_at', { ascending: true });
        break;
      case 'featured':
        query = query.eq('is_featured', true);
        break;
    }

    // Exclude expired deals
    if (excludeExpired) {
      query = query.or(`deal_ends_at.is.null,deal_ends_at.gt.${now.toISOString()}`);
    }

    // Apply category filter
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

    // Apply brand filter
    if (brand) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', brand)
        .single();

      if (brandData) {
        query = query.eq('brand_id', brandData.id);
      }
    }

    // Apply discount filter (calculated from original_price and price)
    // This requires a more complex query - we'll filter after fetching
    // For production, consider using a database function or view

    // Apply sorting
    const sortMapping: Record<string, { column: string, ascending: boolean }> = {
      'discount_desc': { column: 'original_price', ascending: false }, // Highest discount first
      'price_asc': { column: 'price', ascending: true },
      'price_desc': { column: 'price', ascending: false },
      'newest': { column: 'created_at', ascending: false },
      'rating': { column: 'rating', ascending: false },
      'ending_soon': { column: 'deal_ends_at', ascending: true },
    };

    const sortConfig = sortMapping[sortBy] || { column: 'original_price', ascending: false };
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

    // Execute query
    const { data: products, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Deals fetch error:', error);
      throw error;
    }

    // Calculate discount percentages and apply discount filter
    const processedProducts = products?.map(product => {
      const originalPrice = product.original_price || product.price;
      const discount = originalPrice > 0 
        ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
        : 0;
      
      return {
        ...product,
        discount_percentage: discount,
        discount_amount: originalPrice - product.price,
      };
    }).filter(product => 
      product.discount_percentage >= minDiscount && 
      product.discount_percentage <= maxDiscount
    );

    // Get deal statistics
    const { data: stats } = await supabase
      .from('products')
      .select(`
        count,
        avg(price) as avg_price,
        avg(rating) as avg_rating,
        min(price) as min_price,
        max(price) as max_price
      `)
      .eq('is_deal', true)
      .eq('is_active', true)
      .gt('stock', 0);

    // Get categories with deals
    const { data: dealCategories } = await supabase
      .from('products')
      .select(`
        category:categories(
          id,
          slug,
          name,
          product_count
        )
      `)
      .eq('is_deal', true)
      .eq('is_active', true)
      .gt('stock', 0)
      .group('category_id, categories(id, slug, name, product_count)')
      .limit(10);

    // Calculate pagination
    const filteredCount = processedProducts?.length || 0;
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        deals: processedProducts,
        metadata: {
          total_deals: count || 0,
          showing: filteredCount,
          statistics: {
            average_discount: processedProducts?.length 
              ? Math.round(processedProducts.reduce((sum, p) => sum + (p.discount_percentage || 0), 0) / processedProducts.length)
              : 0,
            average_price: stats?.avg_price ? parseFloat(stats.avg_price).toFixed(2) : '0.00',
            average_rating: stats?.avg_rating ? parseFloat(stats.avg_rating).toFixed(2) : '0.00',
            price_range: {
              min: stats?.min_price || 0,
              max: stats?.max_price || 0,
            },
          },
          categories: dealCategories?.map(dc => dc.category) || [],
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
          next_page: hasNextPage ? `/api/deals?page=${page + 1}&limit=${limit}&type=${type}` : null,
          prev_page: hasPrevPage ? `/api/deals?page=${page - 1}&limit=${limit}&type=${type}` : null,
        },
        filters: {
          type,
          category,
          brand,
          min_discount: minDiscount,
          max_discount: maxDiscount,
          sort_by: sortBy,
          exclude_expired: excludeExpired,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'CDN-Cache-Control': 'public, max-age=120',
        'Vary': 'Accept-Encoding, Accept',
      },
    });

  } catch (error: any) {
    console.error('Deals API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch deals',
        code: 'DEALS_FETCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check - admin only
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    if (!authHeader && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let isAuthenticated = false;
    let userId = '';
    
    if (apiKey) {
      isAuthenticated = await validateApiKey(apiKey, 'admin');
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
        const { data: userRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        isAuthenticated = userRole?.role === 'admin';
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields for deal creation
    const { product_id, discount_percentage, ends_at } = body;
    
    if (!product_id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!discount_percentage || discount_percentage < 1 || discount_percentage > 99) {
      return NextResponse.json(
        { error: 'Discount percentage must be between 1 and 99' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('price, is_deal')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.is_deal) {
      return NextResponse.json(
        { error: 'Product is already on deal' },
        { status: 409 }
      );
    }

    // Calculate new price
    const originalPrice = product.price;
    const discountAmount = (originalPrice * discount_percentage) / 100;
    const newPrice = Math.max(1, Math.round(originalPrice - discountAmount));

    // Set deal end date
    let dealEndsAt = ends_at;
    if (!dealEndsAt) {
      // Default to 7 days from now
      const defaultEndDate = new Date();
      defaultEndDate.setDate(defaultEndDate.getDate() + 7);
      dealEndsAt = defaultEndDate.toISOString();
    }

    // Update product with deal information
    const updateData = {
      is_deal: true,
      original_price: originalPrice,
      price: newPrice,
      deal_ends_at: dealEndsAt,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProduct, error } = await supabaseAdmin
      .from('products')
      .update(updateData)
      .eq('id', product_id)
      .select()
      .single();

    if (error) {
      console.error('Deal creation error:', error);
      throw error;
    }

    // Create deal record in deals table (for tracking)
    const dealRecord = {
      product_id,
      original_price: originalPrice,
      sale_price: newPrice,
      discount_percentage,
      starts_at: new Date().toISOString(),
      ends_at: dealEndsAt,
      created_by: userId || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabaseAdmin.from('deals').insert(dealRecord);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'deal_create',
      table_name: 'products',
      record_id: product_id,
      user_id: userId || 'system',
      old_data: product,
      new_data: updatedProduct,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    // Send notification to users who have this product in wishlist
    // This would be handled by a background job in production

    return NextResponse.json({
      success: true,
      message: 'Deal created successfully',
      data: {
        product: updatedProduct,
        deal: dealRecord,
        discount: {
          percentage: discount_percentage,
          amount: discountAmount,
          original_price: originalPrice,
          sale_price: newPrice,
        },
      },
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('Deal creation API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create deal',
        code: 'DEAL_CREATE_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
