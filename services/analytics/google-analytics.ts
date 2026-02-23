declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    google_optimize?: any;
  }
}

export interface GoogleAnalyticsConfig {
  measurementId: string;
  enabled: boolean;
  anonymizeIp: boolean;
  respectDoNotTrack: boolean;
  debug: boolean;
  optimizeId?: string;
  adsId?: string;
  cookieDomain?: string;
  cookieExpires: number;
  cookieUpdate: boolean;
  cookieFlags?: string;
  allowAdFeatures: boolean;
  allowAdPersonalizationSignals: boolean;
  storeGac: boolean;
  clientId?: string;
  userId?: string;
  customDimensions?: Record<string, number>;
  customMetrics?: Record<string, number>;
}

export interface GtagEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: any;
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  price?: number;
  quantity?: number;
  index?: number;
  discount?: number;
  item_variant?: string;
}

export interface EcommerceEventParams {
  currency?: string;
  value?: number;
  items?: EcommerceItem[];
  coupon?: string;
  payment_type?: string;
  shipping_tier?: string;
  transaction_id?: string;
  tax?: number;
  shipping?: number;
  [key: string]: any;
}

export class GoogleAnalyticsService {
  private static instance: GoogleAnalyticsService;
  private config: GoogleAnalyticsConfig = {
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
    enabled: false,
    anonymizeIp: true,
    respectDoNotTrack: true,
    debug: process.env.NODE_ENV !== 'production',
    cookieExpires: 63072000, // 2 years in seconds
    cookieUpdate: true,
    allowAdFeatures: false,
    allowAdPersonalizationSignals: false,
    storeGac: false,
  };
  private isInitialized = false;
  private pendingEvents: Array<{ event: string; params: GtagEventParams }> = [];
  private customMapInitialized = false;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): GoogleAnalyticsService {
    if (!GoogleAnalyticsService.instance) {
      GoogleAnalyticsService.instance = new GoogleAnalyticsService();
    }
    return GoogleAnalyticsService.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled || !this.config.measurementId) {
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('Google Analytics can only be initialized in browser environment');
      return;
    }

    try {
      this.loadGtagScript();
      this.isInitialized = true;
      console.log('Google Analytics initialized');
      
      // Process pending events
      this.processPendingEvents();
      
      // Set up custom dimensions and metrics
      this.setupCustomDimensions();
      
      // Set up enhanced measurement
      this.setupEnhancedMeasurement();
      
      // Set up user identification if available
      this.setupUserIdentification();
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  trackEvent(event: string, params?: GtagEventParams): void {
    if (!this.config.enabled) return;

    const mergedParams = {
      ...params,
      send_to: this.config.measurementId,
    };

    if (this.isInitialized && window.gtag) {
      window.gtag('event', event, mergedParams);
    } else {
      this.pendingEvents.push({ event, params: mergedParams });
    }
  }

  trackPageView(pagePath: string, pageTitle?: string, params?: GtagEventParams): void {
    if (!this.config.enabled) return;

    const mergedParams = {
      page_path: pagePath,
      page_title: pageTitle || document.title,
      page_location: window.location.href,
      ...params,
    };

    if (this.isInitialized && window.gtag) {
      window.gtag('config', this.config.measurementId, mergedParams);
    } else {
      this.pendingEvents.push({ event: 'page_view', params: mergedParams });
    }
  }

  trackScreenView(screenName: string, appName?: string, params?: GtagEventParams): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      app_name: appName || 'Xarastore Web',
      ...params,
    });
  }

  trackUserTiming(category: string, variable: string, value: number, label?: string): void {
    this.trackEvent('timing_complete', {
      name: variable,
      value: Math.round(value),
      event_category: category,
      event_label: label,
    });
  }

  trackException(description?: string, fatal: boolean = false): void {
    this.trackEvent('exception', {
      description,
      fatal,
    });
  }

  // E-commerce tracking methods
  trackViewItem(item: EcommerceItem, params?: EcommerceEventParams): void {
    this.trackEvent('view_item', {
      currency: 'KES',
      ...params,
      items: [item],
    });
  }

  trackSelectItem(item: EcommerceItem, params?: EcommerceEventParams): void {
    this.trackEvent('select_item', {
      ...params,
      items: [item],
    });
  }

  trackAddToCart(item: EcommerceItem, params?: EcommerceEventParams): void {
    this.trackEvent('add_to_cart', {
      currency: 'KES',
      ...params,
      items: [item],
    });
  }

  trackRemoveFromCart(item: EcommerceItem, params?: EcommerceEventParams): void {
    this.trackEvent('remove_from_cart', {
      currency: 'KES',
      ...params,
      items: [item],
    });
  }

  trackBeginCheckout(items: EcommerceItem[], params?: EcommerceEventParams): void {
    this.trackEvent('begin_checkout', {
      currency: 'KES',
      ...params,
      items,
    });
  }

  trackAddShippingInfo(items: EcommerceItem[], shippingTier: string, params?: EcommerceEventParams): void {
    this.trackEvent('add_shipping_info', {
      currency: 'KES',
      shipping_tier: shippingTier,
      ...params,
      items,
    });
  }

  trackAddPaymentInfo(paymentType: string, items: EcommerceItem[], params?: EcommerceEventParams): void {
    this.trackEvent('add_payment_info', {
      currency: 'KES',
      payment_type: paymentType,
      ...params,
      items,
    });
  }

  trackPurchase(transactionId: string, value: number, items: EcommerceItem[], params?: EcommerceEventParams): void {
    this.trackEvent('purchase', {
      transaction_id: transactionId,
      value,
      currency: 'KES',
      tax: value * 0.16, // 16% VAT
      shipping: 0,
      ...params,
      items,
    });
  }

  trackRefund(transactionId: string, value: number, items?: EcommerceItem[], params?: EcommerceEventParams): void {
    this.trackEvent('refund', {
      transaction_id: transactionId,
      value,
      currency: 'KES',
      ...params,
      items,
    });
  }

  // Enhanced e-commerce methods
  trackProductImpression(items: EcommerceItem[], listName?: string): void {
    this.trackEvent('view_item_list', {
      item_list_name: listName || 'Search Results',
      items,
    });
  }

  trackPromotionView(promotionId: string, promotionName: string): void {
    this.trackEvent('view_promotion', {
      items: [{
        promotion_id: promotionId,
        promotion_name: promotionName,
      }],
    });
  }

  trackPromotionClick(promotionId: string, promotionName: string): void {
    this.trackEvent('select_promotion', {
      items: [{
        promotion_id: promotionId,
        promotion_name: promotionName,
      }],
    });
  }

  // User identification
  setUserId(userId: string): void {
    if (!this.config.enabled) return;

    this.config.userId = userId;
    
    if (this.isInitialized && window.gtag) {
      window.gtag('config', this.config.measurementId, {
        user_id: userId,
      });
    }
    
    this.saveConfig();
  }

  setUserProperties(properties: Record<string, any>): void {
    if (!this.config.enabled || !this.isInitialized || !window.gtag) return;

    window.gtag('set', 'user_properties', properties);
  }

  // Custom dimensions and metrics
  setCustomDimension(dimension: string, value: string): void {
    if (!this.config.enabled || !this.config.customDimensions) return;

    const dimensionIndex = this.config.customDimensions[dimension];
    if (dimensionIndex) {
      if (this.isInitialized && window.gtag) {
        window.gtag('set', {
          [`dimension${dimensionIndex}`]: value,
        });
      }
    }
  }

  setCustomMetric(metric: string, value: number): void {
    if (!this.config.enabled || !this.config.customMetrics) return;

    const metricIndex = this.config.customMetrics[metric];
    if (metricIndex) {
      if (this.isInitialized && window.gtag) {
        window.gtag('set', {
          [`metric${metricIndex}`]: value,
        });
      }
    }
  }

  // Consent management
  updateConsent(consent: 'granted' | 'denied', additionalConsent?: Record<string, any>): void {
    if (!this.config.enabled || !this.isInitialized || !window.gtag) return;

    const consentParams: any = {
      ad_storage: consent,
      analytics_storage: consent,
      functionality_storage: consent,
      personalization_storage: consent,
      security_storage: 'granted',
    };

    if (additionalConsent) {
      consentParams.ad_user_data = additionalConsent.ad_user_data;
      consentParams.ad_personalization = additionalConsent.ad_personalization;
    }

    window.gtag('consent', 'update', consentParams);
  }

  // Configuration
  setConfig(config: Partial<GoogleAnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (config.enabled && !this.isInitialized) {
      this.initialize();
    }
    
    if (this.isInitialized && window.gtag) {
      // Update configuration
      window.gtag('config', this.config.measurementId, {
        anonymize_ip: this.config.anonymizeIp,
        cookie_domain: this.config.cookieDomain,
        cookie_expires: this.config.cookieExpires,
        cookie_update: this.config.cookieUpdate,
        cookie_flags: this.config.cookieFlags,
        allow_google_signals: this.config.allowAdPersonalizationSignals,
        allow_ad_personalization_signals: this.config.allowAdPersonalizationSignals,
        store_gac: this.config.storeGac,
      });
    }
  }

  getConfig(): GoogleAnalyticsConfig {
    return { ...this.config };
  }

  optOut(): void {
    if (!this.config.enabled) return;

    // Disable Google Analytics
    this.config.enabled = false;
    this.saveConfig();
    
    // Set opt-out cookie
    document.cookie = '_ga=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = '_gid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = '_gat=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Clear dataLayer
    if (window.dataLayer) {
      window.dataLayer = [];
    }
    
    console.log('Google Analytics tracking opted out');
  }

  optIn(): void {
    this.config.enabled = true;
    this.saveConfig();
    
    // Clear opt-out cookies
    document.cookie = '_ga=; Path=/; Max-Age=0;';
    document.cookie = '_gid=; Path=/; Max-Age=0;';
    document.cookie = '_gat=; Path=/; Max-Age=0;';
    
    // Re-initialize
    this.initialize();
    
    console.log('Google Analytics tracking opted in');
  }

  // Data export and reporting
  async getRealTimeData(): Promise<any> {
    if (!this.config.enabled) {
      return null;
    }

    // In production, this would call Google Analytics API
    // For now, return mock data or implement API call
    console.log('Getting real-time data from Google Analytics');
    return null;
  }

  async getReport(
    startDate: string,
    endDate: string,
    metrics: string[],
    dimensions?: string[]
  ): Promise<any> {
    if (!this.config.enabled) {
      return null;
    }

    // In production, this would call Google Analytics Data API (GA4)
    console.log(`Getting report from ${startDate} to ${endDate}`);
    return null;
  }

  private loadGtagScript(): void {
    if (typeof window === 'undefined' || window.gtag) {
      return;
    }

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Define gtag function
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    // Set initial timestamp
    window.gtag('js', new Date());

    // Create and inject script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.measurementId}`;
    
    script.onload = () => {
      console.log('Google Analytics gtag.js loaded');
      
      // Configure Google Analytics
      window.gtag('config', this.config.measurementId, {
        anonymize_ip: this.config.anonymizeIp,
        cookie_domain: this.config.cookieDomain,
        cookie_expires: this.config.cookieExpires,
        cookie_update: this.config.cookieUpdate,
        cookie_flags: this.config.cookieFlags,
        allow_google_signals: this.config.allowAdPersonalizationSignals,
        allow_ad_personalization_signals: this.config.allowAdPersonalizationSignals,
        store_gac: this.config.storeGac,
        debug_mode: this.config.debug,
      });

      // Configure Google Optimize if enabled
      if (this.config.optimizeId) {
        window.gtag('config', this.config.optimizeId);
      }

      // Configure Google Ads if enabled
      if (this.config.adsId) {
        window.gtag('config', this.config.adsId);
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Analytics gtag.js:', error);
    };

    document.head.appendChild(script);
  }

  private processPendingEvents(): void {
    if (!this.isInitialized || !window.gtag) return;

    this.pendingEvents.forEach(({ event, params }) => {
      window.gtag('event', event, params);
    });
    
    this.pendingEvents = [];
  }

  private setupCustomDimensions(): void {
    if (!this.config.customDimensions || this.customMapInitialized) return;

    // Map custom dimensions
    const dimensionMap: Record<string, string> = {};
    Object.entries(this.config.customDimensions).forEach(([name, index]) => {
      dimensionMap[name] = `dimension${index}`;
    });

    // Map custom metrics
    const metricMap: Record<string, string> = {};
    Object.entries(this.config.customMetrics).forEach(([name, index]) => {
      metricMap[name] = `metric${index}`;
    });

    // Send mapping to Google Analytics
    if (window.gtag && Object.keys(dimensionMap).length > 0) {
      window.gtag('set', dimensionMap);
    }

    if (window.gtag && Object.keys(metricMap).length > 0) {
      window.gtag('set', metricMap);
    }

    this.customMapInitialized = true;
  }

  private setupEnhancedMeasurement(): void {
    if (!this.isInitialized || !window.gtag) return;

    // Enable enhanced measurement features
    window.gtag('set', {
      // Page load metrics
      page_load_sample_rate: 100,
      
      // Site search tracking
      search_query_parameter: 'q',
      
      // Outbound link tracking
      outbound_link_track_delay: 100,
      
      // File download tracking
      file_download_extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip'],
      
      // Form interaction tracking
      form_interaction: true,
      
      // Video engagement tracking
      youtube_embed: true,
      
      // Scroll tracking
      scroll_depth_thresholds: '25,50,75,90',
    });
  }

  private setupUserIdentification(): void {
    if (typeof window === 'undefined') return;

    // Try to get user ID from localStorage
    try {
      const userId = localStorage.getItem('xarastore-user-id');
      if (userId) {
        this.setUserId(userId);
      }
    } catch (error) {
      console.warn('Failed to load user ID from localStorage:', error);
    }

    // Listen for user authentication events
    window.addEventListener('user-authenticated', ((event: CustomEvent) => {
      const { userId, attributes } = event.detail;
      this.setUserId(userId);
      
      if (attributes) {
        this.setUserProperties(attributes);
      }
    }) as EventListener);

    window.addEventListener('user-logged-out', () => {
      // Clear user ID
      this.setUserId('');
    });
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-ga-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Enable if measurement ID is available
      if (this.config.measurementId) {
        this.config.enabled = true;
      }
    } catch (error) {
      console.warn('Failed to load Google Analytics config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-ga-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save Google Analytics config:', error);
    }
  }

  // Helper methods for common tracking scenarios
  trackProductView(productId: string, productName: string, price?: number, category?: string): void {
    const item: EcommerceItem = {
      item_id: productId,
      item_name: productName,
      price,
      item_category: category,
    };

    this.trackViewItem(item, {
      currency: 'KES',
      value: price,
    });
  }

  trackAddToCartEvent(productId: string, productName: string, price: number, quantity: number = 1, category?: string): void {
    const item: EcommerceItem = {
      item_id: productId,
      item_name: productName,
      price,
      quantity,
      item_category: category,
    };

    this.trackAddToCart(item, {
      currency: 'KES',
      value: price * quantity,
    });
  }

  trackPurchaseEvent(
    transactionId: string,
    items: Array<{ id: string; name: string; price: number; quantity: number; category?: string }>,
    tax?: number,
    shipping?: number,
    coupon?: string
  ): void {
    const ecommerceItems: EcommerceItem[] = items.map((item, index) => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      item_category: item.category,
      index,
    }));

    const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    this.trackPurchase(transactionId, totalValue, ecommerceItems, {
      tax: tax || totalValue * 0.16,
      shipping: shipping || 0,
      coupon,
    });
  }

  trackSearchEvent(query: string, resultsCount: number): void {
    this.trackEvent('search', {
      search_term: query,
      search_results: resultsCount,
    });
  }

  trackErrorEvent(errorType: string, errorMessage: string): void {
    this.trackException(`${errorType}: ${errorMessage}`, false);
  }

  trackPerformanceMetric(metricName: string, value: number, category: string = 'Performance'): void {
    this.trackUserTiming(category, metricName, value);
  }
}

export const googleAnalytics = GoogleAnalyticsService.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    googleAnalytics.initialize();
  }, 0);
}
