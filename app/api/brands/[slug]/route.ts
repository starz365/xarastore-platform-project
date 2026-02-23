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
    const isRateLimited = await rateLimiter(ip, `brand:${slug}`);
    if (isRateLimited) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Get brand details
    const { data: brand, error } = await supabase
      .from('brands')
      .select(`
        *,
        products:products(
          id,
          slug,
          name,
          price,
          original_price,
          images,
          rating,
          review_count,
          stock,
          is_featured,
          is_deal,
          created_at
        )
      `)
      .eq('slug', slug)
      .eq('products.is_active', true)
      .single();

    if (error || !brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Get brand statistics
    const { data: stats } = await supabase
      .from('products')
      .select(`
        count,
        min(price) as min_price,
        max(price) as max_price,
        avg(rating) as avg_rating
      `)
      .eq('brand_id', brand.id)
      .eq('is_active', true)
      .eq('stock', '>', 0)
      .single();

    // Get top categories for this brand
    const { data: categories } = await supabase
      .from('products')
      .select(`
        category:categories(
          id,
          slug,
          name,
          product_count
        )
      `)
      .eq('brand_id', brand.id)
      .eq('is_active', true)
      .group('category_id, categories(id, slug, name, product_count)')
      .limit(5);

    // Transform response
    const transformedBrand = {
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      description: brand.description,
      logo: brand.logo,
      banner_image: brand.banner_image,
      website_url: brand.website_url,
      social_links: brand.social_links,
      is_featured: brand.is_featured,
      meta_title: brand.meta_title,
      meta_description: brand.meta_description,
      created_at: brand.created_at,
      updated_at: brand.updated_at,
      statistics: {
        total_products: stats?.count || 0,
        price_range: {
          min: stats?.min_price || 0,
          max: stats?.max_price || 0,
        },
        average_rating: stats?.avg_rating ? parseFloat(stats.avg_rating).toFixed(2) : '0.00',
      },
      categories: categories?.map(c => c.category) || [],
      featured_products: brand.products
        ?.filter(p => p.is_featured)
        .slice(0, 6)
        .map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          original_price: p.original_price,
          images: p.images,
          rating: p.rating,
          review_count: p.review_count,
          stock: p.stock,
          is_featured: p.is_featured,
          is_deal: p.is_deal,
          created_at: p.created_at,
        })) || [],
      _links: {
        self: `/api/brands/${brand.slug}`,
        products: `/api/products?brand=${brand.slug}`,
        featured_products: `/api/products?brand=${brand.slug}&featured=true`,
        deals: `/api/products?brand=${brand.slug}&deal=true`,
        categories: `/api/categories?brand=${brand.slug}`,
      },
    };

    return NextResponse.json({
      success: true,
      data: transformedBrand,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'CDN-Cache-Control': 'public, max-age=7200',
        'Vary': 'Accept-Encoding, Accept',
      },
    });

  } catch (error: any) {
    console.error('Brand detail API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch brand details',
        code: 'BRAND_DETAIL_ERROR',
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

    // Get existing brand
    const { data: existingBrand } = await supabaseAdmin
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
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
      'logo',
      'banner_image',
      'website_url',
      'social_links',
      'is_featured',
      'meta_title',
      'meta_description',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]?.trim() || null;
      }
    }

    // If slug is being changed, check for conflicts
    if (body.slug && body.slug !== existingBrand.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(body.slug)) {
        return NextResponse.json(
          { error: 'Invalid slug format' },
          { status: 400 }
        );
      }

      const { data: conflictingBrand } = await supabaseAdmin
        .from('brands')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', existingBrand.id)
        .single();

      if (conflictingBrand) {
        return NextResponse.json(
          { error: 'Slug already in use' },
          { status: 409 }
        );
      }

      updateData.slug = body.slug.trim();
    }

    // Update brand
    const { data: updatedBrand, error } = await supabaseAdmin
      .from('brands')
      .update(updateData)
      .eq('id', existingBrand.id)
      .select()
      .single();

    if (error) {
      console.error('Brand update error:', error);
      throw error;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'brand_update',
      table_name: 'brands',
      record_id: existingBrand.id,
      user_id: userId || 'system',
      old_data: existingBrand,
      new_data: updatedBrand,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    // Clear cache for this brand
    const cacheKey = `brand:${slug}`;
    // In production, this would clear from Redis/CDN cache
    console.log(`Clearing cache for ${cacheKey}`);

    return NextResponse.json({
      success: true,
      message: 'Brand updated successfully',
      data: updatedBrand,
      _links: {
        self: `/api/brands/${updatedBrand.slug}`,
        products: `/api/products?brand=${updatedBrand.slug}`,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('Brand update API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update brand',
        code: 'BRAND_UPDATE_ERROR',
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
    
    // Authentication check - require admin role
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

    // Get existing brand
    const { data: existingBrand } = await supabaseAdmin
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      );
    }

    // Check if brand has products
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('brand_id', existingBrand.id)
      .limit(1);

    if (products && products.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete brand with existing products',
          product_count: products.length,
        },
        { status: 409 }
      );
    }

    // Delete brand
    const { error } = await supabaseAdmin
      .from('brands')
      .delete()
      .eq('id', existingBrand.id);

    if (error) {
      console.error('Brand deletion error:', error);
      throw error;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'brand_delete',
      table_name: 'brands',
      record_id: existingBrand.id,
      user_id: userId || 'system',
      old_data: existingBrand,
      new_data: null,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    // Clear cache
    const cacheKey = `brand:${slug}`;
    console.log(`Clearing cache for ${cacheKey}`);

    return NextResponse.json({
      success: true,
      message: 'Brand deleted successfully',
      deleted_at: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('Brand deletion API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete brand',
        code: 'BRAND_DELETE_ERROR',
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
