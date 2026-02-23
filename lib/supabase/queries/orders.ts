import { supabase } from '../client';
import { Order, OrderItem } from '@/types';
import { generateOrderNumber } from '../functions/generate_order_number';

export async function createOrder(
  userId: string,
  orderData: {
    items: OrderItem[];
    shippingAddress: any;
    billingAddress?: any;
    paymentMethod: string;
    shippingMethod: string;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    notes?: string;
  }
): Promise<Order | null> {
  try {
    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Create order
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        items: orderData.items,
        shipping_address: orderData.shippingAddress,
        billing_address: orderData.billingAddress,
        payment_method: orderData.paymentMethod,
        shipping_method: orderData.shippingMethod,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping,
        tax: orderData.tax,
        total: orderData.total,
        status: 'pending',
        payment_status: 'pending',
        notes: orderData.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update product stock
    await updateProductStock(orderData.items);

    // Send order confirmation email
    await sendOrderConfirmation(data.id, userId);

    return transformOrder(data);
  } catch (error) {
    console.error('Error creating order:', error);
    return null;
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return transformOrder(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error) throw error;
    return transformOrder(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    return null;
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(notes && { status_notes: notes }),
      })
      .eq('id', orderId);

    if (error) throw error;

    // Send status update notification
    await sendOrderStatusNotification(orderId, status);

    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'pending' | 'paid' | 'failed',
  mpesaReceipt?: string
): Promise<boolean> {
  try {
    const updates: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };

    if (mpesaReceipt) {
      updates.mpesa_receipt = mpesaReceipt;
    }

    // If payment is successful, update order status to processing
    if (paymentStatus === 'paid') {
      updates.status = 'processing';
    }

    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;

    // Send payment confirmation
    if (paymentStatus === 'paid') {
      await sendPaymentConfirmation(orderId);
    }

    return true;
  } catch (error) {
    console.error('Error updating payment status:', error);
    return false;
  }
}

export async function cancelOrder(orderId: string, reason: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    // Restore product stock
    await restoreProductStock(orderId);

    // Send cancellation notification
    await sendOrderCancellationNotification(orderId, reason);

    return true;
  } catch (error) {
    console.error('Error cancelling order:', error);
    return false;
  }
}

export async function getOrders(
  filters?: {
    status?: Order['status'];
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  },
  page: number = 1,
  pageSize: number = 20
): Promise<{ orders: Order[]; total: number }> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.search) {
      query = query.or(`order_number.ilike.%${filters.search}%,user_id.ilike.%${filters.search}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) throw error;

    return {
      orders: (data || []).map(transformOrder),
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { orders: [], total: 0 };
  }
}

export async function getOrderAnalytics(
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Promise<{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  orderStatusBreakdown: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
}> {
  try {
    let interval = '1 day';
    let dateFormat = 'YYYY-MM-DD';
    
    switch (period) {
      case 'day':
        interval = '1 hour';
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'week':
        interval = '1 day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'month':
        interval = '1 day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'year':
        interval = '1 month';
        dateFormat = 'YYYY-MM';
        break;
    }

    // Get total orders and revenue
    const { data: totals, error: totalsError } = await supabase
      .from('orders')
      .select('status, total')
      .gte('created_at', `now() - interval '1 ${period}'`);

    if (totalsError) throw totalsError;

    // Get revenue by day
    const { data: revenueData, error: revenueError } = await supabase.rpc(
      'get_revenue_by_period',
      {
        p_period: period,
        p_format: dateFormat,
      }
    );

    if (revenueError) throw revenueError;

    const totalOrders = totals?.length || 0;
    const totalRevenue = totals?.reduce((sum, order) => sum + order.total, 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const orderStatusBreakdown: Record<string, number> = {};
    totals?.forEach(order => {
      orderStatusBreakdown[order.status] = (orderStatusBreakdown[order.status] || 0) + 1;
    });

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      orderStatusBreakdown,
      revenueByDay: revenueData || [],
    };
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      orderStatusBreakdown: {},
      revenueByDay: [],
    };
  }
}

export async function exportOrders(format: 'csv' | 'json' = 'csv'): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (format === 'csv') {
      const headers = [
        'Order Number',
        'Customer ID',
        'Status',
        'Payment Status',
        'Total',
        'Subtotal',
        'Shipping',
        'Tax',
        'Payment Method',
        'Created At',
        'Updated At',
      ];

      const rows = data?.map(order => [
        order.order_number,
        order.user_id,
        order.status,
        order.payment_status,
        order.total,
        order.subtotal,
        order.shipping,
        order.tax,
        order.payment_method,
        order.created_at,
        order.updated_at,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows?.map(row => row.join(',')) || [],
      ].join('\n');

      return csvContent;
    } else {
      return JSON.stringify(data, null, 2);
    }
  } catch (error) {
    console.error('Error exporting orders:', error);
    throw error;
  }
}

async function updateProductStock(items: OrderItem[]): Promise<void> {
  for (const item of items) {
    await supabase.rpc('decrement_product_stock', {
      p_product_id: item.productId,
      p_variant_id: item.variantId,
      p_quantity: item.quantity,
    });
  }
}

async function restoreProductStock(orderId: string): Promise<void> {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('items')
      .eq('id', orderId)
      .single();

    if (!order?.items) return;

    for (const item of order.items) {
      await supabase.rpc('increment_product_stock', {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id,
        p_quantity: item.quantity,
      });
    }
  } catch (error) {
    console.error('Error restoring product stock:', error);
  }
}

async function sendOrderConfirmation(orderId: string, userId: string): Promise<void> {
  // Implementation for sending order confirmation email
  // This would integrate with your email service (Resend, SendGrid, etc.)
  console.log(`Order confirmation email sent for order ${orderId} to user ${userId}`);
}

async function sendOrderStatusNotification(orderId: string, status: string): Promise<void> {
  console.log(`Order status update notification sent for order ${orderId}: ${status}`);
}

async function sendPaymentConfirmation(orderId: string): Promise<void> {
  console.log(`Payment confirmation sent for order ${orderId}`);
}

async function sendOrderCancellationNotification(orderId: string, reason: string): Promise<void> {
  console.log(`Order cancellation notification sent for order ${orderId}: ${reason}`);
}

function transformOrder(data: any): Order {
  return {
    id: data.id,
    orderNumber: data.order_number,
    userId: data.user_id,
    items: data.items,
    subtotal: data.subtotal,
    shipping: data.shipping,
    tax: data.tax,
    total: data.total,
    status: data.status,
    shippingAddress: data.shipping_address,
    billingAddress: data.billing_address,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    createdAt: data.created_at,
    estimatedDelivery: data.estimated_delivery,
  };
}
