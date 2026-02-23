import { PaymentMethodId } from '@/lib/constants/payment-methods';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  webhookId?: string;
}

export class PayPalService {
  private config: PayPalConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
    };

    this.baseUrl = this.config.environment === 'sandbox'
      ? 'https://api.sandbox.paypal.com'
      : 'https://api.paypal.com';

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('PayPal client ID and secret are required');
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      return this.accessToken;
    } catch (error) {
      console.error('PayPal access token retrieval failed:', error);
      throw new Error('Payment service authentication failed');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const token = await this.getAccessToken();
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PayPal API error (${response.status}):`, errorText);
      throw new Error(`PayPal API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async createOrder(
    amount: number,
    currency: string,
    orderId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ id: string; links: Array<{ href: string; rel: string; method: string }> }> {
    try {
      const order = await this.makeRequest<{ id: string; links: any[] }>('/v2/checkout/orders', 'POST', {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: 'Xarastore',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      return {
        id: order.id,
        links: order.links,
      };
    } catch (error) {
      console.error('PayPal order creation failed:', error);
      throw new Error('Order creation failed');
    }
  }

  async captureOrder(orderId: string): Promise<{
    id: string;
    status: string;
    purchase_units: Array<{
      payments: {
        captures: Array<{
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
          final_capture: boolean;
        }>;
      };
    }>;
  }> {
    try {
      return await this.makeRequest(`/v2/checkout/orders/${orderId}/capture`, 'POST');
    } catch (error) {
      console.error('PayPal order capture failed:', error);
      throw new Error('Order capture failed');
    }
  }

  async getOrder(orderId: string): Promise<any> {
    try {
      return await this.makeRequest(`/v2/checkout/orders/${orderId}`);
    } catch (error) {
      console.error('PayPal order retrieval failed:', error);
      throw new Error('Order retrieval failed');
    }
  }

  async createPayout(
    email: string,
    amount: number,
    currency: string,
    note?: string
  ): Promise<{ batch_id: string; links: any[] }> {
    try {
      return await this.makeRequest('/v1/payments/payouts', 'POST', {
        sender_batch_header: {
          sender_batch_id: `Payout_${Date.now()}`,
          email_subject: 'Xarastore Payout',
          email_message: note || 'Payment from Xarastore',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: currency.toUpperCase(),
            },
            receiver: email,
            note: note || 'Payment from Xarastore',
          },
        ],
      });
    } catch (error) {
      console.error('PayPal payout creation failed:', error);
      throw new Error('Payout creation failed');
    }
  }

  async getPayoutStatus(batchId: string): Promise<any> {
    try {
      return await this.makeRequest(`/v1/payments/payouts/${batchId}`);
    } catch (error) {
      console.error('PayPal payout status retrieval failed:', error);
      throw new Error('Payout status retrieval failed');
    }
  }

  async createSubscription(
    planId: string,
    subscriber: {
      email: string;
      name: { given_name: string; surname: string };
    },
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ id: string; links: any[] }> {
    try {
      return await this.makeRequest('/v1/billing/subscriptions', 'POST', {
        plan_id: planId,
        subscriber,
        application_context: {
          brand_name: 'Xarastore',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });
    } catch (error) {
      console.error('PayPal subscription creation failed:', error);
      throw new Error('Subscription creation failed');
    }
  }

  async cancelSubscription(subscriptionId: string, reason: string = 'Customer request'): Promise<void> {
    try {
      await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, 'POST', {
        reason,
      });
    } catch (error) {
      console.error('PayPal subscription cancellation failed:', error);
      throw new Error('Subscription cancellation failed');
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await this.makeRequest(`/v1/billing/subscriptions/${subscriptionId}`);
    } catch (error) {
      console.error('PayPal subscription retrieval failed:', error);
      throw new Error('Subscription retrieval failed');
    }
  }

  async createWebhook(webhookUrl: string): Promise<{ id: string }> {
    try {
      return await this.makeRequest('/v1/notifications/webhooks', 'POST', {
        url: webhookUrl,
        event_types: [
          { name: 'PAYMENT.CAPTURE.COMPLETED' },
          { name: 'PAYMENT.CAPTURE.DENIED' },
          { name: 'PAYMENT.CAPTURE.REFUNDED' },
          { name: 'CHECKOUT.ORDER.APPROVED' },
          { name: 'CHECKOUT.ORDER.COMPLETED' },
          { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
          { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
          { name: 'BILLING.SUBSCRIPTION.EXPIRED' },
          { name: 'BILLING.SUBSCRIPTION.SUSPENDED' },
        ],
      });
    } catch (error) {
      console.error('PayPal webhook creation failed:', error);
      throw new Error('Webhook creation failed');
    }
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ verification_status: string }>(
        '/v1/notifications/verify-webhook-signature',
        'POST',
        {
          transmission_id: headers['paypal-transmission-id'],
          transmission_time: headers['paypal-transmission-time'],
          transmission_sig: headers['paypal-transmission-sig'],
          cert_url: headers['paypal-cert-url'],
          auth_algo: headers['paypal-auth-algo'],
          webhook_id: this.config.webhookId,
          webhook_event: JSON.parse(body),
        }
      );

      return response.verification_status === 'SUCCESS';
    } catch (error) {
      console.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  async handleWebhook(event: any): Promise<void> {
    try {
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCaptureCompleted(event.resource);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentCaptureDenied(event.resource);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentCaptureRefunded(event.resource);
          break;

        case 'CHECKOUT.ORDER.APPROVED':
          await this.handleOrderApproved(event.resource);
          break;

        case 'CHECKOUT.ORDER.COMPLETED':
          await this.handleOrderCompleted(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await this.handleSubscriptionActivated(event.resource);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await this.handleSubscriptionCancelled(event.resource);
          break;

        default:
          console.log(`Unhandled PayPal event type: ${event.event_type}`);
      }
    } catch (error) {
      console.error('PayPal webhook handling failed:', error);
      throw error;
    }
  }

  private async handlePaymentCaptureCompleted(capture: any) {
    const { custom_id } = capture;
    if (!custom_id) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment.capture.completed',
        orderId: custom_id,
        captureId: capture.id,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: 'completed',
      }),
    });
  }

  private async handlePaymentCaptureDenied(capture: any) {
    const { custom_id } = capture;
    if (!custom_id) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment.capture.denied',
        orderId: custom_id,
        captureId: capture.id,
        amount: parseFloat(capture.amount.value),
        currency: capture.amount.currency_code,
        status: 'denied',
      }),
    });
  }

  private async handlePaymentCaptureRefunded(refund: any) {
    const { custom_id } = refund;
    if (!custom_id) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'payment.capture.refunded',
        orderId: custom_id,
        refundId: refund.id,
        amount: parseFloat(refund.amount.value),
        currency: refund.amount.currency_code,
        status: 'refunded',
      }),
    });
  }

  private async handleOrderApproved(order: any) {
    const { custom_id } = order;
    if (!custom_id) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'order.approved',
        orderId: custom_id,
        paypalOrderId: order.id,
        status: 'approved',
      }),
    });
  }

  private async handleOrderCompleted(order: any) {
    const { custom_id } = order;
    if (!custom_id) return;

    await fetch('/api/orders/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'order.completed',
        orderId: custom_id,
        paypalOrderId: order.id,
        status: 'completed',
      }),
    });
  }

  private async handleSubscriptionActivated(subscription: any) {
    const { custom_id } = subscription;
    if (!custom_id) return;

    await fetch('/api/subscriptions/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'subscription.activated',
        userId: custom_id,
        subscriptionId: subscription.id,
        status: 'active',
      }),
    });
  }

  private async handleSubscriptionCancelled(subscription: any) {
    const { custom_id } = subscription;
    if (!custom_id) return;

    await fetch('/api/subscriptions/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.PAYPAL_WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        type: 'subscription.cancelled',
        userId: custom_id,
        subscriptionId: subscription.id,
        status: 'cancelled',
      }),
    });
  }

  formatPaymentDetails(payment: any): {
    id: string;
    status: string;
    amount: number;
    currency: string;
    payerEmail: string;
    type: PaymentMethodId;
  } {
    return {
      id: payment.id,
      status: payment.status,
      amount: parseFloat(payment.amount.value),
      currency: payment.amount.currency_code,
      payerEmail: payment.payer?.email_address || '',
      type: 'paypal',
    };
  }
}

// Singleton instance
let paypalInstance: PayPalService | null = null;

export function getPayPalService(): PayPalService {
  if (!paypalInstance) {
    paypalInstance = new PayPalService();
  }
  return paypalInstance;
}
