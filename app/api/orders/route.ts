import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    quantity: z.number().min(1).max(100),
    price: z.number().min(0),
    name: z.string().min(1),
    image: z.string().optional(),
  })).min(1).max(50),
  shippingAddress: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }),
  billingAddress: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(1),
  }).optional(),
  paymentMethod: z.enum(['mpesa', 'card', 'bank']),
  subtotal: z.number().min(0),
  shipping: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      throw error;
    }

    const response = {
      success: true,
      data: orders || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasNextPage: (page * limit) < (count || 0),
        hasPreviousPage: page > 1,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Get orders error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const orderData = validation.data;

    // Validate stock for all items
    for (const item of orderData.items) {
      const stockCheck = await checkStock(item.productId, item.variantId, item.quantity);
      if (!stockCheck.available) {
        return NextResponse.json(
          {
            error: 'Insufficient stock',
            details: `Item ${item.name} is out of stock`,
            productId: item.productId,
          },
          { status: 400 }
        );
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const orderId = uuidv4();

    // Calculate delivery estimate (3-5 business days)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    
    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        user_id: session.user.id,
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        tax: orderData.tax,
        total: orderData.total,
        status: 'pending',
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress || orderData.shippingAddress,
        payment_method: orderData.paymentMethod,
        payment_status: 'pending',
        estimated_delivery: deliveryDate.toISOString(),
        notes: orderData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Update stock for all items
    for (const item of orderData.items) {
      await updateStock(item.productId, item.variantId, item.quantity);
    }

    // Clear user's cart after successful order
    await supabase
      .from('user_carts')
      .delete()
      .eq('user_id', session.user.id);

    // Create order history entry
    await supabase
      .from('order_history')
      .insert({
        order_id: orderId,
        status: 'pending',
        notes: 'Order created successfully',
        created_at: new Date().toISOString(),
      });

    // Send order confirmation email (in production)
    // await sendOrderConfirmation(session.user.email, order);

    const response = {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        total: order.total,
        status: order.status,
        estimatedDelivery: order.estimated_delivery,
        paymentMethod: order.payment_method,
        nextSteps: {
          payment: orderData.paymentMethod === 'mpesa' 
            ? 'Complete M-Pesa payment using the phone number provided' 
            : 'Complete payment using your selected method',
          tracking: 'You will receive tracking information once your order ships',
          support: 'Contact support@xarastore.com for any questions',
        },
      },
      message: 'Order created successfully',
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function checkStock(productId: string, variantId?: string, quantity: number = 1): Promise<{ available: boolean; currentStock?: number }> {
  try {
    if (variantId) {
      // Check variant stock
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', variantId)
        .single();

      if (!variant || variant.stock < quantity) {
        return { available: false, currentStock: variant?.stock };
      }
      return { available: true, currentStock: variant.stock };
    } else {
      // Check product stock
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (!product || product.stock < quantity) {
        return { available: false, currentStock: product?.stock };
      }
      return { available: true, currentStock: product.stock };
    }
  } catch (error) {
    return { available: false };
  }
}

async function updateStock(productId: string, variantId?: string, quantity: number = 1): Promise<void> {
  try {
    if (variantId) {
      // Update variant stock
      await supabase
        .from('product_variants')
        .update({ stock: supabase.sql`stock - ${quantity}` })
        .eq('id', variantId);
    } else {
      // Update product stock
      await supabase
        .from('products')
        .update({ stock: supabase.sql`stock - ${quantity}` })
        .eq('id', productId);
    }
  } catch (error) {
    console.error('Failed to update stock:', error);
    throw error;
  }
}
