import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ratelimit } from '@/lib/redis/ratelimit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || 'unknown';
    const { success } = await ratelimit.limit(`products:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const offset = (page - 1) * limit;
    
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const sortBy = searchParams.get('sort_by') || 'newest';
    const search = searchParams.get('search');
    const inStock = searchParams.get('in_stock') === 'true';
    const onSale = searchParams.get('on_sale') === 'true';
    const featured = searchParams.get('featured') === 'true';

    // Build query
    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `, { count: 'exact' })
      .eq('status', 'active');

    // Apply filters
    if (category) {
      query = query.eq('category.slug', category);
    }
    
    if (brand) {
      query = query.eq('brand.slug', brand);
    }
    
    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }
    
    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }
    
    if (inStock) {
      query = query.gt('stock', 0);
    }
    
    if (onSale) {
      query = query.eq('is_deal', true);
    }
    
    if (featured) {
      query = query.eq('is_featured', true);
    }
    
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        query = query.order('price', { ascending: true });
        break;
      case 'price-high':
        query = query.order('price', { ascending: false });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'popular':
        // In production, you might sort by purchase count or views
        query = query.order('created_at', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    const { data: products, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Products query error:', error);
      throw error;
    }

    // Transform products
    const transformedProducts = products?.map(product => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price,
      images: product.images,
      rating: product.rating,
      review_count: product.review_count,
      stock: product.stock,
      sku: product.sku,
      brand: {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
        logo: product.brand.logo,
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
      },
      variants: product.variants?.map(variant => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        original_price: variant.original_price,
        sku: variant.sku,
        stock: variant.stock,
        attributes: variant.attributes,
      })),
      is_featured: product.is_featured,
      is_deal: product.is_deal,
      deal_ends_at: product.deal_ends_at,
      created_at: product.created_at,
      updated_at: product.updated_at,
    })) || [];

    // Get filters for UI
    const filters = await getAvailableFilters(category, brand);

    return NextResponse.json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
        filters,
      },
    });
  } catch (error: any) {
    console.error('Products API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only allow authenticated admin users to create products
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { name, price, category_id, brand_id, description, sku } = body;
    
    if (!name || !price || !category_id || !brand_id || !description || !sku) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this SKU already exists' },
        { status: 409 }
      );
    }

    // Generate slug from name
    const slug = generateSlug(name);
    
    // Check if slug already exists
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      // Append timestamp to make slug unique
      const uniqueSlug = `${slug}-${Date.now()}`;
      body.slug = uniqueSlug;
    } else {
      body.slug = slug;
    }

    // Set default values
    const productData = {
      ...body,
      status: 'active',
      rating: 0,
      review_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Create product
    const { data: product, error: createError } = await supabase
      .from('products')
      .insert(productData)
      .select(`
        *,
        brand:brands(*),
        category:categories(*)
      `)
      .single();

    if (createError) {
      console.error('Product creation error:', createError);
      throw createError;
    }

    // If variants are provided, create them
    if (body.variants && Array.isArray(body.variants)) {
      const variants = body.variants.map((variant: any) => ({
        ...variant,
        product_id: product.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variants);

      if (variantsError) {
        console.error('Variants creation error:', variantsError);
        // Continue anyway, variants can be added later
      }
    }

    // Log product creation
    await supabase.from('admin_logs').insert({
      user_id: user.id,
      action: 'product_create',
      resource_type: 'product',
      resource_id: product.id,
      metadata: { product_data: productData },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error: any) {
    console.error('Product creation API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

async function getAvailableFilters(category?: string | null, brand?: string | null) {
  try {
    const [categories, brands, priceRange] = await Promise.all([
      // Get categories
      supabase
        .from('categories')
        .select('id, name, slug, product_count')
        .eq('is_active', true)
        .order('name'),
      
      // Get brands
      supabase
        .from('brands')
        .select('id, name, slug, product_count')
        .eq('is_active', true)
        .order('name'),
      
      // Get price range
      supabase
        .from('products')
        .select('price')
        .eq('status', 'active')
        .order('price', { ascending: false })
        .limit(1),
    ]);

    const maxPrice = priceRange.data?.[0]?.price || 100000;
    const priceSteps = [
      0, 1000, 5000, 10000, 20000, 50000, 100000, maxPrice
    ].filter(step => step <= maxPrice);

    return {
      categories: categories.data || [],
      brands: brands.data || [],
      price_range: {
        min: 0,
        max: maxPrice,
        steps: priceSteps,
      },
      current_filters: {
        category,
        brand,
      },
    };
  } catch (error) {
    console.error('Filter generation error:', error);
    return {
      categories: [],
      brands: [],
      price_range: { min: 0, max: 100000, steps: [0, 1000, 5000, 10000, 20000, 50000, 100000] },
      current_filters: { category, brand },
    };
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
}
