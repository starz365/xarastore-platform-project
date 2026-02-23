import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { cookies } from 'next/headers';

const cartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().min(1).max(100),
});

const cartSchema = z.object({
  items: z.array(cartItemSchema),
  sessionId: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('cart_session')?.value;
    const { data: { session } } = await supabase.auth.getSession();
    
    let cartData = null;

    if (session?.user) {
      // Get user's cart from database
      const { data } = await supabase
        .from('user_carts')
        .select('items')
        .eq('user_id', session.user.id)
        .single();
      
      cartData = data?.items || [];
    } else if (sessionId) {
      // Get anonymous cart from database
      const { data } = await supabase
        .from('anonymous_carts')
        .select('items')
        .eq('session_id', sessionId)
        .single();
      
      cartData = data?.items || [];
    }

    // Enrich cart items with product details
    const enrichedItems = await enrichCartItems(cartData || []);

    const response = {
      success: true,
      data: {
        items: enrichedItems,
        count: enrichedItems.length,
        total: calculateTotal(enrichedItems),
        sessionId: sessionId || undefined,
        isAuthenticated: !!session?.user,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Get cart error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cart',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = cartSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid cart data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { items, sessionId } = validation.data;
    const { data: { session } } = await supabase.auth.getSession();
    
    // Validate all items
    for (const item of items) {
      const isValid = await validateCartItem(item);
      if (!isValid.valid) {
        return NextResponse.json(
          { error: 'Invalid cart item', details: isValid.reason, item },
          { status: 400 }
        );
      }
    }

    let cartSessionId = sessionId;
    if (!cartSessionId && !session?.user) {
      // Generate new session ID for anonymous user
      cartSessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (session?.user) {
      // Save to user cart
      const { error } = await supabase
        .from('user_carts')
        .upsert({
          user_id: session.user.id,
          items: items,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } else if (cartSessionId) {
      // Save to anonymous cart
      const { error } = await supabase
        .from('anonymous_carts')
        .upsert({
          session_id: cartSessionId,
          items: items,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    // Enrich items for response
    const enrichedItems = await enrichCartItems(items);

    const response = NextResponse.json({
      success: true,
      data: {
        items: enrichedItems,
        count: enrichedItems.length,
        total: calculateTotal(enrichedItems),
        sessionId: cartSessionId,
        isAuthenticated: !!session?.user,
      },
    });

    // Set cookie for anonymous users
    if (!session?.user && cartSessionId) {
      response.cookies.set({
        name: 'cart_session',
        value: cartSessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Save cart error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save cart',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('cart_session')?.value;

    if (session?.user) {
      // Clear user cart
      await supabase
        .from('user_carts')
        .delete()
        .eq('user_id', session.user.id);
    }

    if (sessionId) {
      // Clear anonymous cart
      await supabase
        .from('anonymous_carts')
        .delete()
        .eq('session_id', sessionId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Cart cleared successfully',
    });

    // Clear cart cookie
    response.cookies.delete('cart_session');

    return response;
  } catch (error: any) {
    console.error('Clear cart error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cart',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function validateCartItem(item: z.infer<typeof cartItemSchema>): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', item.productId)
      .single();

    if (productError || !product) {
      return { valid: false, reason: 'Product not found' };
    }

    // Check stock
    if (product.stock < item.quantity) {
      return { valid: false, reason: 'Insufficient stock' };
    }

    // If variant specified, validate it
    if (item.variantId) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('id, stock, product_id')
        .eq('id', item.variantId)
        .single();

      if (variantError || !variant) {
        return { valid: false, reason: 'Variant not found' };
      }

      if (variant.product_id !== item.productId) {
        return { valid: false, reason: 'Variant does not belong to product' };
      }

      if (variant.stock < item.quantity) {
        return { valid: false, reason: 'Insufficient variant stock' };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Validation failed' };
  }
}

async function enrichCartItems(items: any[]) {
  if (!items || items.length === 0) return [];

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const { data: product } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          images,
          slug,
          brand:brands(name, slug),
          category:categories(name, slug)
        `)
        .eq('id', item.productId)
        .single();

      let variant = null;
      if (item.variantId) {
        const { data: variantData } = await supabase
          .from('product_variants')
          .select('*')
          .eq('id', item.variantId)
          .single();
        
        variant = variantData;
      }

      return {
        id: item.productId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        product: product ? {
          name: product.name,
          price: product.price,
          images: product.images || [],
          slug: product.slug,
          brand: product.brand,
          category: product.category,
        } : null,
        variant: variant ? {
          name: variant.name,
          price: variant.price,
          sku: variant.sku,
          attributes: variant.attributes || {},
        } : null,
        subtotal: (variant?.price || product?.price || 0) * item.quantity,
      };
    })
  );

  return enrichedItems.filter(item => item.product !== null);
}

function calculateTotal(items: any[]): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}
