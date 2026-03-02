import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const preorderSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(10),
  estimatedDelivery: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = preorderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, variantId, quantity, estimatedDelivery } = validation.data;

    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required for preorder' },
        { status: 401 }
      );
    }

    // Check if product exists and allows preorder
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, allow_preorder, estimated_restock_date')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.allow_preorder) {
      return NextResponse.json(
        { error: 'This product does not allow preorders' },
        { status: 400 }
      );
    }

    // Generate unique order number
    const orderNumber = `PRE-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-6)}`;

    // Create preorder
    const { data: preorder, error: insertError } = await supabase
      .from('preorders')
      .insert({
        order_number: orderNumber,
        user_id: session.user.id,
        product_id: productId,
        variant_id: variantId,
        quantity: quantity,
        status: 'pending',
        estimated_delivery: estimatedDelivery || product.estimated_restock_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Send confirmation email
    await sendPreorderConfirmation(session.user.email!, product.name, orderNumber, quantity);

    // Log analytics
    await supabase.from('analytics_events').insert({
      user_id: session.user.id,
      event_type: 'preorder_placed',
      event_data: {
        product_id: productId,
        order_number: orderNumber,
        quantity: quantity,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preorder placed successfully',
      orderNumber: orderNumber,
      estimatedDelivery: preorder.estimated_delivery,
      preorderId: preorder.id,
    });
  } catch (error: any) {
    console.error('Preorder error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to place preorder',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: preorders, error } = await supabase
      .from('preorders')
      .select(`
        *,
        product:products (
          id,
          name,
          images,
          slug
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      preorders,
    });
  } catch (error: any) {
    console.error('Error fetching preorders:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch preorders' },
      { status: 500 }
    );
  }
}

async function sendPreorderConfirmation(email: string, productName: string, orderNumber: string, quantity: number) {
  console.log(`Preorder confirmation email sent to ${email} for ${productName} (Order: ${orderNumber})`);
  
  // In production, implement actual email sending
}
