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

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const isRateLimited = await rateLimiter(ip, 'collections');
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
    const type = searchParams.get('type') || 'all'; // all, featured, seasonal, trending
    const category = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    const activeOnly = searchParams.get('active') !== 'false';
    const sortBy = searchParams.get('sort_by') || 'position';
    const order = searchParams.get('order') || 'asc';

    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('collections')
      .select(`
        *,
        collection_products(count),
        category:categories(name, slug)
      `, { count: 'exact' });

    // Apply filters
    if (type !== 'all') {
      query = query.eq('type', type);
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (activeOnly) {
      const now = new Date().toISOString();
      query = query.or(`ends_at.is.null,ends_at.gt.${now}`);
      query = query.or(`starts_at.is.null,starts_at.lt.${now}`);
    }

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

    // Apply sorting
    const validSortColumns = ['position', 'name', 'created_at', 'updated_at', 'starts_at'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validOrders.includes(order)) {
      query = query.order(sortBy, { ascending: order === 'asc' });
    } else {
      query = query.order('position', { ascending: true }).order('created_at', { ascending: false });
    }

    // Execute query with pagination
    const { data: collections, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Collections fetch error:', error);
      throw error;
    }

    // Get product previews for each collection
    const collectionsWithProducts = await Promise.all(
      (collections || []).map(async (collection) => {
        const { data: products } = await supabase
          .from('collection_products')
          .select(`
            product:products(
              id,
              slug,
              name,
              price,
              original_price,
              images,
              rating,
              review_count,
              stock,
              brand:brands(name, slug)
            )
          `)
          .eq('collection_id', collection.id)
          .order('position', { ascending: true })
          .limit(4);

        return {
          ...collection,
          product_previews: products?.map(cp => cp.product) || [],
        };
      })
    );

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get collection statistics
    const { data: stats } = await supabase
      .from('collections')
      .select('count, type')
      .eq('is_active', true)
      .group('type');

    return NextResponse.json({
      success: true,
      data: {
        collections: collectionsWithProducts.map(collection => ({
          id: collection.id,
          slug: collection.slug,
          name: collection.name,
          description: collection.description,
          type: collection.type,
          image: collection.image,
          banner_image: collection.banner_image,
          is_featured: collection.is_featured,
          is_active: collection.is_active,
          position: collection.position,
          starts_at: collection.starts_at,
          ends_at: collection.ends_at,
          meta_title: collection.meta_title,
          meta_description: collection.meta_description,
          category: collection.category,
          product_count: collection.collection_products?.[0]?.count || 0,
          product_previews: collection.product_previews,
          created_at: collection.created_at,
          updated_at: collection.updated_at,
          _links: {
            self: `/api/collections/${collection.slug}`,
            products: `/api/collections/${collection.slug}/products`,
            category: collection.category ? `/api/categories/${collection.category.slug}` : null,
          },
        })),
        statistics: {
          total_collections: count || 0,
          by_type: stats?.reduce((acc, stat) => ({
            ...acc,
            [stat.type]: stat.count,
          }), {}) || {},
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
          next_page: hasNextPage ? `/api/collections?page=${page + 1}&limit=${limit}` : null,
          prev_page: hasPrevPage ? `/api/collections?page=${page - 1}&limit=${limit}` : null,
        },
        filters: {
          type,
          category,
          featured: featuredOnly,
          active: activeOnly,
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
    console.error('Collections API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch collections',
        code: 'COLLECTIONS_FETCH_ERROR',
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

    // Validate required fields
    const { name, slug, type } = body;
    
    if (!name || !slug || !type) {
      return NextResponse.json(
        { error: 'Name, slug, and type are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['seasonal', 'trending', 'featured', 'themed', 'custom'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if collection already exists
    const { data: existingCollection } = await supabaseAdmin
      .from('collections')
      .select('id')
      .or(`name.eq.${name},slug.eq.${slug}`)
      .single();

    if (existingCollection) {
      return NextResponse.json(
        { error: 'Collection with this name or slug already exists' },
        { status: 409 }
      );
    }

    // Get next position
    const { data: maxPosition } = await supabaseAdmin
      .from('collections')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosition?.position || 0) + 1;

    // Create collection
    const collectionData = {
      name: name.trim(),
      slug: slug.trim(),
      description: body.description?.trim() || null,
      type,
      image: body.image?.trim() || null,
      banner_image: body.banner_image?.trim() || null,
      category_id: body.category_id || null,
      is_featured: body.is_featured || false,
      is_active: body.is_active !== false,
      position: nextPosition,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      meta_title: body.meta_title?.trim() || null,
      meta_description: body.meta_description?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: collection, error } = await supabaseAdmin
      .from('collections')
      .insert(collectionData)
      .select()
      .single();

    if (error) {
      console.error('Collection creation error:', error);
      throw error;
    }

    // Add products to collection if provided
    if (body.product_ids && Array.isArray(body.product_ids)) {
      const collectionProducts = body.product_ids.map((productId: string, index: number) => ({
        collection_id: collection.id,
        product_id: productId,
        position: index + 1,
        added_by: userId || 'system',
        added_at: new Date().toISOString(),
      }));

      await supabaseAdmin
        .from('collection_products')
        .insert(collectionProducts);
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'collection_create',
      table_name: 'collections',
      record_id: collection.id,
      user_id: userId || 'system',
      old_data: null,
      new_data: collectionData,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Collection created successfully',
      data: collection,
      _links: {
        self: `/api/collections/${collection.slug}`,
        products: `/api/collections/${collection.slug}/products`,
      },
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'Location': `/api/collections/${collection.slug}`,
      },
    });

  } catch (error: any) {
    console.error('Collection creation API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create collection',
        code: 'COLLECTION_CREATE_ERROR',
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
