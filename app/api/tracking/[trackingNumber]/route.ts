import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const trackingNumber = params.trackingNumber;
    
    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Get tracking information
    const { data: tracking, error: trackingError } = await supabase
      .from('order_tracking')
      .select(`
        *,
        steps:order_tracking_steps(*)
      `)
      .eq('tracking_number', trackingNumber)
      .single();

    if (trackingError) {
      return NextResponse.json(
        { error: 'Tracking not found' },
        { status: 404 }
      );
    }

    // Get order details (limited info for privacy)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, shipping_address')
      .eq('id', tracking.order_id)
      .single();

    if (orderError) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Format response
    const response = {
      tracking: {
        carrier: tracking.carrier,
        tracking_number: tracking.tracking_number,
        status: tracking.status,
        estimated_delivery: tracking.estimated_delivery,
        steps: tracking.steps?.map((step: any) => ({
          status: step.status,
          location: step.location,
          description: step.description,
          timestamp: step.timestamp,
        })).sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ) || [],
      },
      order: {
        order_number: order.order_number,
        status: order.status,
        shipping_address: {
          city: order.shipping_address?.city,
          state: order.shipping_address?.state,
          country: order.shipping_address?.country,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Tracking API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, location, description } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update tracking using Supabase function
    const { data, error } = await supabase.rpc('update_tracking_status', {
      p_tracking_number: params.trackingNumber,
      p_status: status,
      p_location: location,
      p_description: description,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Tracking update error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to update tracking',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
