import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';

const stockAlertSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().min(1),
  email: z.string().email(),
  userId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = stockAlertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, productName, email, userId } = validation.data;

    // Check if product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already subscribed
    const { data: existing, error: existingError } = await supabase
      .from('stock_notifications')
      .select('id')
      .eq('product_id', productId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Already subscribed to notifications for this product' },
        { status: 409 }
      );
    }

    // Create notification record
    const { data: notification, error: insertError } = await supabase
      .from('stock_notifications')
      .insert({
        product_id: productId,
        user_id: userId,
        email: email,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Send confirmation email (in production, use email service)
    await sendStockAlertConfirmation(email, productName);

    // Log the action
    await supabase.from('notification_logs').insert({
      notification_id: notification.id,
      type: 'stock_alert_subscribe',
      metadata: {
        product_id: productId,
        email: email,
        user_id: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Stock alert registered successfully',
      notificationId: notification.id,
    });
  } catch (error: any) {
    console.error('Stock alert registration error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to register stock alert',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const productId = searchParams.get('productId');

    if (!email || !productId) {
      return NextResponse.json(
        { error: 'Email and productId are required' },
        { status: 400 }
      );
    }

    const { data: notifications, error } = await supabase
      .from('stock_notifications')
      .select('*')
      .eq('email', email)
      .eq('product_id', productId)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({
      subscribed: notifications && notifications.length > 0,
      notifications,
    });
  } catch (error: any) {
    console.error('Error checking stock alerts:', error);
    
    return NextResponse.json(
      { error: 'Failed to check stock alerts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('stock_notifications')
      .update({ status: 'cancelled' })
      .eq('id', notificationId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Stock alert cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling stock alert:', error);
    
    return NextResponse.json(
      { error: 'Failed to cancel stock alert' },
      { status: 500 }
    );
  }
}

async function sendStockAlertConfirmation(email: string, productName: string) {
  // In production, integrate with email service
  console.log(`Stock alert confirmation email sent to ${email} for ${productName}`);
  
  // Example with Resend (uncomment in production):
  /*
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'Xarastore <notifications@xarastore.com>',
    to: email,
    subject: 'Stock Alert Confirmation',
    html: `
      <h1>You're in the know!</h1>
      <p>We'll notify you when <strong>${productName}</strong> is back in stock.</p>
      <p>Stay tuned for updates from Xarastore.</p>
    `,
  });
  */
}
