import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { rateLimiter } from '@/lib/utils/rate-limiter';
import { validateApiKey } from '@/lib/utils/security';

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

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const isRateLimited = await rateLimiter(ip, `collection-products:${slug}`);
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
    const sortBy = searchParams.get('sort_by') || 'position';
    const order = searchParams.get('order') || 'asc';
    const inStockOnly = searchParams.get('in_stock') === 'true';
    const onDealOnly = searchParams.get('on_deal') === 'true';

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Get collection first
    const { data: collection } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Build query for collection products
    let query = supabase
      .from('collection_products')
      .select(`
        position,
        added_at,
        product:products(
          id,
          slug,
          name,
          description,
          price,
          original_price,
          images,
          rating,
          review_count,
          stock,
          is_featured,
          is_deal,
          deal_ends_at,
          brand:brands(name, slug, logo),
          category:categories(name, slug),
          variants:product_variants(*)
        )
      `, { count: 'exact' })
      .eq('collection_id', collection.id);

    // Apply filters
    if (inStockOnly) {
      query = query.gt('product.stock', 0);
    }

    if (onDealOnly) {
      query = query.eq('product.is_deal', true);
    }

    // Apply sorting
    const validSortColumns = ['position', 'added_at', 'product.price', 'product.rating', 'product.created_at'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validOrders.includes(order)) {
      if (sortBy.startsWith('product.')) {
        const productField = sortBy.replace('product.', '');
        query = query.order(productField, { ascending: order === 'asc', foreignTable: 'products' });
      } else {
        query = query.order(sortBy, { ascending: order === 'asc' });
      }
    } else {
      query = query.order('position', { ascending: true });
    }

    // Execute query with pagination
    const { data: collectionProducts, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Collection products fetch error:', error);
      throw error;
    }

    // Transform products
    const products = collectionProducts?.map(cp => ({
      ...cp.product,
      collection_position: cp.position,
      added_to_collection_at: cp.added_at,
    })) || [];

    // Calculate statistics
    const { data: stats } = await supabase
      .from('collection_products')
      .select(`
        product:products(
          price,
          original_price,
          rating,
          stock
        )
      `)
      .eq('collection_id', collection.id);

    const totalProducts = stats?.length || 0;
    const inStockProducts = stats?.filter(s => s.product.stock > 0).length || 0;
    const dealProducts = stats?.filter(s => s.product.original_price && s.product.original_price > s.product.price).length || 0;
    
    const prices = stats?.map(s => s.product.price).filter(Boolean) || [];
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    // Calculate pagination
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        collection_slug: slug,
        products,
        statistics: {
          total_products: totalProducts,
          in_stock_products: inStockProducts,
          deal_products: dealProducts,
          price_range: {
            average: Math.round(avgPrice),
            min: minPrice,
            max: maxPrice,
          },
          stock_status: {
            in_stock_percentage: totalProducts > 0 ? Math.round((inStockProducts / totalProducts) * 100) : 0,
            out_of_stock: totalProducts - inStockProducts,
          },
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
          next_page: hasNextPage ? `/api/collections/${slug}/products?page=${page + 1}&limit=${limit}` : null,
          prev_page: hasPrevPage ? `/api/collections/${slug}/products?page=${page - 1}&limit=${limit}` : null,
        },
        filters: {
          in_stock: inStockOnly,
          on_deal: onDealOnly,
          sort_by: sortBy,
          order,
        },
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=600',
        'Vary': 'Accept-Encoding, Accept',
      },
    });

  } catch (error: any) {
    console.error('Collection products API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch collection products',
        code: 'COLLECTION_PRODUCTS_ERROR',
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

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
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

    // Get collection
    const { data: collection } = await supabaseAdmin
      .from('collections')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
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

    const { product_ids, action = 'add' } = body;
    
    if (!product_ids || !Array.isArray(product_ids)) {
      return NextResponse.json(
        { error: 'product_ids array is required' },
        { status: 400 }
      );
    }

    // Validate product IDs
    const { data: validProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .in('id', product_ids)
      .eq('is_active', true);

    if (!validProducts || validProducts.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found' },
        { status: 404 }
      );
    }

    const validProductIds = validProducts.map(p => p.id);
    const invalidProductIds = product_ids.filter(id => !validProductIds.includes(id));

    let result;
    
    if (action === 'add') {
      // Get current max position
      const { data: maxPosition } = await supabaseAdmin
        .from('collection_products')
        .select('position')
        .eq('collection_id', collection.id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      let nextPosition = (maxPosition?.position || 0) + 1;

      // Prepare collection products
      const collectionProducts = validProductIds.map(productId => ({
        collection_id: collection.id,
        product_id: productId,
        position: nextPosition++,
        added_by: userId || 'system',
        added_at: new Date().toISOString(),
      }));

      // Insert products into collection
      const { data, error } = await supabaseAdmin
        .from('collection_products')
        .insert(collectionProducts)
        .select();

      if (error) {
        // Handle duplicate entries gracefully
        if (error.code === '23505') { // Unique violation
          // Get existing products
          const { data: existingProducts } = await supabaseAdmin
            .from('collection_products')
            .select('product_id')
            .eq('collection_id', collection.id)
            .in('product_id', validProductIds);

          const existingProductIds = existingProducts?.map(ep => ep.product_id) || [];
          const newProductIds = validProductIds.filter(id => !existingProductIds.includes(id));

          if (newProductIds.length > 0) {
            const newCollectionProducts = newProductIds.map(productId => ({
              collection_id: collection.id,
              product_id: productId,
              position: nextPosition++,
              added_by: userId || 'system',
              added_at: new Date().toISOString(),
            }));

            const { data: newData, error: newError } = await supabaseAdmin
              .from('collection_products')
              .insert(newCollectionProducts)
              .select();

            if (newError) throw newError;
            result = newData;
          } else {
            result = [];
          }
        } else {
          throw error;
        }
      } else {
        result = data;
      }

    } else if (action === 'remove') {
      // Remove products from collection
      const { data, error } = await supabaseAdmin
        .from('collection_products')
        .delete()
        .eq('collection_id', collection.id)
        .in('product_id', validProductIds)
        .select();

      if (error) throw error;
      result = data;

    } else if (action === 'replace') {
      // Replace all products in collection
      // First, delete all existing products
      await supabaseAdmin
        .from('collection_products')
        .delete()
        .eq('collection_id', collection.id);

      // Then add new products
      const collectionProducts = validProductIds.map((productId, index) => ({
        collection_id: collection.id,
        product_id: productId,
        position: index + 1,
        added_by: userId || 'system',
        added_at: new Date().toISOString(),
      }));

      const { data, error } = await supabaseAdmin
        .from('collection_products')
        .insert(collectionProducts)
        .select();

      if (error) throw error;
      result = data;

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: add, remove, replace' },
        { status: 400 }
      );
    }

    // Update collection timestamp
    await supabaseAdmin
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', collection.id);

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: `collection_products_${action}`,
      table_name: 'collection_products',
      record_id: collection.id,
      user_id: userId || 'system',
      old_data: null,
      new_data: {
        collection_id: collection.id,
        product_ids: validProductIds,
        action,
        count: result?.length || 0,
      },
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Products ${action}ed successfully`,
      data: {
        action,
        added_count: result?.length || 0,
        valid_product_ids: validProductIds,
        invalid_product_ids: invalidProductIds,
        collection_slug: slug,
      },
    }, {
      status: action === 'add' ? 201 : 200,
    });

  } catch (error: any) {
    console.error('Collection products update API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update collection products',
        code: 'COLLECTION_PRODUCTS_UPDATE_ERROR',
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
