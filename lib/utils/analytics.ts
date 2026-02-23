import { supabase } from '@/lib/supabase/client';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: number;
  properties?: Record<string, any>;
}

export interface PageViewEvent {
  path: string;
  referrer?: string;
  title: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  deviceInfo: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    language: string;
  };
}

export interface EcommerceEvent {
  type: 'product_view' | 'add_to_cart' | 'remove_from_cart' | 'begin_checkout' | 'purchase' | 'refund';
  productId?: string;
  orderId?: string;
  value: number;
  currency: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    brand?: string;
  }>;
  userId?: string;
  sessionId: string;
  timestamp: number;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private queue: Array<AnalyticsEvent | PageViewEvent | EcommerceEvent> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds
  private readonly BATCH_SIZE = 20;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async initialize(): Promise<void> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      this.userId = user.id;
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.userId = session.user.id;
      } else if (event === 'SIGNED_OUT') {
        this.userId = undefined;
      }
    });

    // Start flush interval
    this.flushInterval = setInterval(() => this.flushQueue(), this.FLUSH_INTERVAL);

    // Flush before page unload
    window.addEventListener('beforeunload', () => this.flushQueue());
  }

  trackEvent(event: Omit<AnalyticsEvent, 'sessionId' | 'timestamp' | 'userId'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    this.queue.push(fullEvent);
    
    // Flush if queue is large
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  trackPageView(path: string, title: string, referrer?: string): void {
    const event: PageViewEvent = {
      path,
      title,
      referrer,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
      },
    };

    this.queue.push(event);
  }

  trackEcommerceEvent(event: Omit<EcommerceEvent, 'sessionId' | 'timestamp' | 'userId'>): void {
    const fullEvent: EcommerceEvent = {
      ...event,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    };

    this.queue.push(fullEvent);
  }

  trackProductView(productId: string, productName: string, price: number, category?: string, brand?: string): void {
    this.trackEcommerceEvent({
      type: 'product_view',
      productId,
      value: price,
      currency: 'KES',
      items: [{
        id: productId,
        name: productName,
        price,
        quantity: 1,
        category,
        brand,
      }],
    });
  }

  trackAddToCart(productId: string, productName: string, price: number, quantity: number = 1, category?: string, brand?: string): void {
    this.trackEcommerceEvent({
      type: 'add_to_cart',
      productId,
      value: price * quantity,
      currency: 'KES',
      items: [{
        id: productId,
        name: productName,
        price,
        quantity,
        category,
        brand,
      }],
    });
  }

  trackPurchase(orderId: string, value: number, items: Array<{id: string, name: string, price: number, quantity: number}>): void {
    this.trackEcommerceEvent({
      type: 'purchase',
      orderId,
      value,
      currency: 'KES',
      items,
    });
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      // Send to Supabase
      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToSend.map(event => ({
          type: this.getEventType(event),
          data: event,
          created_at: new Date().toISOString(),
        })));

      if (error) {
        console.error('Failed to send analytics:', error);
        // Re-queue failed events
        this.queue.unshift(...eventsToSend);
      }
    } catch (error) {
      console.error('Analytics flush error:', error);
      this.queue.unshift(...eventsToSend);
    }
  }

  private getEventType(event: AnalyticsEvent | PageViewEvent | EcommerceEvent): string {
    if ('category' in event) return 'event';
    if ('path' in event) return 'pageview';
    return 'ecommerce';
  }

  async getStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString());

    if (error) throw error;

    return {
      totalEvents: data.length,
      uniqueUsers: new Set(data.map(e => e.data.userId)).size,
      pageViews: data.filter(e => e.type === 'pageview').length,
      conversions: data.filter(e => e.type === 'ecommerce' && e.data.type === 'purchase').length,
      revenue: data
        .filter(e => e.type === 'ecommerce' && e.data.type === 'purchase')
        .reduce((sum, e) => sum + (e.data.value || 0), 0),
    };
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushQueue();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsService | null = null;

export function getAnalytics(): AnalyticsService {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsService();
  }
  return analyticsInstance;
}

export function trackEvent(event: Omit<AnalyticsEvent, 'sessionId' | 'timestamp' | 'userId'>): void {
  getAnalytics().trackEvent(event);
}

export function trackPageView(path: string, title: string, referrer?: string): void {
  getAnalytics().trackPageView(path, title, referrer);
}

export function trackProductView(productId: string, productName: string, price: number, category?: string, brand?: string): void {
  getAnalytics().trackProductView(productId, productName, price, category, brand);
}

export function trackAddToCart(productId: string, productName: string, price: number, quantity: number = 1, category?: string, brand?: string): void {
  getAnalytics().trackAddToCart(productId, productName, price, quantity, category, brand);
}

export function trackPurchase(orderId: string, value: number, items: Array<{id: string, name: string, price: number, quantity: number}>): void {
  getAnalytics().trackPurchase(orderId, value, items);
}
