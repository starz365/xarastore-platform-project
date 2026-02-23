import Stripe from 'stripe';
import { PaymentMethodId } from '@/lib/constants/payment-methods';

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, any> = {}
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw new Error('Payment processing failed');
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Stripe payment intent retrieval failed:', error);
      throw new Error('Payment retrieval failed');
    }
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/confirmation`,
      });
    } catch (error) {
      console.error('Stripe payment intent confirmation failed:', error);
      throw new Error('Payment confirmation failed');
    }
  }

  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Stripe payment intent cancellation failed:', error);
      throw new Error('Payment cancellation failed');
    }
  }

  async createCustomer(
    email: string,
    name?: string,
    metadata: Record<string, any> = {}
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email,
        name,
        metadata,
      });
    } catch (error) {
      console.error('Stripe customer creation failed:', error);
      throw new Error('Customer creation failed');
    }
  }

  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      console.error('Stripe customer retrieval failed:', error);
      throw new Error('Customer retrieval failed');
    }
  }

  async createSetupIntent(
    customerId: string,
    metadata: Record<string, any> = {}
  ): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.create({
        customer: customerId,
        metadata,
        usage: 'off_session',
      });
    } catch (error) {
      console.error('Stripe setup intent creation failed:', error);
      throw new Error('Payment method setup failed');
    }
  }

  async listPaymentMethods(
    customerId: string,
    type: 'card' | 'sepa_debit' = 'card'
  ): Promise<Stripe.ApiList<Stripe.PaymentMethod>> {
    try {
      return await this.stripe.paymentMethods.list({
        customer: customerId,
        type,
      });
    } catch (error) {
      console.error('Stripe payment methods list failed:', error);
      throw new Error('Payment methods retrieval failed');
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata: Record<string, any> = {}
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
    } catch (error) {
      console.error('Stripe subscription creation failed:', error);
      throw new Error('Subscription creation failed');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Stripe subscription cancellation failed:', error);
      throw new Error('Subscription cancellation failed');
    }
  }

  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason: Stripe.RefundCreateParams.Reason = 'requested_by_customer'
  ): Promise<Stripe.Refund> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        params.amount = Math.round(amount * 100);
      }

      return await this.stripe.refunds.create(params);
    } catch (error) {
      console.error('Stripe refund creation failed:', error);
      throw new Error('Refund creation failed');
    }
  }

  async verifyWebhook(
    payload: string,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      throw new Error('Webhook verification failed');
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Stripe webhook handling failed:', error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, userId } = paymentIntent.metadata;
    
    if (!orderId) return;

    // Update order payment status in database
    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment_intent.succeeded',
        orderId,
        userId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'paid',
      }),
    });
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, userId } = paymentIntent.metadata;
    
    if (!orderId) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment_intent.failed',
        orderId,
        userId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'failed',
        error: paymentIntent.last_payment_error?.message,
      }),
    });
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    const { orderId, userId } = paymentIntent.metadata;
    
    if (!orderId) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment_intent.canceled',
        orderId,
        userId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'canceled',
      }),
    });
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    const { orderId, userId } = charge.metadata;
    
    if (!orderId) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'charge.refunded',
        orderId,
        userId,
        chargeId: charge.id,
        paymentIntentId: charge.payment_intent as string,
        amount: charge.amount_refunded / 100,
        currency: charge.currency,
        status: 'refunded',
      }),
    });
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const { userId } = subscription.metadata;
    
    if (!userId) return;

    await fetch('/api/subscriptions/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'subscription.created',
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const { userId } = subscription.metadata;
    
    if (!userId) return;

    await fetch('/api/subscriptions/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'subscription.updated',
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      }),
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const { userId } = subscription.metadata;
    
    if (!userId) return;

    await fetch('/api/subscriptions/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'subscription.deleted',
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
      }),
    });
  }

  formatPaymentMethod(paymentMethod: Stripe.PaymentMethod): {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    type: PaymentMethodId;
  } {
    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      throw new Error('Unsupported payment method type');
    }

    return {
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
      type: 'card',
    };
  }
}

// Singleton instance
let stripeInstance: StripeService | null = null;

export function getStripeService(): StripeService {
  if (!stripeInstance) {
    stripeInstance = new StripeService();
  }
  return stripeInstance;
}
