import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const paramsSchema = z.object({
  orderId: z.string().uuid(),
});

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed']).optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    
    const validation = paramsSchema.safeParse({ orderId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch order with all details
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_history:order_history(
          id,
          status,
          notes,
          created_at
        )
      `)
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Enrich order items with current product details
    const enrichedItems = await Promise.all(
      order.items.map(async (item: any) => {
        const { data: product } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            images,
            brand:brands(name),
            category:categories(name)
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
          ...item,
          product: product ? {
            name: product.name,
            slug: product.slug,
            images: product.images || [],
            brand: product.brand,
            category: product.category,
          } : null,
          variant: variant ? {
            name: variant.name,
            sku: variant.sku,
            attributes: variant.attributes || {},
          } : null,
        };
      })
    );

    const responseData = {
      ...order,
      items: enrichedItems,
    };

    const response = {
      success: true,
      data: responseData,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        'ETag': `"${order.updated_at}"`,
      },
    });
  } catch (error: any) {
    console.error('Get order error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    
    const validation = paramsSchema.safeParse({ orderId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const updateValidation = updateOrderSchema.safeParse(body);
    if (!updateValidation.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: updateValidation.error.errors },
        { status: 400 }
      );
    }

    const updateData = updateValidation.data;

    // Check if order belongs to user
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // Only allow status updates to certain states
    if (updateData.status) {
      const allowedStatusUpdates: Record<string, string[]> = {
        pending: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: [],
      };

      const currentStatus = existingOrder.status;
      const allowedNextStatuses = allowedStatusUpdates[currentStatus] || [];

      if (!allowedNextStatuses.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Cannot change status from ${currentStatus} to ${updateData.status}` },
          { status: 400 }
        );
      }

      // Add to order history
      await supabase
        .from('order_history')
        .insert({
          order_id: orderId,
          status: updateData.status,
          notes: updateData.notes || `Status changed to ${updateData.status}`,
          created_at: new Date().toISOString(),
        });

      // If order is cancelled, restore stock
      if (updateData.status === 'cancelled') {
        await restoreOrderStock(orderId);
      }
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const response = {
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully',
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update order',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    
    const validation = paramsSchema.safeParse({ orderId });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid order ID', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if order belongs to user and can be cancelled
    const { data: existingOrder, error: checkError } = await supabase
      .from('orders')
      .select('id, user_id, status, payment_status')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // Only allow cancellation if order is still pending or processing
    if (!['pending', 'processing'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status: ${existingOrder.status}` },
        { status: 400 }
      );
    }

    // Update order status to cancelled
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Restore stock for cancelled order
    await restoreOrderStock(orderId);

    // Add to order history
    await supabase
      .from('order_history')
      .insert({
        order_id: orderId,
        status: 'cancelled',
        notes: 'Order cancelled by customer',
        created_at: new Date().toISOString(),
      });

    const response = {
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        refund: updatedOrder.payment_status === 'paid' 
          ? 'Refund will be processed within 5-7 business days' 
          : null,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cancel order',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function restoreOrderStock(orderId: string): Promise<void> {
  try {
    // Get order items
    const { data: order } = await supabase
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .single();

    if (!order?.items) return;

    // Restore stock for each item
    for (const item of order.items) {
      if (item.variantId) {
        await supabase
          .from('product_variants')
          .update({ stock: supabase.sql`stock + ${item.quantity}` })
          .eq('id', item.variantId);
      } else {
        await supabase
          .from('products')
          .update({ stock: supabase.sql`stock + ${item.quantity}` })
          .eq('id', item.productId);
      }
    }
  } catch (error) {
    console.error('Failed to restore stock:', error);
    throw error;
  }
}
