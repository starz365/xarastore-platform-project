import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { cookies } from 'next/headers';

const addItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().min(1).max(100).default(1),
});

const updateItemSchema = z.object({
  itemId: z.string(),
  quantity: z.number().min(0).max(100),
});

const removeItemSchema = z.object({
  itemId: z.string(),
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await context.params;
    const body = await request.json();
    
    const { data: { session } } = await supabase.auth.getSession();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('cart_session')?.value;

    let currentCart = [];
    let cartId = null;
    let isUserCart = false;

    // Get current cart
    if (session?.user) {
      const { data } = await supabase
        .from('user_carts')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (data) {
        currentCart = data.items || [];
        cartId = data.id;
        isUserCart = true;
      }
    } else if (sessionId) {
      const { data } = await supabase
        .from('anonymous_carts')
        .select('*')
        .eq('session_id', sessionId)
        .single();
      
      if (data) {
        currentCart = data.items || [];
        cartId = data.id;
      }
    }

    let updatedCart = [...currentCart];
    let responseMessage = '';

    switch (action) {
      case 'add': {
        const validation = addItemSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid item data', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { productId, variantId, quantity } = validation.data;

        // Validate item
        const isValid = await validateCartItem({ productId, variantId, quantity });
        if (!isValid.valid) {
          return NextResponse.json(
            { error: 'Invalid item', details: isValid.reason },
            { status: 400 }
          );
        }

        // Check if item already exists
        const existingItemIndex = updatedCart.findIndex(
          item => item.productId === productId && item.variantId === variantId
        );

        if (existingItemIndex !== -1) {
          // Update quantity
          updatedCart[existingItemIndex].quantity += quantity;
        } else {
          // Add new item
          updatedCart.push({
            id: `${productId}_${variantId || 'default'}_${Date.now()}`,
            productId,
            variantId,
            quantity,
            addedAt: new Date().toISOString(),
          });
        }

        responseMessage = 'Item added to cart';
        break;
      }

      case 'update': {
        const validation = updateItemSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid update data', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { itemId, quantity } = validation.data;

        const itemIndex = updatedCart.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
          return NextResponse.json(
            { error: 'Item not found in cart' },
            { status: 404 }
          );
        }

        if (quantity === 0) {
          // Remove item
          updatedCart.splice(itemIndex, 1);
          responseMessage = 'Item removed from cart';
        } else {
          // Update quantity
          const item = updatedCart[itemIndex];
          
          // Validate stock
          const isValid = await validateCartItem({
            productId: item.productId,
            variantId: item.variantId,
            quantity,
          });

          if (!isValid.valid) {
            return NextResponse.json(
              { error: 'Cannot update quantity', details: isValid.reason },
              { status: 400 }
            );
          }

          updatedCart[itemIndex].quantity = quantity;
          responseMessage = 'Item quantity updated';
        }
        break;
      }

      case 'remove': {
        const validation = removeItemSchema.safeParse(body);
        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid remove data', details: validation.error.errors },
            { status: 400 }
          );
        }

        const { itemId } = validation.data;

        const itemIndex = updatedCart.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
          return NextResponse.json(
            { error: 'Item not found in cart' },
            { status: 404 }
          );
        }

        updatedCart.splice(itemIndex, 1);
        responseMessage = 'Item removed from cart';
        break;
      }

      case 'clear': {
        updatedCart = [];
        responseMessage = 'Cart cleared';
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Save updated cart
    if (isUserCart) {
      await supabase
        .from('user_carts')
        .upsert({
          id: cartId,
          user_id: session?.user?.id,
          items: updatedCart,
          updated_at: new Date().toISOString(),
        });
    } else if (sessionId) {
      await supabase
        .from('anonymous_carts')
        .upsert({
          id: cartId,
          session_id: sessionId,
          items: updatedCart,
          updated_at: new Date().toISOString(),
        });
    }

    // Enrich items for response
    const enrichedItems = await enrichCartItems(updatedCart);

    const responseData = {
      success: true,
      message: responseMessage,
      data: {
        items: enrichedItems,
        count: enrichedItems.length,
        total: calculateTotal(enrichedItems),
        sessionId: sessionId || undefined,
        isAuthenticated: !!session?.user,
      },
    };

    const response = NextResponse.json(responseData);

    // Set cookie for anonymous users
    if (!session?.user && !sessionId) {
      const newSessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      response.cookies.set({
        name: 'cart_session',
        value: newSessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('Cart action error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process cart action',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function validateCartItem(item: { productId: string; variantId?: string; quantity: number }): Promise<{ valid: boolean; reason?: string }> {
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
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        addedAt: item.addedAt,
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
