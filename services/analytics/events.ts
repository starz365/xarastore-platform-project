import { supabase } from '@/lib/supabase/client';

export interface AnalyticsEvent {
  name: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface EventTrackingConfig {
  enabled: boolean;
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  sampleRate: number;
  bufferSize: number;
  flushInterval: number;
}

export class AnalyticsEventTracker {
  private static instance: AnalyticsEventTracker;
  private config: EventTrackingConfig = {
    enabled: true,
    anonymizeIp: true,
    respectDoNotTrack: true,
    sampleRate: 1.0,
    bufferSize: 20,
    flushInterval: 10000, // 10 seconds
  };
  
  private eventBuffer: AnalyticsEvent[] = [];
  private isFlushing = false;
  private sessionId: string;
  private userId?: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.loadConfig();
    this.startFlushInterval();
    this.setupUserTracking();
  }

  static getInstance(): AnalyticsEventTracker {
    if (!AnalyticsEventTracker.instance) {
      AnalyticsEventTracker.instance = new AnalyticsEventTracker();
    }
    return AnalyticsEventTracker.instance;
  }

  trackEvent(
    name: string,
    category: string,
    action: string,
    properties?: EventProperties,
    label?: string,
    value?: number
  ): void {
    if (!this.shouldTrack()) {
      return;
    }

    const event: AnalyticsEvent = {
      name,
      category,
      action,
      label,
      value,
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        referrer: document.referrer,
      },
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    this.addToBuffer(event);
    
    // Also send to external analytics services
    this.sendToExternalServices(event);
  }

  trackPageView(page: string, properties?: EventProperties): void {
    this.trackEvent('page_view', 'navigation', 'view', {
      ...properties,
      page,
      pageTitle: document.title,
      pagePath: window.location.pathname,
      pageQuery: window.location.search,
      pageHash: window.location.hash,
    });
  }

  trackProductView(productId: string, productName: string, properties?: EventProperties): void {
    this.trackEvent('product_view', 'ecommerce', 'view', {
      ...properties,
      product_id: productId,
      product_name: productName,
    });
  }

  trackAddToCart(productId: string, productName: string, quantity: number = 1, price: number, properties?: EventProperties): void {
    this.trackEvent('add_to_cart', 'ecommerce', 'add', {
      ...properties,
      product_id: productId,
      product_name: productName,
      quantity,
      price,
      currency: 'KES',
    });
  }

  trackRemoveFromCart(productId: string, productName: string, quantity: number = 1, properties?: EventProperties): void {
    this.trackEvent('remove_from_cart', 'ecommerce', 'remove', {
      ...properties,
      product_id: productId,
      product_name: productName,
      quantity,
    });
  }

  trackCheckoutStart(orderId: string, amount: number, items: any[], properties?: EventProperties): void {
    this.trackEvent('begin_checkout', 'ecommerce', 'checkout_start', {
      ...properties,
      order_id: orderId,
      value: amount,
      currency: 'KES',
      items: items.map(item => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  trackPurchase(orderId: string, amount: number, items: any[], properties?: EventProperties): void {
    this.trackEvent('purchase', 'ecommerce', 'purchase', {
      ...properties,
      order_id: orderId,
      value: amount,
      currency: 'KES',
      tax: amount * 0.16, // Assuming 16% VAT
      shipping: 0, // This should come from order data
      items: items.map(item => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  trackSearch(query: string, resultCount: number, properties?: EventProperties): void {
    this.trackEvent('search', 'search', 'query', {
      ...properties,
      search_term: query,
      result_count: resultCount,
    });
  }

  trackFilterApplied(filterName: string, filterValue: any, properties?: EventProperties): void {
    this.trackEvent('filter_applied', 'search', 'filter', {
      ...properties,
      filter_name: filterName,
      filter_value: filterValue,
    });
  }

  trackSortApplied(sortBy: string, properties?: EventProperties): void {
    this.trackEvent('sort_applied', 'search', 'sort', {
      ...properties,
      sort_by: sortBy,
    });
  }

  trackUserRegistration(userId: string, properties?: EventProperties): void {
    this.trackEvent('user_registration', 'user', 'register', {
      ...properties,
      user_id: userId,
    });
  }

  trackUserLogin(userId: string, properties?: EventProperties): void {
    this.trackEvent('user_login', 'user', 'login', {
      ...properties,
      user_id: userId,
    });
  }

  trackUserLogout(userId: string, properties?: EventProperties): void {
    this.trackEvent('user_logout', 'user', 'logout', {
      ...properties,
      user_id: userId,
    });
  }

  trackError(error: Error, context?: string, properties?: EventProperties): void {
    this.trackEvent('error', 'error', 'occurred', {
      ...properties,
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context,
    });
  }

  trackPerformance(metricName: string, value: number, properties?: EventProperties): void {
    this.trackEvent('performance', 'performance', 'metric', {
      ...properties,
      metric_name: metricName,
      metric_value: value,
    });
  }

  setUser(userId: string): void {
    this.userId = userId;
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('xarastore-user-id', userId);
      } catch (error) {
        console.warn('Failed to store user ID in localStorage:', error);
      }
    }
  }

  clearUser(): void {
    this.userId = undefined;
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('xarastore-user-id');
      } catch (error) {
        console.warn('Failed to remove user ID from localStorage:', error);
      }
    }
  }

  setConfig(config: Partial<EventTrackingConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
  }

  getConfig(): EventTrackingConfig {
    return { ...this.config };
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.eventBuffer.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const eventsToSend = [...this.eventBuffer];
      this.eventBuffer = [];

      await this.sendToDatabase(eventsToSend);
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      
      // Put events back in buffer for retry
      this.eventBuffer.unshift(...this.eventBuffer);
    } finally {
      this.isFlushing = false;
    }
  }

  async getEventStats(
    startDate: Date,
    endDate: Date,
    filters?: {
      category?: string;
      action?: string;
      userId?: string;
    }
  ): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    eventsByCategory: Record<string, number>;
    eventsByHour: Array<{ hour: number; count: number }>;
    popularEvents: Array<{ name: string; category: string; count: number }>;
  }> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data: events, error } = await query;
      if (error) throw error;

      const totalEvents = events?.length || 0;
      const uniqueUsers = new Set(events?.map(e => e.user_id).filter(Boolean) || []).size;

      // Group by category
      const eventsByCategory: Record<string, number> = {};
      events?.forEach(event => {
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
      });

      // Group by hour
      const eventsByHourMap = new Map<number, number>();
      events?.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        eventsByHourMap.set(hour, (eventsByHourMap.get(hour) || 0) + 1);
      });

      const eventsByHour = Array.from(eventsByHourMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

      // Popular events
      const eventCounts = new Map<string, { name: string; category: string; count: number }>();
      events?.forEach(event => {
        const key = `${event.category}:${event.name}`;
        const current = eventCounts.get(key) || { name: event.name, category: event.category, count: 0 };
        eventCounts.set(key, { ...current, count: current.count + 1 });
      });

      const popularEvents = Array.from(eventCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEvents,
        uniqueUsers,
        eventsByCategory,
        eventsByHour,
        popularEvents,
      };
    } catch (error) {
      console.error('Failed to get event stats:', error);
      throw error;
    }
  }

  async exportEvents(
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'json'
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (format === 'csv') {
        return this.convertToCSV(data || []);
      } else {
        return JSON.stringify(data || [], null, 2);
      }
    } catch (error) {
      console.error('Failed to export events:', error);
      throw error;
    }
  }

  async clearOldEvents(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase
        .from('analytics_events')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) throw error;

      console.log(`Cleared events older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to clear old events:', error);
      throw error;
    }
  }

  private generateSessionId(): string {
    if (typeof window === 'undefined') {
      return 'server-session';
    }

    // Try to get existing session ID
    let sessionId = localStorage.getItem('xarastore-session-id');
    
    if (!sessionId) {
      sessionId = 'session_' + Math.random().toString(36).substring(2) + '_' + Date.now();
      try {
        localStorage.setItem('xarastore-session-id', sessionId);
      } catch (error) {
        console.warn('Failed to store session ID in localStorage:', error);
      }
    }
    
    return sessionId;
  }

  private setupUserTracking(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedUserId = localStorage.getItem('xarastore-user-id');
      if (storedUserId) {
        this.userId = storedUserId;
      }
    } catch (error) {
      console.warn('Failed to load user ID from localStorage:', error);
    }

    // Track page views automatically
    let lastPage = '';
    
    const trackPageView = () => {
      const currentPage = window.location.pathname + window.location.search;
      if (currentPage !== lastPage) {
        this.trackPageView(currentPage);
        lastPage = currentPage;
      }
    };

    // Initial page view
    setTimeout(trackPageView, 100);

    // Track navigation
    if (typeof window !== 'undefined') {
      // Listen for pushState and replaceState (SPA navigation)
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(this, args);
        trackPageView();
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        trackPageView();
      };

      // Listen for popstate (back/forward navigation)
      window.addEventListener('popstate', trackPageView);
    }
  }

  private shouldTrack(): boolean {
    if (!this.config.enabled) return false;
    
    // Check Do Not Track
    if (this.config.respectDoNotTrack && 
        typeof navigator !== 'undefined' && 
        navigator.doNotTrack === '1') {
      return false;
    }
    
    // Check sample rate
    if (Math.random() > this.config.sampleRate) {
      return false;
    }
    
    return true;
  }

  private addToBuffer(event: AnalyticsEvent): void {
    this.eventBuffer.push(event);
    
    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  private startFlushInterval(): void {
    setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private async sendToDatabase(events: AnalyticsEvent[]): Promise<void> {
    const records = events.map(event => ({
      name: event.name,
      category: event.category,
      action: event.action,
      label: event.label,
      value: event.value,
      properties: event.properties,
      timestamp: event.timestamp.toISOString(),
      user_id: event.userId,
      session_id: event.sessionId,
      user_agent: event.properties.userAgent,
      ip_address: this.config.anonymizeIp ? this.anonymizeIp() : null,
    }));

    const { error } = await supabase
      .from('analytics_events')
      .insert(records);

    if (error) throw error;
  }

  private sendToExternalServices(event: AnalyticsEvent): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.properties,
      });
    }

    // Facebook Pixel
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', event.name, event.properties);
    }

    // Send to webhook if configured
    this.sendToWebhook(event);
  }

  private async sendToWebhook(event: AnalyticsEvent): Promise<void> {
    const webhookUrl = process.env.NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('Failed to send event to webhook:', error);
    }
  }

  private anonymizeIp(): string {
    // This is a simple IP anonymization - in production, use proper IP handling
    return 'xxx.xxx.xxx.xxx';
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-analytics-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load analytics config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-analytics-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save analytics config:', error);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : 
        typeof value === 'object' ? `"${JSON.stringify(value).replace(/"/g, '""')}"` : 
        value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
}

export const analyticsTracker = AnalyticsEventTracker.getInstance();
