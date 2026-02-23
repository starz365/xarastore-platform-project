import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const paramsSchema = z.object({
  orderId: z.string().uuid(),
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
    
    // Allow public tracking with order number
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    
    let orderQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        shipping_address,
        estimated_delivery,
        created_at,
        order_history:order_history(
          id,
          status,
          notes,
          created_at
        )
      `)
      .eq('id', orderId);

    if (session?.user) {
      orderQuery = orderQuery.eq('user_id', session.user.id);
    } else if (orderNumber) {
      orderQuery = orderQuery.eq('order_number', orderNumber);
    } else {
      return NextResponse.json(
        { error: 'Authentication or order number required' },
        { status: 401 }
      );
    }

    const { data: order, error } = await orderQuery.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Get tracking information based on status
    const trackingInfo = await getTrackingInfo(order);

    const response = {
      success: true,
      data: {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          shippingAddress: order.shipping_address,
          estimatedDelivery: order.estimated_delivery,
          createdAt: order.created_at,
          history: order.order_history?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ) || [],
        },
        tracking: trackingInfo,
        deliveryPartner: getDeliveryPartner(order.shipping_address?.city),
        nextUpdate: calculateNextUpdate(order.status),
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=1800',
      },
    });
  } catch (error: any) {
    console.error('Track order error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track order',
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

async function getTrackingInfo(order: any) {
  const statusMap: Record<string, any> = {
    pending: {
      status: 'Order Received',
      description: 'We have received your order and are preparing it for shipment.',
      icon: '📦',
      progress: 25,
      estimatedDate: null,
      actions: ['Payment processing', 'Order verification'],
    },
    processing: {
      status: 'Processing',
      description: 'Your order is being processed and packed for shipment.',
      icon: '🏭',
      progress: 50,
      estimatedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      actions: ['Quality check', 'Packaging', 'Label generation'],
    },
    shipped: {
      status: 'Shipped',
      description: 'Your order has been shipped and is on its way to you.',
      icon: '🚚',
      progress: 75,
      estimatedDate: order.estimated_delivery,
      actions: ['In transit', 'Out for delivery'],
      trackingNumber: generateTrackingNumber(order.id),
      courier: getDeliveryPartner(order.shipping_address?.city),
    },
    delivered: {
      status: 'Delivered',
      description: 'Your order has been successfully delivered.',
      icon: '✅',
      progress: 100,
      estimatedDate: order.estimated_delivery,
      actions: ['Delivery confirmed'],
      deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Mock delivered 1 day ago
    },
    cancelled: {
      status: 'Cancelled',
      description: 'This order has been cancelled.',
      icon: '❌',
      progress: 0,
      estimatedDate: null,
      actions: ['Order cancelled', 'Refund processing'],
    },
  };

  const defaultInfo = statusMap[order.status] || {
    status: 'Unknown',
    description: 'Unable to retrieve tracking information.',
    icon: '❓',
    progress: 0,
    estimatedDate: null,
    actions: [],
  };

  // Add estimated delivery date if not already set
  if (!defaultInfo.estimatedDate && order.estimated_delivery) {
    defaultInfo.estimatedDate = order.estimated_delivery;
  }

  return defaultInfo;
}

function generateTrackingNumber(orderId: string): string {
  const prefix = 'XARA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function getDeliveryPartner(city?: string): {
  name: string;
  phone: string;
  website: string;
  trackingUrl: string;
} {
  const partners = {
    nairobi: {
      name: 'Sendy Limited',
      phone: '+254 711 083 000',
      website: 'https://sendy.co.ke',
      trackingUrl: 'https://track.sendy.co.ke',
    },
    mombasa: {
      name: 'Aramex Kenya',
      phone: '+254 732 167 000',
      website: 'https://www.aramex.com/ke',
      trackingUrl: 'https://www.aramex.com/track',
    },
    default: {
      name: 'Xarastore Delivery Network',
      phone: '+254 700 123 456',
      website: 'https://xarastore.com/delivery',
      trackingUrl: 'https://track.xarastore.com',
    },
  };

  if (!city) return partners.default;

  const cityLower = city.toLowerCase();
  if (cityLower.includes('nairobi')) return partners.nairobi;
  if (cityLower.includes('mombasa')) return partners.mombasa;
  
  return partners.default;
}

function calculateNextUpdate(status: string): string | null {
  const updateIntervals: Record<string, number> = {
    pending: 1 * 60 * 60 * 1000, // 1 hour
    processing: 12 * 60 * 60 * 1000, // 12 hours
    shipped: 6 * 60 * 60 * 1000, // 6 hours
    delivered: null,
    cancelled: null,
  };

  const interval = updateIntervals[status];
  if (!interval) return null;

  const nextUpdate = new Date(Date.now() + interval);
  return nextUpdate.toISOString();
}
