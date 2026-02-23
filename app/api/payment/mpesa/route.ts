xarastore/app/api/payment/mpesa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMpesaService } from '@/services/payment/providers/mpesa';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, amount, orderId, accountReference } = body;

    // Validate required fields
    if (!phoneNumber || !amount || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify order amount matches
    if (Math.abs(order.total - amount) > 1) {
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Initiate M-Pesa payment
    const mpesaService = getMpesaService();
    const result = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference || orderId
    );

    // Save payment attempt
    await supabase.from('payment_attempts').insert({
      order_id: orderId,
      payment_method: 'mpesa',
      amount,
      phone_number: phoneNumber,
      checkout_request_id: result.checkoutRequestID,
      merchant_request_id: result.merchantRequestID,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: result.customerMessage,
      checkoutRequestID: result.checkoutRequestID,
      merchantRequestID: result.merchantRequestID,
    });
  } catch (error: any) {
    console.error('M-Pesa payment error:', error);
    
    return NextResponse.json(
      {
        error: 'Payment initiation failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutRequestID = searchParams.get('checkoutRequestID');

    if (!checkoutRequestID) {
      return NextResponse.json(
        { error: 'Missing checkoutRequestID' },
        { status: 400 }
      );
    }

    // Query transaction status
    const mpesaService = getMpesaService();
    const result = await mpesaService.queryTransactionStatus(checkoutRequestID);

    if (result.success) {
      // Update payment status
      await supabase
        .from('payment_attempts')
        .update({ status: 'completed' })
        .eq('checkout_request_id', checkoutRequestID);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('M-Pesa query error:', error);
    
    return NextResponse.json(
      {
        error: 'Transaction query failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
