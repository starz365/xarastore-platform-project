import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    
    // Log failed webhook attempt
    await supabase.from('webhook_errors').insert({
      source: 'stripe',
      error: err.message,
      payload: JSON.parse(await request.text()),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the webhook
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    
    // Log webhook processing error
    await supabase.from('webhook_errors').insert({
      source: 'stripe',
      event_type: event.type,
      error: error.message,
      event_id: event.id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { metadata, amount, currency, customer, id } = paymentIntent;
    const orderId = metadata?.order_id;
    const userId = metadata?.user_id;

    if (!orderId) {
      console.error('Payment intent missing order_id:', id);
      return;
    }

    // Update order payment status
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: id,
        stripe_customer_id: typeof customer === 'string' ? customer : customer?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Create payment record
    await supabase.from('payments').insert({
      order_id: orderId,
      user_id: userId,
      payment_method: 'stripe',
      amount: amount / 100, // Convert from cents
      currency: currency.toUpperCase(),
      status: 'completed',
      stripe_payment_intent_id: id,
      transaction_id: id,
      metadata: paymentIntent,
      created_at: new Date().toISOString(),
    });

    // Send order confirmation email
    await sendOrderConfirmation(orderId);

    console.log(`Payment succeeded for order ${orderId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const { metadata, id, last_payment_error } = paymentIntent;
    const orderId = metadata?.order_id;

    if (!orderId) {
      console.error('Payment intent missing order_id:', id);
      return;
    }

    // Update order payment status
    await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        stripe_payment_intent_id: id,
        payment_error: last_payment_error?.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Create failed payment record
    await supabase.from('payment_attempts').insert({
      order_id: orderId,
      payment_method: 'stripe',
      status: 'failed',
      stripe_payment_intent_id: id,
      error_message: last_payment_error?.message,
      metadata: paymentIntent,
      created_at: new Date().toISOString(),
    });

    // Send payment failure notification
    await sendPaymentFailureNotification(orderId, last_payment_error?.message);

    console.log(`Payment failed for order ${orderId}:`, last_payment_error?.message);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  try {
    const { id, payment_intent, billing_details, amount, currency } = charge;

    // Log charge success
    await supabase.from('stripe_charges').insert({
      charge_id: id,
      payment_intent_id: typeof payment_intent === 'string' ? payment_intent : payment_intent?.id,
      amount: amount / 100,
      currency: currency.toUpperCase(),
      billing_email: billing_details.email,
      billing_name: billing_details.name,
      status: 'succeeded',
      metadata: charge,
      created_at: new Date().toISOString(),
    });

    console.log(`Charge succeeded: ${id}`);
  } catch (error) {
    console.error('Error handling charge succeeded:', error);
    throw error;
  }
}

async function handleChargeFailed(charge: Stripe.Charge) {
  try {
    const { id, failure_message, payment_intent } = charge;

    // Log charge failure
    await supabase.from('stripe_charges').insert({
      charge_id: id,
      payment_intent_id: typeof payment_intent === 'string' ? payment_intent : payment_intent?.id,
      status: 'failed',
      failure_message: failure_message,
      metadata: charge,
      created_at: new Date().toISOString(),
    });

    console.log(`Charge failed: ${id} - ${failure_message}`);
  } catch (error) {
    console.error('Error handling charge failed:', error);
    throw error;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const { id, metadata, customer, payment_intent, subscription } = session;
    const userId = metadata?.user_id;
    const orderId = metadata?.order_id;

    // Log completed checkout session
    await supabase.from('stripe_checkout_sessions').insert({
      session_id: id,
      user_id: userId,
      order_id: orderId,
      customer_id: typeof customer === 'string' ? customer : customer?.id,
      payment_intent_id: typeof payment_intent === 'string' ? payment_intent : payment_intent?.id,
      subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
      status: 'completed',
      metadata: session,
      created_at: new Date().toISOString(),
    });

    // If this is for a subscription, update user subscription status
    if (subscription && userId) {
      await supabase
        .from('user_subscriptions')
        .update({
          stripe_subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    console.log(`Checkout session completed: ${id}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const { id, customer, status, metadata } = subscription;
    const userId = metadata?.user_id;

    if (!userId) {
      console.error('Subscription missing user_id:', id);
      return;
    }

    // Create or update user subscription
    await supabase.from('user_subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: id,
      stripe_customer_id: typeof customer === 'string' ? customer : customer?.id,
      status: status,
      plan_id: subscription.items.data[0]?.price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

    console.log(`Subscription created for user ${userId}: ${id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const { id, status, metadata } = subscription;
    const userId = metadata?.user_id;

    if (!userId) {
      console.error('Subscription missing user_id:', id);
      return;
    }

    // Update user subscription
    await supabase
      .from('user_subscriptions')
      .update({
        status: status,
        plan_id: subscription.items.data[0]?.price.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: subscription,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', id);

    // If subscription was canceled, log the event
    if (status === 'canceled' || subscription.cancel_at_period_end) {
      await supabase.from('subscription_events').insert({
        user_id: userId,
        subscription_id: id,
        event_type: status === 'canceled' ? 'cancelled' : 'cancel_at_period_end_set',
        metadata: subscription,
        created_at: new Date().toISOString(),
      });
    }

    console.log(`Subscription updated for user ${userId}: ${id} - ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { id, metadata } = subscription;
    const userId = metadata?.user_id;

    if (!userId) {
      console.error('Subscription missing user_id:', id);
      return;
    }

    // Update user subscription status
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', id);

    // Log subscription cancellation
    await supabase.from('subscription_events').insert({
      user_id: userId,
      subscription_id: id,
      event_type: 'cancelled',
      metadata: subscription,
      created_at: new Date().toISOString(),
    });

    console.log(`Subscription deleted for user ${userId}: ${id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const { id, subscription, customer, amount_paid, currency } = invoice;

    // Log successful invoice payment
    await supabase.from('stripe_invoices').insert({
      invoice_id: id,
      subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
      customer_id: typeof customer === 'string' ? customer : customer?.id,
      amount_paid: amount_paid / 100,
      currency: currency.toUpperCase(),
      status: 'paid',
      metadata: invoice,
      created_at: new Date().toISOString(),
    });

    console.log(`Invoice payment succeeded: ${id}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const { id, subscription, customer, attempt_count } = invoice;

    // Log failed invoice payment
    await supabase.from('stripe_invoices').insert({
      invoice_id: id,
      subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
      customer_id: typeof customer === 'string' ? customer : customer?.id,
      status: 'failed',
      attempt_count: attempt_count,
      metadata: invoice,
      created_at: new Date().toISOString(),
    });

    // Send payment failure notification for subscription
    if (subscription) {
      await sendSubscriptionPaymentFailureNotification(
        typeof subscription === 'string' ? subscription : subscription.id
      );
    }

    console.log(`Invoice payment failed: ${id} (attempt ${attempt_count})`);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

async function sendOrderConfirmation(orderId: string) {
  // Implementation for sending order confirmation email
  console.log(`Sending order confirmation for ${orderId}`);
}

async function sendPaymentFailureNotification(orderId: string, errorMessage?: string) {
  // Implementation for sending payment failure notification
  console.log(`Sending payment failure notification for ${orderId}: ${errorMessage}`);
}

async function sendSubscriptionPaymentFailureNotification(subscriptionId: string) {
  // Implementation for sending subscription payment failure notification
  console.log(`Sending subscription payment failure notification for ${subscriptionId}`);
}
