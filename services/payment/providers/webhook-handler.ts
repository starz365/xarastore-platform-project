import { getStripeService } from './stripe';
import { getPayPalService } from './paypal';
import { getMpesaService } from './mpesa';
import { supabase } from '@/lib/supabase/client';
import { webhookEvents } from '@/lib/constants/api-endpoints';

export class WebhookHandler {
  private static instance: WebhookHandler;

  private constructor() {}

  static getInstance(): WebhookHandler {
    if (!WebhookHandler.instance) {
      WebhookHandler.instance = new WebhookHandler();
    }
    return WebhookHandler.instance;
  }

  async handleStripeWebhook(
    payload: string,
    signature: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const stripeService = getStripeService();
      const event = await stripeService.verifyWebhook(payload, signature);
      
      await stripeService.handleWebhook(event);
      
      await this.logWebhook('stripe', 'success', {
        eventId: event.id,
        type: event.type,
        payload: event.data.object,
      });

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Stripe webhook handling failed:', error);
      
      await this.logWebhook('stripe', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: payload.substring(0, 1000), // Log first 1000 chars
      });

      return { success: false, message: 'Webhook processing failed' };
    }
  }

  async handlePayPalWebhook(
    headers: Record<string, string>,
    body: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const paypalService = getPayPalService();
      const isValid = await paypalService.verifyWebhook(headers, body);
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(body);
      await paypalService.handleWebhook(event);
      
      await this.logWebhook('paypal', 'success', {
        eventId: event.id,
        type: event.event_type,
        payload: event.resource,
      });

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('PayPal webhook handling failed:', error);
      
      await this.logWebhook('paypal', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        headers,
        body: body.substring(0, 1000),
      });

      return { success: false, message: 'Webhook processing failed' };
    }
  }

  async handleMpesaWebhook(
    data: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const mpesaService = getMpesaService();
      const result = await mpesaService.processCallback(data);
      
      if (result.success) {
        await this.logWebhook('mpesa', 'success', {
          transaction: result.transaction,
          payload: data,
        });

        return { success: true, message: 'Payment processed successfully' };
      } else {
        await this.logWebhook('mpesa', 'failed', {
          transaction: result.transaction,
          payload: data,
        });

        return { success: false, message: result.transaction.resultDesc };
      }
    } catch (error) {
      console.error('M-Pesa webhook handling failed:', error);
      
      await this.logWebhook('mpesa', 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: data,
      });

      return { success: false, message: 'Webhook processing failed' };
    }
  }

  async handleOrderWebhook(
    event: keyof typeof webhookEvents.order,
    data: any
  ): Promise<void> {
    try {
      const { orderId, ...payload } = data;
      
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      // Update order in database
      switch (event) {
        case 'order.created':
          await this.handleOrderCreated(orderId, payload);
          break;
        
        case 'order.updated':
          await this.handleOrderUpdated(orderId, payload);
          break;
        
        case 'order.cancelled':
          await this.handleOrderCancelled(orderId, payload);
          break;
        
        case 'order.completed':
          await this.handleOrderCompleted(orderId, payload);
          break;
        
        case 'order.shipped':
          await this.handleOrderShipped(orderId, payload);
          break;
        
        case 'order.delivered':
          await this.handleOrderDelivered(orderId, payload);
          break;
        
        default:
          console.warn(`Unhandled order event: ${event}`);
      }

      await this.logEvent('order', event, {
        orderId,
        ...payload,
      });

    } catch (error) {
      console.error(`Order webhook handling failed for event ${event}:`, error);
      throw error;
    }
  }

  async handlePaymentWebhook(
    event: keyof typeof webhookEvents.payment,
    data: any
  ): Promise<void> {
    try {
      const { paymentId, orderId, ...payload } = data;
      
      if (!paymentId || !orderId) {
        throw new Error('Payment ID and Order ID are required');
      }

      // Update payment in database
      switch (event) {
        case 'payment.created':
          await this.handlePaymentCreated(paymentId, orderId, payload);
          break;
        
        case 'payment.succeeded':
          await this.handlePaymentSucceeded(paymentId, orderId, payload);
          break;
        
        case 'payment.failed':
          await this.handlePaymentFailed(paymentId, orderId, payload);
          break;
        
        case 'payment.refunded':
          await this.handlePaymentRefunded(paymentId, orderId, payload);
          break;
        
        default:
          console.warn(`Unhandled payment event: ${event}`);
      }

      await this.logEvent('payment', event, {
        paymentId,
        orderId,
        ...payload,
      });

    } catch (error) {
      console.error(`Payment webhook handling failed for event ${event}:`, error);
      throw error;
    }
  }

  async handleUserWebhook(
    event: keyof typeof webhookEvents.user,
    data: any
  ): Promise<void> {
    try {
      const { userId, ...payload } = data;
      
      if (!userId) {
        throw new Error('User ID is required');
      }

      switch (event) {
        case 'user.created':
          await this.handleUserCreated(userId, payload);
          break;
        
        case 'user.updated':
          await this.handleUserUpdated(userId, payload);
          break;
        
        case 'user.deleted':
          await this.handleUserDeleted(userId, payload);
          break;
        
        default:
          console.warn(`Unhandled user event: ${event}`);
      }

      await this.logEvent('user', event, {
        userId,
        ...payload,
      });

    } catch (error) {
      console.error(`User webhook handling failed for event ${event}:`, error);
      throw error;
    }
  }

  async handleProductWebhook(
    event: keyof typeof webhookEvents.product,
    data: any
  ): Promise<void> {
    try {
      const { productId, ...payload } = data;
      
      if (!productId) {
        throw new Error('Product ID is required');
      }

      switch (event) {
        case 'product.created':
          await this.handleProductCreated(productId, payload);
          break;
        
        case 'product.updated':
          await this.handleProductUpdated(productId, payload);
          break;
        
        case 'product.deleted':
          await this.handleProductDeleted(productId, payload);
          break;
        
        case 'product.low_stock':
          await this.handleProductLowStock(productId, payload);
          break;
        
        case 'product.out_of_stock':
          await this.handleProductOutOfStock(productId, payload);
          break;
        
        default:
          console.warn(`Unhandled product event: ${event}`);
      }

      await this.logEvent('product', event, {
        productId,
        ...payload,
      });

    } catch (error) {
      console.error(`Product webhook handling failed for event ${event}:`, error);
      throw error;
    }
  }

  private async handleOrderCreated(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handleOrderUpdated(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handleOrderCancelled(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handleOrderCompleted(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handleOrderShipped(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        tracking_number: data.trackingNumber,
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handleOrderDelivered(orderId: string, data: any) {
    await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', orderId);
  }

  private async handlePaymentCreated(paymentId: string, orderId: string, data: any) {
    await supabase
      .from('payments')
      .update({
        status: 'pending',
        order_id: orderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', paymentId);
  }

  private async handlePaymentSucceeded(paymentId: string, orderId: string, data: any) {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', paymentId);

    // Update order payment status
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }

  private async handlePaymentFailed(paymentId: string, orderId: string, data: any) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: data.error,
        ...data,
      })
      .eq('id', paymentId);
  }

  private async handlePaymentRefunded(paymentId: string, orderId: string, data: any) {
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', paymentId);
  }

  private async handleUserCreated(userId: string, data: any) {
    await supabase
      .from('users')
      .update({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', userId);
  }

  private async handleUserUpdated(userId: string, data: any) {
    await supabase
      .from('users')
      .update({
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', userId);
  }

  private async handleUserDeleted(userId: string, data: any) {
    await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', userId);
  }

  private async handleProductCreated(productId: string, data: any) {
    await supabase
      .from('products')
      .update({
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', productId);
  }

  private async handleProductUpdated(productId: string, data: any) {
    await supabase
      .from('products')
      .update({
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', productId);
  }

  private async handleProductDeleted(productId: string, data: any) {
    await supabase
      .from('products')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: false,
        ...data,
      })
      .eq('id', productId);
  }

  private async handleProductLowStock(productId: string, data: any) {
    await supabase
      .from('products')
      .update({
        low_stock_notified: true,
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', productId);

    // Send notification to admin
    await this.sendNotification('product_low_stock', {
      productId,
      stock: data.stock,
      threshold: data.threshold,
    });
  }

  private async handleProductOutOfStock(productId: string, data: any) {
    await supabase
      .from('products')
      .update({
        out_of_stock_notified: true,
        updated_at: new Date().toISOString(),
        ...data,
      })
      .eq('id', productId);

    // Send notification to admin
    await this.sendNotification('product_out_of_stock', {
      productId,
    });
  }

  private async logWebhook(
    provider: string,
    status: 'success' | 'failed' | 'error',
    data: any
  ): Promise<void> {
    try {
      await supabase.from('webhook_logs').insert({
        provider,
        status,
        data,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log webhook:', error);
    }
  }

  private async logEvent(
    type: string,
    event: string,
    data: any
  ): Promise<void> {
    try {
      await supabase.from('event_logs').insert({
        type,
        event,
        data,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  private async sendNotification(
    type: string,
    data: any
  ): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        type,
        data,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

export const webhookHandler = WebhookHandler.getInstance();
