import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { rateLimiter } from '@/lib/utils/rate-limiter';
import { validateApiKey } from '@/lib/utils/security';

// Initialize admin client for secure operations
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
    const isRateLimited = await rateLimiter(ip, 'brands');
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
    const sortBy = searchParams.get('sort_by') || 'name';
    const order = searchParams.get('order') || 'asc';
    const featured = searchParams.get('featured') === 'true';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');

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
      .from('brands')
      .select(`
        *,
        products:products(count)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    if (category) {
      // Get brands that have products in this category
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .single();

      if (categoryData) {
        const { data: brandIds } = await supabase
          .from('products')
          .select('brand_id')
          .eq('category_id', categoryData.id)
          .group('brand_id');

        if (brandIds && brandIds.length > 0) {
          query = query.in('id', brandIds.map(b => b.brand_id));
        }
      }
    }

    // Apply sorting
    const validSortColumns = ['name', 'created_at', 'product_count', 'updated_at'];
    const validOrders = ['asc', 'desc'];
    
    if (validSortColumns.includes(sortBy) && validOrders.includes(order)) {
      if (sortBy === 'product_count') {
        query = query.order('product_count', { ascending: order === 'asc' });
      } else {
        query = query.order(sortBy, { ascending: order === 'asc' });
      }
    } else {
      query = query.order('name', { ascending: true });
    }

    // Execute query with pagination
    const { data: brands, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Brands fetch error:', error);
      throw error;
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Transform response
    const transformedBrands = brands?.map(brand => ({
      id: brand.id,
      slug: brand.slug,
      name: brand.name,
      description: brand.description,
      logo: brand.logo,
      banner_image: brand.banner_image,
      website_url: brand.website_url,
      social_links: brand.social_links,
      is_featured: brand.is_featured,
      product_count: brand.products?.[0]?.count || 0,
      created_at: brand.created_at,
      updated_at: brand.updated_at,
      _links: {
        self: `/api/brands/${brand.slug}`,
        products: `/api/products?brand=${brand.slug}`,
        categories: `/api/categories?brand=${brand.slug}`,
      },
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedBrands,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
        next_page: hasNextPage ? `/api/brands?page=${page + 1}&limit=${limit}` : null,
        prev_page: hasPrevPage ? `/api/brands?page=${page - 1}&limit=${limit}` : null,
      },
      filters: {
        search,
        featured,
        category,
        sort_by: sortBy,
        order,
      },
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=600',
        'Vary': 'Accept-Encoding, Accept',
      },
    });

  } catch (error: any) {
    console.error('Brands API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch brands',
        code: 'BRANDS_FETCH_ERROR',
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
    // Authentication check - only authenticated admin users can create brands
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    if (!authHeader && !apiKey) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let isAuthenticated = false;
    
    if (apiKey) {
      isAuthenticated = await validateApiKey(apiKey, 'admin');
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        // Check if user has admin role
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
    const { name, slug } = body;
    
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if brand already exists
    const { data: existingBrand } = await supabaseAdmin
      .from('brands')
      .select('id')
      .or(`name.eq.${name},slug.eq.${slug}`)
      .single();

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this name or slug already exists' },
        { status: 409 }
      );
    }

    // Create brand
    const brandData = {
      name: name.trim(),
      slug: slug.trim(),
      description: body.description?.trim() || null,
      logo: body.logo?.trim() || null,
      banner_image: body.banner_image?.trim() || null,
      website_url: body.website_url?.trim() || null,
      social_links: body.social_links || {},
      is_featured: body.is_featured || false,
      meta_title: body.meta_title?.trim() || null,
      meta_description: body.meta_description?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: brand, error } = await supabaseAdmin
      .from('brands')
      .insert(brandData)
      .select()
      .single();

    if (error) {
      console.error('Brand creation error:', error);
      throw error;
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      action: 'brand_create',
      table_name: 'brands',
      record_id: brand.id,
      user_id: 'system', // Would be actual user ID in production
      old_data: null,
      new_data: brandData,
      ip_address: request.ip || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Brand created successfully',
      data: brand,
      _links: {
        self: `/api/brands/${brand.slug}`,
        products: `/api/products?brand=${brand.slug}`,
      },
    }, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
        'Location': `/api/brands/${brand.slug}`,
      },
    });

  } catch (error: any) {
    console.error('Brand creation API error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to create brand',
        code: 'BRAND_CREATE_ERROR',
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
