import { supabase } from '@/lib/supabase/client';
import crypto from 'crypto';

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  signature?: string;
}

interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  retryCount: number;
  lastDelivery?: string;
  lastError?: string;
}

interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;
  url: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  statusCode?: number;
  response?: string;
  retryCount: number;
  deliveredAt?: string;
  createdAt: string;
}

export class WebhookHandler {
  private static instance: WebhookHandler;
  private isProcessing = false;
  private readonly batchSize = 50;
  private readonly retryLimit = 3;
  private readonly retryDelays = [1000, 5000, 30000]; // 1s, 5s, 30s
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startProcessing();
  }

  static getInstance(): WebhookHandler {
    if (!WebhookHandler.instance) {
      WebhookHandler.instance = new WebhookHandler();
    }
    return WebhookHandler.instance;
  }

  private startProcessing() {
    // Process webhooks every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processWebhooks();
    }, 10000);

    // Also process on startup
    setTimeout(() => this.processWebhooks(), 5000);
  }

  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  async trigger(eventType: string, data: any): Promise<string> {
    try {
      // Create webhook event
      const { data: event, error } = await supabase
        .from('webhook_events')
        .insert({
          type: eventType,
          data,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // Find subscriptions for this event type
      const { data: subscriptions } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('enabled', true)
        .contains('events', [eventType]);

      if (subscriptions && subscriptions.length > 0) {
        // Create deliveries for each subscription
        const deliveries = subscriptions.map(subscription => ({
          subscription_id: subscription.id,
          event_id: event.id,
          url: subscription.url,
          payload: this.buildPayload(eventType, data, subscription),
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        await supabase
          .from('webhook_deliveries')
          .insert(deliveries);
      }

      // Trigger immediate processing
      setTimeout(() => this.processWebhooks(), 100);

      return event.id;
    } catch (error) {
      console.error('Failed to trigger webhook:', error);
      throw error;
    }
  }

  private buildPayload(eventType: string, data: any, subscription: WebhookSubscription): any {
    const payload = {
      id: crypto.randomUUID(),
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      api_version: '2023-01-01',
    };

    // Add signature if secret is provided
    if (subscription.secret) {
      const signature = this.generateSignature(payload, subscription.secret);
      payload.signature = signature;
    }

    return payload;
  }

  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  async verifySignature(payload: any, signature: string, secret: string): Promise<boolean> {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private async processWebhooks() {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Get pending deliveries
      const { data: pendingDeliveries, error } = await supabase
        .from('webhook_deliveries')
        .select('*, subscription:webhook_subscriptions(*)')
        .eq('status', 'pending')
        .lte('retry_count', this.retryLimit)
        .order('created_at', { ascending: true })
        .limit(this.batchSize);

      if (error) throw error;

      if (!pendingDeliveries || pendingDeliveries.length === 0) {
        return;
      }

      // Mark deliveries as processing
      const deliveryIds = pendingDeliveries.map(d => d.id);
      await this.updateDeliveryStatus(deliveryIds, 'processing');

      // Process deliveries in parallel with concurrency limit
      const concurrencyLimit = 10;
      const batches = [];
      
      for (let i = 0; i < pendingDeliveries.length; i += concurrencyLimit) {
        const batch = pendingDeliveries.slice(i, i + concurrencyLimit);
        batches.push(batch);
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(delivery => this.processDelivery(delivery))
        );
      }

    } catch (error) {
      console.error('Error processing webhooks:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processDelivery(delivery: any) {
    try {
      const response = await fetch(delivery.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Xarastore-Webhooks/1.0',
          'X-Webhook-Id': delivery.id,
          'X-Webhook-Event': delivery.event_type,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'X-Webhook-Signature': delivery.payload.signature || '',
        },
        body: JSON.stringify(delivery.payload),
        timeout: 10000, // 10 second timeout
      });

      const responseText = await response.text();

      if (response.ok) {
        await this.updateDeliveryStatus([delivery.id], 'delivered', {
          status_code: response.status,
          response: responseText.substring(0, 1000),
          delivered_at: new Date().toISOString(),
        });

        // Update subscription last delivery
        await supabase
          .from('webhook_subscriptions')
          .update({
            last_delivery: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', delivery.subscription_id);
      } else {
        await this.handleFailedDelivery(delivery, {
          statusCode: response.status,
          response: responseText.substring(0, 1000),
        });
      }

    } catch (error: any) {
      await this.handleFailedDelivery(delivery, {
        error: error.message,
      });
    }
  }

  private async handleFailedDelivery(delivery: any, errorInfo: any) {
    const retryCount = delivery.retry_count || 0;

    if (retryCount < this.retryLimit) {
      // Schedule retry
      const retryDelay = this.retryDelays[retryCount] || 60000; // Default 1 minute
      const retryAt = new Date(Date.now() + retryDelay);

      await supabase
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          retry_count: retryCount + 1,
          scheduled_for: retryAt.toISOString(),
          last_error: JSON.stringify(errorInfo).substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      // Update subscription last error
      await supabase
        .from('webhook_subscriptions')
        .update({
          last_error: JSON.stringify(errorInfo).substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', delivery.subscription_id);
    } else {
      // Mark as failed after retries exhausted
      await this.updateDeliveryStatus([delivery.id], 'failed', {
        last_error: JSON.stringify(errorInfo).substring(0, 500),
      });

      // Disable subscription if too many failures
      const { data: subscription } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('id', delivery.subscription_id)
        .single();

      if (subscription) {
        const failedDeliveries = await this.getSubscriptionFailures(subscription.id, 24);
        
        if (failedDeliveries >= 10) {
          await supabase
            .from('webhook_subscriptions')
            .update({
              enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', subscription.id);
        }
      }
    }
  }

  private async getSubscriptionFailures(subscriptionId: string, hours: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const { count, error } = await supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'failed')
      .gte('created_at', cutoffDate.toISOString());

    if (error) throw error;

    return count || 0;
  }

  private async updateDeliveryStatus(ids: string[], status: WebhookDelivery['status'], additionalData: any = {}) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData,
      };

      const { error } = await supabase
        .from('webhook_deliveries')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update delivery status:', error);
    }
  }

  async createSubscription(
    name: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<string> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL');
      }

      // Validate events
      const validEvents = await this.getValidEvents();
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
      }

      // Generate secret if not provided
      const subscriptionSecret = secret || crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .insert({
          name,
          url,
          events,
          secret: subscriptionSecret,
          enabled: true,
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: {
      name?: string;
      url?: string;
      events?: string[];
      secret?: string;
      enabled?: boolean;
    }
  ): Promise<boolean> {
    try {
      if (updates.url && !this.isValidUrl(updates.url)) {
        throw new Error('Invalid URL');
      }

      if (updates.events) {
        const validEvents = await this.getValidEvents();
        const invalidEvents = updates.events.filter(event => !validEvents.includes(event));
        
        if (invalidEvents.length > 0) {
          throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
        ...updates,
      };

      const { error } = await supabase
        .from('webhook_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }

  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string): Promise<WebhookSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  async listSubscriptions(
    enabled?: boolean,
    limit: number = 100,
    offset: number = 0
  ): Promise<WebhookSubscription[]> {
    try {
      let query = supabase
        .from('webhook_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (enabled !== undefined) {
        query = query.eq('enabled', enabled);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to list subscriptions:', error);
      return [];
    }
  }

  async getValidEvents(): Promise<string[]> {
    // Define all valid webhook events
    return [
      // Order events
      'order.created',
      'order.updated',
      'order.cancelled',
      'order.completed',
      'order.refunded',
      
      // Payment events
      'payment.created',
      'payment.succeeded',
      'payment.failed',
      'payment.refunded',
      
      // Customer events
      'customer.created',
      'customer.updated',
      'customer.deleted',
      
      // Product events
      'product.created',
      'product.updated',
      'product.deleted',
      'product.out_of_stock',
      'product.back_in_stock',
      
      // Inventory events
      'inventory.updated',
      'inventory.low',
      
      // Shipping events
      'shipment.created',
      'shipment.updated',
      'shipment.delivered',
      'shipment.failed',
      
      // Review events
      'review.created',
      'review.updated',
      'review.deleted',
      
      // System events
      'system.maintenance',
      'system.error',
      'system.recovered',
    ];
  }

  async getStats(startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliveryRate: number;
    averageResponseTime: number;
    byEventType: Record<string, number>;
    bySubscription: Record<string, number>;
  }> {
    try {
      const { data: events } = await supabase
        .from('webhook_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: deliveries } = await supabase
        .from('webhook_deliveries')
        .select('*, subscription:webhook_subscriptions(name)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const successfulDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
      const failedDeliveries = deliveries?.filter(d => d.status === 'failed').length || 0;
      const totalDeliveries = deliveries?.length || 0;

      // Calculate average response time
      const successfulWithTime = deliveries?.filter(d => d.status === 'delivered' && d.delivered_at);
      let averageResponseTime = 0;
      
      if (successfulWithTime && successfulWithTime.length > 0) {
        const totalTime = successfulWithTime.reduce((sum, delivery) => {
          const created = new Date(delivery.created_at);
          const delivered = new Date(delivery.delivered_at);
          return sum + (delivered.getTime() - created.getTime());
        }, 0);
        
        averageResponseTime = totalTime / successfulWithTime.length;
      }

      // Group by event type
      const byEventType: Record<string, number> = {};
      events?.forEach(event => {
        byEventType[event.type] = (byEventType[event.type] || 0) + 1;
      });

      // Group by subscription
      const bySubscription: Record<string, number> = {};
      deliveries?.forEach(delivery => {
        const subscriptionName = delivery.subscription?.name || 'unknown';
        bySubscription[subscriptionName] = (bySubscription[subscriptionName] || 0) + 1;
      });

      return {
        totalEvents: events?.length || 0,
        totalDeliveries,
        successfulDeliveries,
        failedDeliveries,
        deliveryRate: totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0,
        averageResponseTime,
        byEventType,
        bySubscription,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  async getEventLogs(
    eventType?: string,
    subscriptionId?: string,
    status?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<WebhookDelivery[]> {
    try {
      let query = supabase
        .from('webhook_deliveries')
        .select('*, subscription:webhook_subscriptions(name), event:webhook_events(type, data)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventType) {
        query = query.eq('event.type', eventType);
      }

      if (subscriptionId) {
        query = query.eq('subscription_id', subscriptionId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to get event logs:', error);
      return [];
    }
  }

  async retryFailedDeliveries(deliveryIds?: string[]): Promise<number> {
    try {
      let query = supabase
        .from('webhook_deliveries')
        .update({
          status: 'pending',
          retry_count: 0,
          scheduled_for: null,
          updated_at: new Date().toISOString(),
        })
        .eq('status', 'failed');

      if (deliveryIds) {
        query = query.in('id', deliveryIds);
      }

      const { count, error } = await query;

      if (error) throw error;

      // Trigger immediate processing
      setTimeout(() => this.processWebhooks(), 100);

      return count || 0;
    } catch (error) {
      console.error('Failed to retry deliveries:', error);
      return 0;
    }
  }

  async cleanupOldEvents(days: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Delete old events and their deliveries
      const { data: oldEvents } = await supabase
        .from('webhook_events')
        .select('id')
        .lt('created_at', cutoffDate.toISOString());

      if (!oldEvents || oldEvents.length === 0) {
        return 0;
      }

      const eventIds = oldEvents.map(e => e.id);

      // Delete deliveries first
      await supabase
        .from('webhook_deliveries')
        .delete()
        .in('event_id', eventIds);

      // Delete events
      const { count, error } = await supabase
        .from('webhook_events')
        .delete()
        .in('id', eventIds);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      return 0;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  async sendTestWebhook(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const testEvent = {
        type: 'test.webhook',
        data: {
          message: 'Test webhook from Xarastore',
          timestamp: new Date().toISOString(),
          subscription: {
            id: subscription.id,
            name: subscription.name,
          },
        },
        metadata: {
          test: true,
        },
      };

      const result = await this.trigger('test.webhook', testEvent);

      return !!result;
    } catch (error) {
      console.error('Failed to send test webhook:', error);
      return false;
    }
  }
}

export const webhookHandler = WebhookHandler.getInstance();
