import { getRedisCache } from '@/services/cache/redis';

interface PageView {
  path: string;
  referrer?: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  ip?: string;
}

interface Event {
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

interface ProductView {
  productId: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  referrer?: string;
}

export class AnalyticsTracker {
  private redis = getRedisCache();
  private sessionId: string;
  private static instance: AnalyticsTracker;

  constructor() {
    this.sessionId = this.getSessionId();
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Track page view
   */
  async trackPageView(path: string, userId?: string) {
    const pageView: PageView = {
      path,
      referrer: document.referrer,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
    };

    // Queue for batch processing
    await this.queueEvent('page_view', pageView);

    // Send to API
    this.sendToApi('/api/analytics/pageview', pageView).catch(console.error);
  }

  /**
   * Track custom event
   */
  async trackEvent(name: string, properties: Record<string, any> = {}, userId?: string) {
    const event: Event = {
      name,
      properties,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
    };

    await this.queueEvent('custom_event', event);
    await this.sendToApi('/api/analytics/event', event).catch(console.error);
  }

  /**
   * Track product view
   */
  async trackProductView(productId: string, userId?: string) {
    const productView: ProductView = {
      productId,
      userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      referrer: document.referrer,
    };

    await this.queueEvent('product_view', productView);
    await this.sendToApi('/api/analytics/product-view', productView).catch(console.error);
  }

  /**
   * Track search
   */
  async trackSearch(query: string, resultsCount: number, userId?: string) {
    await this.trackEvent('search', {
      query,
      resultsCount,
    }, userId);
  }

  /**
   * Track add to cart
   */
  async trackAddToCart(productId: string, quantity: number, price: number, userId?: string) {
    await this.trackEvent('add_to_cart', {
      productId,
      quantity,
      price,
      total: price * quantity,
    }, userId);
  }

  /**
   * Track purchase
   */
  async trackPurchase(orderId: string, total: number, items: any[], userId?: string) {
    await this.trackEvent('purchase', {
      orderId,
      total,
      itemCount: items.length,
      items,
    }, userId);
  }

  /**
   * Queue event for batch processing
   */
  private async queueEvent(type: string, data: any) {
    const queueKey = `analytics:queue:${Date.now()}`;
    await this.redis.lpush('analytics:queue', {
      type,
      data,
      timestamp: Date.now(),
    });

    // Keep only last 1000 events in queue
    await this.redis.ltrim('analytics:queue', 0, 999);
  }

  /**
   * Send event to API
   */
  private async sendToApi(endpoint: string, data: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics:', endpoint, data);
      return;
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true, // Ensure request completes even if page unloads
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Get user session data
   */
  async getSessionData(sessionId: string) {
    const sessionKey = `analytics:session:${sessionId}`;
    return await this.redis.get(sessionKey);
  }

  /**
   * Get user journey
   */
  async getUserJourney(userId: string, limit: number = 100) {
    const journeyKey = `analytics:journey:${userId}`;
    return await this.redis.lrange(journeyKey, 0, limit - 1);
  }
}

// Export singleton instance
export const analytics = AnalyticsTracker.getInstance();
