xarastore/app/api/payment/mpesa/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMpesaService } from '@/services/payment/providers/mpesa';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate callback structure
    if (!body.Body?.stkCallback) {
      return NextResponse.json(
        { error: 'Invalid callback structure' },
        { status: 400 }
      );
    }

    // Process M-Pesa callback
    const mpesaService = getMpesaService();
    const result = await mpesaService.processCallback(body);

    if (result.success) {
      const { transaction } = result;
      
      // Find the payment attempt
      const { data: paymentAttempt } = await supabase
        .from('payment_attempts')
        .select('order_id')
        .eq('checkout_request_id', transaction.checkoutRequestID)
        .single();

      if (paymentAttempt) {
        // Update order payment status
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            mpesa_receipt: transaction.mpesaReceiptNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentAttempt.order_id);

        // Update payment attempt
        await supabase
          .from('payment_attempts')
          .update({
            status: 'completed',
            mpesa_receipt: transaction.mpesaReceiptNumber,
            phone_number: transaction.phoneNumber,
            transaction_date: transaction.transactionDate,
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_request_id', transaction.checkoutRequestID);

        // Create transaction record
        await supabase.from('transactions').insert({
          order_id: paymentAttempt.order_id,
          type: 'payment',
          amount: transaction.amount,
          method: 'mpesa',
          reference: transaction.mpesaReceiptNumber,
          status: 'completed',
          metadata: transaction,
        });

        // Send order confirmation email (in production)
        // await sendOrderConfirmation(paymentAttempt.order_id);
      }
    }

    // Always return success to M-Pesa
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success',
    });
  } catch (error: any) {
    console.error('M-Pesa callback error:', error);
    
    // Still return success to M-Pesa to prevent retries
    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: 'Success',
    });
  }
}
