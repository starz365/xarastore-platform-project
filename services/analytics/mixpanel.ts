import { analyticsTracker } from './events';
import { cdp } from './segment';

declare global {
  interface Window {
    mixpanel?: any;
  }
}

export interface MixpanelConfig {
  token: string;
  enabled: boolean;
  debug: boolean;
  persistence: 'localStorage' | 'cookie' | 'none';
  cookieDomain?: string;
  cookieExpiration: number;
  crossSubdomainCookie: boolean;
  secureCookie: boolean;
  ip: boolean;
  propertyBlacklist: string[];
  trackPageview: boolean;
}

export class MixpanelService {
  private static instance: MixpanelService;
  private config: MixpanelConfig = {
    token: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
    enabled: false,
    debug: process.env.NODE_ENV !== 'production',
    persistence: 'localStorage',
    cookieExpiration: 365,
    crossSubdomainCookie: false,
    secureCookie: true,
    ip: false,
    propertyBlacklist: [
      '$initial_referrer',
      '$initial_referring_domain',
      '$referrer',
      '$referring_domain',
      '$user_id',
      '$device_id',
      '$insert_id',
    ],
    trackPageview: true,
  };
  private isInitialized = false;
  private identifyQueue: Array<{ userId: string; traits: Record<string, any> }> = [];
  private trackQueue: Array<{ event: string; properties: Record<string, any> }> = [];

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): MixpanelService {
    if (!MixpanelService.instance) {
      MixpanelService.instance = new MixpanelService();
    }
    return MixpanelService.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled || !this.config.token) {
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('Mixpanel can only be initialized in browser environment');
      return;
    }

    try {
      // Load Mixpanel SDK
      this.loadMixpanelSDK();
      
      // Initialize Mixpanel
      window.mixpanel.init(this.config.token, {
        debug: this.config.debug,
        track_pageview: this.config.trackPageview,
        persistence: this.config.persistence,
        cookie_domain: this.config.cookieDomain,
        cookie_expiration: this.config.cookieExpiration,
        cross_subdomain_cookie: this.config.crossSubdomainCookie,
        secure_cookie: this.config.secureCookie,
        ip: this.config.ip,
        property_blacklist: this.config.propertyBlacklist,
        loaded: (mixpanel: any) => {
          this.isInitialized = true;
          console.log('Mixpanel initialized');
          
          // Process queued events
          this.processQueues();
          
          // Set up automatic tracking
          this.setupAutomaticTracking();
        },
      });
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const mergedTraits = {
      ...traits,
      platform: 'web',
      environment: process.env.NODE_ENV,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.identify(userId);
      window.mixpanel.people.set(mergedTraits);
    } else {
      this.identifyQueue.push({ userId, traits: mergedTraits });
    }

    // Also track in our analytics system
    analyticsTracker.setUser(userId);
    if (traits) {
      cdp.identify(userId, traits);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const mergedProperties = {
      ...properties,
      platform: 'web',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.track(event, mergedProperties);
    } else {
      this.trackQueue.push({ event, properties: mergedProperties });
    }

    // Also track in our analytics system
    const userId = this.getCurrentUserId();
    if (userId) {
      analyticsTracker.trackEvent(
        event,
        'mixpanel',
        'track',
        mergedProperties
      );
    }
  }

  trackPageView(page: string, properties?: Record<string, any>): void {
    this.track('Page View', {
      ...properties,
      page,
      page_title: document.title,
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_query: window.location.search,
      page_hash: window.location.hash,
      referrer: document.referrer,
    });
  }

  trackProductView(productId: string, productName: string, properties?: Record<string, any>): void {
    this.track('Product Viewed', {
      ...properties,
      product_id: productId,
      product_name: productName,
      currency: 'KES',
    });
  }

  trackAddToCart(productId: string, productName: string, quantity: number = 1, price: number, properties?: Record<string, any>): void {
    this.track('Product Added', {
      ...properties,
      product_id: productId,
      product_name: productName,
      quantity,
      price,
      currency: 'KES',
    });
  }

  trackRemoveFromCart(productId: string, productName: string, quantity: number = 1, properties?: Record<string, any>): void {
    this.track('Product Removed', {
      ...properties,
      product_id: productId,
      product_name: productName,
      quantity,
    });
  }

  trackCheckoutStarted(orderId: string, amount: number, items: any[], properties?: Record<string, any>): void {
    this.track('Checkout Started', {
      ...properties,
      order_id: orderId,
      value: amount,
      currency: 'KES',
      items: items.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }

  trackPurchase(orderId: string, amount: number, items: any[], properties?: Record<string, any>): void {
    this.track('Order Completed', {
      ...properties,
      order_id: orderId,
      value: amount,
      currency: 'KES',
      tax: amount * 0.16,
      shipping: 0,
      items: items.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    });
  }

  trackSearch(query: string, resultCount: number, properties?: Record<string, any>): void {
    this.track('Search', {
      ...properties,
      query,
      result_count: resultCount,
    });
  }

  trackUserRegistration(userId: string, properties?: Record<string, any>): void {
    this.track('User Registered', {
      ...properties,
      user_id: userId,
    });
    
    this.identify(userId, {
      signup_date: new Date().toISOString(),
      ...properties,
    });
  }

  trackUserLogin(userId: string, properties?: Record<string, any>): void {
    this.track('User Logged In', {
      ...properties,
      user_id: userId,
    });
    
    this.identify(userId, {
      last_login: new Date().toISOString(),
      ...properties,
    });
  }

  trackUserLogout(userId: string, properties?: Record<string, any>): void {
    this.track('User Logged Out', {
      ...properties,
      user_id: userId,
    });
  }

  setUserProperties(userId: string, properties: Record<string, any>): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.identify(userId);
      window.mixpanel.people.set(properties);
    } else {
      this.identifyQueue.push({ userId, traits: properties });
    }
  }

  incrementUserProperty(userId: string, property: string, value: number = 1): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.identify(userId);
      window.mixpanel.people.increment(property, value);
    }
  }

  setUserOnce(userId: string, properties: Record<string, any>): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.identify(userId);
      window.mixpanel.people.set_once(properties);
    }
  }

  alias(alias: string, userId?: string): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.alias(alias, userId);
    }
  }

  reset(): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.reset();
    }
    
    this.identifyQueue = [];
    this.trackQueue = [];
  }

  optOutTracking(): void {
    if (!this.config.enabled) return;

    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.opt_out_tracking();
    }
    
    this.config.enabled = false;
    this.saveConfig();
  }

  optInTracking(): void {
    if (this.isInitialized && window.mixpanel) {
      window.mixpanel.opt_in_tracking();
    }
    
    this.config.enabled = true;
    this.saveConfig();
  }

  setConfig(config: Partial<MixpanelConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.initialize();
      }
    }
  }

  getConfig(): MixpanelConfig {
    return { ...this.config };
  }

  async getEventData(
    event: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    timestamp: Date;
    properties: Record<string, any>;
    userId?: string;
  }>> {
    // In production, this would call Mixpanel's API
    // For now, return mock data or implement API call
    console.log(`Getting event data for ${event} from ${startDate} to ${endDate}`);
    return [];
  }

  async getUserProfile(userId: string): Promise<Record<string, any> | null> {
    // In production, this would call Mixpanel's People API
    // For now, return mock data
    console.log(`Getting user profile for ${userId}`);
    return null;
  }

  async exportFunnel(
    funnelId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    steps: Array<{ name: string; count: number; percentage: number }>;
    conversionRate: number;
    averageTime: number;
  }> {
    // In production, this would call Mixpanel's Funnels API
    console.log(`Exporting funnel ${funnelId}`);
    return {
      steps: [],
      conversionRate: 0,
      averageTime: 0,
    };
  }

  private loadMixpanelSDK(): void {
    if (typeof window === 'undefined' || window.mixpanel) {
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js`;
    
    script.onload = () => {
      console.log('Mixpanel SDK loaded');
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Mixpanel SDK:', error);
    };

    document.head.appendChild(script);
  }

  private processQueues(): void {
    // Process identify queue
    this.identifyQueue.forEach(({ userId, traits }) => {
      if (window.mixpanel) {
        window.mixpanel.identify(userId);
        window.mixpanel.people.set(traits);
      }
    });
    this.identifyQueue = [];

    // Process track queue
    this.trackQueue.forEach(({ event, properties }) => {
      if (window.mixpanel) {
        window.mixpanel.track(event, properties);
      }
    });
    this.trackQueue = [];
  }

  private setupAutomaticTracking(): void {
    if (!this.config.enabled || !this.config.trackPageview) {
      return;
    }

    // Track initial page view
    setTimeout(() => {
      this.trackPageView(window.location.pathname);
    }, 100);

    // Track navigation
    let lastPage = window.location.pathname;
    
    const trackPageView = () => {
      const currentPage = window.location.pathname;
      if (currentPage !== lastPage) {
        this.trackPageView(currentPage);
        lastPage = currentPage;
      }
    };

    // Listen for pushState and replaceState
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

    // Listen for popstate
    window.addEventListener('popstate', trackPageView);

    // Track errors
    window.addEventListener('error', (event) => {
      this.track('Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString(),
      });
    });

    // Track unhandled rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.track('Unhandled Rejection', {
        reason: event.reason?.toString(),
      });
    });

    // Track performance metrics
    if ('performance' in window) {
      setTimeout(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perf) {
          this.track('Performance Metric', {
            metric: 'page_load',
            value: perf.loadEventEnd - perf.loadEventStart,
            dom_content_loaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
            first_paint: perf.domInteractive - perf.fetchStart,
          });
        }
      }, 1000);
    }
  }

  private getCurrentUserId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    
    try {
      // Try to get from localStorage
      const userId = localStorage.getItem('xarastore-user-id');
      return userId || undefined;
    } catch (error) {
      return undefined;
    }
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-mixpanel-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Enable if token is available
      if (this.config.token) {
        this.config.enabled = true;
      }
    } catch (error) {
      console.warn('Failed to load Mixpanel config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-mixpanel-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save Mixpanel config:', error);
    }
  }
}

export const mixpanel = MixpanelService.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    mixpanel.initialize();
  }, 0);
}
