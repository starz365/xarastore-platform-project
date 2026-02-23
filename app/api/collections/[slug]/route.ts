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
    const isRateLimited = await rateLimiter(ip, `collection:${slug}`);
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get('include_products') !== 'false';
    const productLimit = parseInt(searchParams.get('product_limit') || '20');
    const productPage = parseInt(searchParams.get('product_page') || '1');

    // Get collection details
    const { data: collection, error } = await supabase
      .from('collections')
      .select(`
        *,
        category:categories(*),
        collection_products(count)
      `)
      .eq('slug', slug)
      .single();

    if (error || !collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Check if collection is active
    const now = new Date();
    if (collection.starts_at && new Date(collection.starts_at) > now) {
      return NextResponse.json(
        { error: 'Collection not available yet' },
        { status: 403 }
      );
    }

    if (collection.ends_at && new Date(collection.ends_at) < now) {
      return NextResponse.json(
        { error: 'Collection has ended' },
        { status: 410 }
      );
    }

    // Get products if requested
    let products = null;
    let productPagination = null;

    if (includeProducts) {
      const productOffset = (productPage - 1) * productLimit;
      
      const { data: collectionProducts, count } = await supabase
        .from('collection_products')
        .select(`
          position,
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
        .eq('collection_id', collection.id)
        .order('position', { ascending: true })
        .range(productOffset, productOffset + productLimit - 1);

      products = collectionProducts?.map(cp => cp.product) || [];
      
      const totalProductPages = count ? Math.ceil(count / productLimit) : 0;
      productPagination = {
        page: productPage,
        limit: productLimit,
        total: count || 0,
        total_pages: totalProductPages,
        has_next_page: productPage < totalProductPages,
        has_prev_page: productPage > 1,
      };
    }

    // Get related collections
    const { data: relatedCollections } = await supabase
      .from('collections')
      .select('id, slug, name, image, type')
      .eq('is_active', true)
      .neq('id', collection.id)
      .or(`category_id.eq.${collection.category_id},type.eq.${collection.type}`)
      .limit(4);

    // Transform response
    const transformedCollection = {
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
      products: products,
      related_collections: relatedCollections?.map(rc => ({
        id: rc.id,
        slug: rc.slug,
        name: rc.name,
        image: rc.image,
        type: rc.type,
        _links: {
          self: `/api/collections/${rc.slug}`,
        },
      })) || [],
      created_at: collection.created_at,
      updated_at: collection.updated_at,
      _links: {
        self: `/api/collections/${collection.slug}`,
        products: `/api/collections/${collection.slug}/products`,
        category: collection.category ? `/api/categories/${collection.category.slug}` : null,
      },
    };

    const response: any = {
      success: true,
      data: transformedCollection,
    };

    if (productPagination) {
      response.pagination = productPagination;
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=600',
        'Vary': 'Accept-Encoding, Accept',
      },
    });

  } catch (error: any) {
    console.error('Collection detail API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch collection details',
        code: 'COLLECTION_DETAIL_ERROR',
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    
    // Authentication check
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

    // Get existing collection
    const { data: existingCollection } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only update allowed fields
    const allowedFields = [
      'name',
      'description',
      'type',
      'image',
      'banner_image',
      'category_id',
      'is_featured',
      'is_active',
      'position',
      'starts_at',
      'ends_at',
      'meta_title',
      'meta_description',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]?.trim?.() || body[field];
      }
    }

    // Validate type if being updated
    if (body.type) {
      const validTypes = ['seasonal', 'trending', 'featured', 'themed', 'custom'];
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // If slug is being changed, check for conflicts
    if (body.slug && body.slug !== existingCollection.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(body.slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format' },
          { status: 400 }
        );
      }

      const { data: conflictingCollection } = await supabaseAdmin
        .from('collections')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', existingCollection.id)
        .single();

      if (conflictingCollection) {
        return NextResponse.json(
          { error: 'Slug already in use' },
          { status: 409 }
        );
      }

      updateData.slug = body.slug.trim();
    }

    // Update collection
    const { data: updatedCollection, error } = await supabaseAdmin
      .from('collections')
      .update(updateData)
      .eq('id', existingCollection.id)
      .select()
      .single();

    if (error) {
      console.error('Collection update error:', error);
      throw error;
    }

    // Handle product updates if provided
    if (body.products && Array.isArray(body.products)) {
      // Delete existing collection products
      await supabaseAdmin
        .from('collection_products')
        .delete()
        .eq('collection_id', existingCollection.id);

      // Insert new collection products
      const collectionProducts = body.products.map((product: any, index: number) => ({
        collection_id: existingCollection.id,
        product_id: product.product_id || product.id,
        position: product.position || index + 1,
        added_by: userId || 'system',
        added_at: new Date().toISOString(),
      }));

      await supabaseAdmin
        .from('collection_products')
        .insert(collectionProducts);
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'collection_update',
      table_name: 'collections',
      record_id: existingCollection.id,
      user_id: userId || 'system',
      old_data: existingCollection,
      new_data: updatedCollection,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      data: updatedCollection,
      _links: {
        self: `/api/collections/${updatedCollection.slug}`,
        products: `/api/collections/${updatedCollection.slug}/products`,
      },
    });

  } catch (error: any) {
    console.error('Collection update API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update collection',
        code: 'COLLECTION_UPDATE_ERROR',
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Get existing collection
    const { data: existingCollection } = await supabaseAdmin
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Delete collection products first
    await supabaseAdmin
      .from('collection_products')
      .delete()
      .eq('collection_id', existingCollection.id);

    // Delete collection
    const { error } = await supabaseAdmin
      .from('collections')
      .delete()
      .eq('id', existingCollection.id);

    if (error) {
      console.error('Collection deletion error:', error);
      throw error;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'collection_delete',
      table_name: 'collections',
      record_id: existingCollection.id,
      user_id: userId || 'system',
      old_data: existingCollection,
      new_data: null,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully',
      deleted_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Collection deletion API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete collection',
        code: 'COLLECTION_DELETE_ERROR',
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
