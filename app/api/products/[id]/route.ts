import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ratelimit } from '@/lib/redis/ratelimit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Rate limiting
    const ip = request.ip || 'unknown';
    const { success } = await ratelimit.limit(`product:${id}:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests for this product' },
        { status: 429 }
      );
    }

    // Get product with related data
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*),
        reviews:reviews(
          id,
          rating,
          title,
          comment,
          images,
          is_verified,
          created_at,
          user:users(full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Increment view count (async)
    incrementProductViews(id).catch(console.error);

    // Transform product data
    const transformedProduct = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price,
      images: product.images,
      specifications: product.specifications,
      rating: product.rating,
      review_count: product.review_count,
      stock: product.stock,
      sku: product.sku,
      brand: {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
        logo: product.brand.logo,
        description: product.brand.description,
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        description: product.category.description,
      },
      variants: product.variants?.map(variant => ({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        original_price: variant.original_price,
        sku: variant.sku,
        stock: variant.stock,
        attributes: variant.attributes,
      })) || [],
      reviews: product.reviews?.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        images: review.images,
        is_verified: review.is_verified,
        created_at: review.created_at,
        user: {
          name: review.user?.full_name || 'Anonymous',
          avatar: review.user?.avatar_url,
        },
      })) || [],
      is_featured: product.is_featured,
      is_deal: product.is_deal,
      deal_ends_at: product.deal_ends_at,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };

    // Get related products
    const relatedProducts = await getRelatedProducts(product.category.id, product.id);

    return NextResponse.json({
      success: true,
      data: {
        product: transformedProduct,
        related_products: relatedProducts,
      },
    });
  } catch (error: any) {
    console.error('Product API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Only allow authenticated admin users to update products
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
    
    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If SKU is being updated, check for conflicts
    if (body.sku) {
      const { data: skuConflict } = await supabase
        .from('products')
        .select('id')
        .eq('sku', body.sku)
        .neq('id', id)
        .single();

      if (skuConflict) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // If name is being updated, regenerate slug
    if (body.name) {
      const slug = generateSlug(body.name);
      
      // Check if new slug already exists (excluding current product)
      const { data: slugConflict } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single();

      if (slugConflict) {
        // Append timestamp to make slug unique
        body.slug = `${slug}-${Date.now()}`;
      } else {
        body.slug = slug;
      }
    }

    // Prepare update data
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Update product
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        brand:brands(*),
        category:categories(*),
        variants:product_variants(*)
      `)
      .single();

    if (updateError) {
      console.error('Product update error:', updateError);
      throw updateError;
    }

    // Handle variants update if provided
    if (body.variants && Array.isArray(body.variants)) {
      // Delete existing variants
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', id);

      // Create new variants
      const variants = body.variants.map((variant: any) => ({
        ...variant,
        product_id: id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variants);

      if (variantsError) {
        console.error('Variants update error:', variantsError);
        // Continue anyway, variants can be fixed later
      }
    }

    // Log product update
    await supabase.from('admin_logs').insert({
      user_id: user.id,
      action: 'product_update',
      resource_type: 'product',
      resource_id: id,
      metadata: { update_data: updateData },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error('Product update API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Only allow authenticated admin users to delete products
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

    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Soft delete: update status to 'deleted' instead of actually deleting
    const { error: deleteError } = await supabase
      .from('products')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Product delete error:', deleteError);
      throw deleteError;
    }

    // Log product deletion
    await supabase.from('admin_logs').insert({
      user_id: user.id,
      action: 'product_delete',
      resource_type: 'product',
      resource_id: id,
      metadata: { product_name: existingProduct.name },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Product delete API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

async function incrementProductViews(productId: string) {
  try {
    await supabase.rpc('increment_product_views', {
      product_id_param: productId,
    });
  } catch (error) {
    console.error('Failed to increment product views:', error);
  }
}

async function getRelatedProducts(categoryId: string, excludeProductId: string, limit: number = 4) {
  try {
    const { data: products } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        price,
        original_price,
        images,
        rating,
        review_count,
        brand:brands(name, slug),
        category:categories(name, slug)
      `)
      .eq('category_id', categoryId)
      .eq('status', 'active')
      .neq('id', excludeProductId)
      .order('rating', { ascending: false })
      .limit(limit);

    return products || [];
  } catch (error) {
    console.error('Failed to fetch related products:', error);
    return [];
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
