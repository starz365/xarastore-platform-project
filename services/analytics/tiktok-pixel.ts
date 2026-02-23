declare global {
  interface Window {
    ttq?: any;
  }
}

export interface TikTokPixelConfig {
  pixelId: string;
  enabled: boolean;
  debug: boolean;
  autoConfig: boolean;
  currency: string;
  useExistingPixel: boolean;
}

export interface TikTokEventParams {
  value?: number;
  currency?: string;
  description?: string;
  query?: string;
  contents?: Array<{
    content_id: string;
    content_type: string;
    content_name?: string;
    quantity?: number;
    price?: number;
  }>;
  content_type?: string;
  content_id?: string;
  content_name?: string;
  content_category?: string;
  [key: string]: any;
}

export interface TikTokUserData {
  email?: string;
  phone_number?: string;
  external_id?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
}

export class TikTokPixelService {
  private static instance: TikTokPixelService;
  private config: TikTokPixelConfig = {
    pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
    enabled: false,
    debug: process.env.NODE_ENV !== 'production',
    autoConfig: true,
    currency: 'KES',
    useExistingPixel: true,
  };
  private isInitialized = false;
  private pendingEvents: Array<{ event: string; params?: TikTokEventParams }> = [];
  private userData: TikTokUserData = {};

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): TikTokPixelService {
    if (!TikTokPixelService.instance) {
      TikTokPixelService.instance = new TikTokPixelService();
    }
    return TikTokPixelService.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled || !this.config.pixelId) {
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('TikTok Pixel can only be initialized in browser environment');
      return;
    }

    try {
      this.loadTikTokPixel();
      this.isInitialized = true;
      console.log('TikTok Pixel initialized');
      
      // Process pending events
      this.processPendingEvents();
      
      // Track initial page view
      this.trackPageView();
      
      // Set up automatic tracking
      this.setupAutomaticTracking();
    } catch (error) {
      console.error('Failed to initialize TikTok Pixel:', error);
    }
  }

  track(event: string, params?: TikTokEventParams): void {
    if (!this.config.enabled) return;

    const mergedParams = {
      ...params,
      currency: params?.currency || this.config.currency,
    };

    if (this.isInitialized && window.ttq) {
      if (Object.keys(this.userData).length > 0) {
        // Track with user data
        window.ttq.track(event, mergedParams, this.userData);
      } else {
        window.ttq.track(event, mergedParams);
      }
    } else {
      this.pendingEvents.push({ event, params: mergedParams });
    }
  }

  trackPageView(): void {
    this.track('ViewContent');
  }

  trackSearch(query: string, params?: TikTokEventParams): void {
    this.track('Search', {
      query,
      ...params,
    });
  }

  trackViewContent(contentId?: string, contentType?: string, value?: number, params?: TikTokEventParams): void {
    this.track('ViewContent', {
      content_id: contentId,
      content_type: contentType || 'product',
      value,
      ...params,
    });
  }

  trackAddToCart(contentId?: string, contentType?: string, value?: number, params?: TikTokEventParams): void {
    this.track('AddToCart', {
      content_id: contentId,
      content_type: contentType || 'product',
      value,
      ...params,
    });
  }

  trackAddToWishlist(contentId?: string, contentType?: string, params?: TikTokEventParams): void {
    this.track('AddToWishlist', {
      content_id: contentId,
      content_type: contentType || 'product',
      ...params,
    });
  }

  trackInitiateCheckout(value?: number, contentId?: string, contentType?: string, params?: TikTokEventParams): void {
    this.track('InitiateCheckout', {
      value,
      content_id: contentId,
      content_type: contentType || 'product',
      ...params,
    });
  }

  trackAddPaymentInfo(value?: number, contentId?: string, contentType?: string, params?: TikTokEventParams): void {
    this.track('AddPaymentInfo', {
      value,
      content_id: contentId,
      content_type: contentType || 'product',
      ...params,
    });
  }

  trackPlaceAnOrder(value: number, contentId?: string, contentType?: string, params?: TikTokEventParams): void {
    this.track('PlaceAnOrder', {
      value,
      content_id: contentId,
      content_type: contentType || 'product',
      currency: this.config.currency,
      ...params,
    });
  }

  trackCompletePayment(value: number, contentId?: string, contentType?: string, params?: TikTokEventParams): void {
    this.track('CompletePayment', {
      value,
      content_id: contentId,
      content_type: contentType || 'product',
      currency: this.config.currency,
      ...params,
    });
  }

  trackContact(params?: TikTokEventParams): void {
    this.track('Contact', params);
  }

  trackDownload(params?: TikTokEventParams): void {
    this.track('Download', params);
  }

  trackSubmitForm(params?: TikTokEventParams): void {
    this.track('SubmitForm', params);
  }

  trackCompleteRegistration(params?: TikTokEventParams): void {
    this.track('CompleteRegistration', params);
  }

  trackSubscribe(params?: TikTokEventParams): void {
    this.track('Subscribe', params);
  }

  // User identification
  identify(userData: TikTokUserData): void {
    this.userData = { ...this.userData, ...userData };
    
    if (this.isInitialized && window.ttq) {
      window.ttq.identify(this.userData);
    }
    
    this.saveUserData();
  }

  clearIdentity(): void {
    this.userData = {};
    
    if (this.isInitialized && window.ttq) {
      window.ttq.identify({});
    }
    
    this.clearStoredUserData();
  }

  // Configuration
  setConfig(config: Partial<TikTokPixelConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (config.enabled && !this.isInitialized) {
      this.initialize();
    }
  }

  getConfig(): TikTokPixelConfig {
    return { ...this.config };
  }

  optOut(): void {
    if (!this.config.enabled) return;

    // Disable TikTok Pixel
    this.config.enabled = false;
    this.saveConfig();
    
    // Clear TikTok Pixel cookies
    this.clearTikTokCookies();
    
    console.log('TikTok Pixel tracking opted out');
  }

  optIn(): void {
    this.config.enabled = true;
    this.saveConfig();
    
    // Re-initialize
    this.initialize();
    
    console.log('TikTok Pixel tracking opted in');
  }

  // Verification and debugging
  verifyPixel(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isInitialized || !window.ttq) {
        resolve(false);
        return;
      }

      // Check if pixel is loaded by looking for cookies
      const hasTikTokCookies = document.cookie.includes('tt_') || 
                              document.cookie.includes('_ttp');
      
      resolve(hasTikTokCookies);
    });
  }

  getPixelData(): {
    pixelId: string;
    isActive: boolean;
    eventsTracked: number;
    userData: TikTokUserData;
    cookies: Record<string, string>;
  } {
    const cookies: Record<string, string> = {};
    
    // Extract TikTok Pixel cookies
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name.startsWith('tt_') || name.startsWith('_ttp')) {
        cookies[name] = value;
      }
    });

    return {
      pixelId: this.config.pixelId,
      isActive: this.isInitialized,
      eventsTracked: this.pendingEvents.length,
      userData: { ...this.userData },
      cookies,
    };
  }

  private loadTikTokPixel(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize TikTok Pixel object
    window.ttq = window.ttq || [];

    // Create and inject script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://analytics.tiktok.com/i18n/pixel/sdk.js';
    
    script.onload = () => {
      console.log('TikTok Pixel SDK loaded');
      
      // Initialize pixel
      if (this.config.useExistingPixel && window.ttq.instance) {
        // Use existing pixel instance
        window.ttq.load(this.config.pixelId);
      } else {
        // Create new pixel instance
        window.ttq.instance(this.config.pixelId).use(this.config.pixelId);
      }
      
      // Apply configuration
      if (this.config.autoConfig) {
        window.ttq.instance(this.config.pixelId).enableAutoConfig();
      }
      
      if (this.config.debug) {
        window.ttq.instance(this.config.pixelId).enableDebug();
      }
      
      // Apply user data if available
      if (Object.keys(this.userData).length > 0) {
        window.ttq.identify(this.userData);
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load TikTok Pixel SDK:', error);
    };

    // Create noscript fallback
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://analytics.tiktok.com/i18n/pixel/${this.config.pixelId}?ev=PageView&noscript=1`;
    noscript.appendChild(img);

    document.head.appendChild(script);
    document.head.appendChild(noscript);
  }

  private processPendingEvents(): void {
    if (!this.isInitialized || !window.ttq) return;

    this.pendingEvents.forEach(({ event, params }) => {
      if (Object.keys(this.userData).length > 0) {
        window.ttq.track(event, params, this.userData);
      } else {
        window.ttq.track(event, params);
      }
    });
    
    this.pendingEvents = [];
  }

  private setupAutomaticTracking(): void {
    if (!this.config.enabled) return;

    // Track page views on navigation
    let lastPage = window.location.pathname;
    
    const trackPageView = () => {
      const currentPage = window.location.pathname;
      if (currentPage !== lastPage) {
        this.trackPageView();
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

    // Set up user data from localStorage
    this.loadUserData();

    // Listen for user authentication events
    window.addEventListener('user-authenticated', ((event: CustomEvent) => {
      const { userId, email, phone, firstName, lastName } = event.detail;
      
      const userData: TikTokUserData = {
        external_id: userId,
      };
      
      if (email) userData.email = email.toLowerCase().trim();
      if (phone) userData.phone_number = phone;
      if (firstName) userData.first_name = firstName;
      if (lastName) userData.last_name = lastName;
      
      this.identify(userData);
      this.trackCompleteRegistration();
    }) as EventListener);

    window.addEventListener('user-logged-out', () => {
      this.clearIdentity();
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const target = event.target as HTMLFormElement;
      if (target && target.matches('form[data-track-submit]')) {
        this.trackSubmitForm({
          form_id: target.id || target.name,
          form_name: target.getAttribute('data-form-name'),
        });
      }
    });

    // Track file downloads
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[download]');
      
      if (link) {
        const fileName = link.getAttribute('download') || link.href.split('/').pop();
        this.trackDownload({
          file_name: fileName,
          file_type: fileName?.split('.').pop(),
        });
      }
    });
  }

  private clearTikTokCookies(): void {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.startsWith('tt_') || name.startsWith('_ttp')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-tt-pixel-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Enable if pixel ID is available
      if (this.config.pixelId) {
        this.config.enabled = true;
      }
    } catch (error) {
      console.warn('Failed to load TikTok Pixel config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-tt-pixel-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save TikTok Pixel config:', error);
    }
  }

  private loadUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedUserData = localStorage.getItem('xarastore-tt-user-data');
      if (savedUserData) {
        this.userData = JSON.parse(savedUserData);
      }
    } catch (error) {
      console.warn('Failed to load TikTok user data:', error);
    }
  }

  private saveUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-tt-user-data', JSON.stringify(this.userData));
    } catch (error) {
      console.warn('Failed to save TikTok user data:', error);
    }
  }

  private clearStoredUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('xarastore-tt-user-data');
    } catch (error) {
      console.warn('Failed to clear TikTok user data:', error);
    }
  }

  // Helper methods for common e-commerce scenarios
  trackProductViewEvent(productId: string, productName?: string, price?: number, category?: string): void {
    this.trackViewContent(productId, 'product', price, {
      content_name: productName,
      content_category: category,
      description: `View product: ${productName}`,
    });
  }

  trackAddToCartEvent(productId: string, productName?: string, price?: number, quantity: number = 1, category?: string): void {
    this.trackAddToCart(productId, 'product', price ? price * quantity : undefined, {
      content_name: productName,
      content_category: category,
      description: `Add to cart: ${productName}`,
      contents: [{
        content_id: productId,
        content_type: 'product',
        content_name: productName,
        quantity,
        price,
      }],
    });
  }

  trackCheckoutStartEvent(value?: number, productId?: string, productName?: string): void {
    this.trackInitiateCheckout(value, productId, 'product', {
      content_name: productName,
      description: 'Checkout started',
    });
  }

  trackPurchaseEvent(value: number, productId?: string, productName?: string, category?: string): void {
    this.trackPlaceAnOrder(value, productId, 'product', {
      content_name: productName,
      content_category: category,
      description: `Purchase completed: ${value} ${this.config.currency}`,
    });
  }

  trackPaymentCompleteEvent(value: number, productId?: string, productName?: string): void {
    this.trackCompletePayment(value, productId, 'product', {
      content_name: productName,
      description: `Payment completed: ${value} ${this.config.currency}`,
    });
  }

  trackSearchEvent(query: string): void {
    this.trackSearch(query, {
      description: `Search for: ${query}`,
    });
  }

  trackContactEvent(contactMethod: string, value?: number): void {
    this.trackContact({
      contact_method: contactMethod,
      value,
      description: `Contact via ${contactMethod}`,
    });
  }

  trackRegistrationEvent(params?: TikTokEventParams): void {
    this.trackCompleteRegistration({
      ...params,
      description: 'Registration completed',
    });
  }
}

export const tiktokPixel = TikTokPixelService.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    tiktokPixel.initialize();
  }, 0);
}
