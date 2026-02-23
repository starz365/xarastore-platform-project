declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export interface FacebookPixelConfig {
  pixelId: string;
  enabled: boolean;
  debug: boolean;
  autoConfig: boolean;
  currency: string;
  version: string;
}

export interface FacebookEventParams {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  contents?: Array<{
    id: string;
    quantity: number;
    item_price?: number;
  }>;
  content_category?: string;
  num_items?: number;
  search_string?: string;
  status?: string;
  predicted_ltv?: number;
  [key: string]: any;
}

export interface FacebookUserData {
  em?: string; // email
  ph?: string; // phone
    fn?: string; // first name
    ln?: string; // last name
    ge?: string; // gender
    db?: string; // date of birth
    ct?: string; // city
    st?: string; // state
    zp?: string; // zip code
    country?: string;
  external_id?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string; // Facebook click ID
  fbp?: string; // Facebook browser ID
}

export class FacebookPixelService {
  private static instance: FacebookPixelService;
  private config: FacebookPixelConfig = {
    pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '',
    enabled: false,
    debug: process.env.NODE_ENV !== 'production',
    autoConfig: true,
    currency: 'KES',
    version: '2.0',
  };
  private isInitialized = false;
  private pendingEvents: Array<{ event: string; params?: FacebookEventParams }> = [];
  private userData: FacebookUserData = {};
  private advancedMatchingEnabled = true;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): FacebookPixelService {
    if (!FacebookPixelService.instance) {
      FacebookPixelService.instance = new FacebookPixelService();
    }
    return FacebookPixelService.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled || !this.config.pixelId) {
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('Facebook Pixel can only be initialized in browser environment');
      return;
    }

    try {
      this.loadFacebookPixel();
      this.isInitialized = true;
      console.log('Facebook Pixel initialized');
      
      // Process pending events
      this.processPendingEvents();
      
      // Track initial page view
      this.trackPageView();
      
      // Set up automatic tracking
      this.setupAutomaticTracking();
    } catch (error) {
      console.error('Failed to initialize Facebook Pixel:', error);
    }
  }

  track(event: string, params?: FacebookEventParams): void {
    if (!this.config.enabled) return;

    const mergedParams = {
      ...params,
      currency: params?.currency || this.config.currency,
    };

    if (this.isInitialized && window.fbq) {
      if (this.userData && Object.keys(this.userData).length > 0) {
        window.fbq('track', event, mergedParams, this.userData);
      } else {
        window.fbq('track', event, mergedParams);
      }
    } else {
      this.pendingEvents.push({ event, params: mergedParams });
    }
  }

  trackCustom(event: string, params?: FacebookEventParams): void {
    this.track(event, params);
  }

  trackPageView(): void {
    this.track('PageView');
  }

  trackViewContent(contentName?: string, contentIds?: string[], params?: FacebookEventParams): void {
    this.track('ViewContent', {
      content_name: contentName,
      content_ids: contentIds,
      content_type: 'product',
      ...params,
    });
  }

  trackSearch(query: string, params?: FacebookEventParams): void {
    this.track('Search', {
      search_string: query,
      ...params,
    });
  }

  trackAddToCart(contentIds?: string[], value?: number, params?: FacebookEventParams): void {
    this.track('AddToCart', {
      content_ids: contentIds,
      value,
      content_type: 'product',
      ...params,
    });
  }

  trackAddToWishlist(contentIds?: string[], contentName?: string, params?: FacebookEventParams): void {
    this.track('AddToWishlist', {
      content_ids: contentIds,
      content_name: contentName,
      content_type: 'product',
      ...params,
    });
  }

  trackInitiateCheckout(value?: number, contentIds?: string[], numItems?: number, params?: FacebookEventParams): void {
    this.track('InitiateCheckout', {
      value,
      content_ids: contentIds,
      num_items: numItems,
      content_type: 'product',
      ...params,
    });
  }

  trackAddPaymentInfo(value?: number, contentIds?: string[], params?: FacebookEventParams): void {
    this.track('AddPaymentInfo', {
      value,
      content_ids: contentIds,
      content_type: 'product',
      ...params,
    });
  }

  trackPurchase(value: number, contentIds?: string[], numItems?: number, params?: FacebookEventParams): void {
    this.track('Purchase', {
      value,
      content_ids: contentIds,
      num_items: numItems,
      content_type: 'product',
      currency: this.config.currency,
      ...params,
    });
  }

  trackLead(value?: number, contentName?: string, params?: FacebookEventParams): void {
    this.track('Lead', {
      value,
      content_name: contentName,
      ...params,
    });
  }

  trackCompleteRegistration(value?: number, params?: FacebookEventParams): void {
    this.track('CompleteRegistration', {
      value,
      currency: this.config.currency,
      status: 'complete',
      ...params,
    });
  }

  trackContact(value?: number, params?: FacebookEventParams): void {
    this.track('Contact', {
      value,
      ...params,
    });
  }

  trackSchedule(value?: number, params?: FacebookEventParams): void {
    this.track('Schedule', {
      value,
      ...params,
    });
  }

  trackSubmitApplication(value?: number, params?: FacebookEventParams): void {
    this.track('SubmitApplication', {
      value,
      ...params,
    });
  }

  trackStartTrial(value?: number, predictedLtv?: number, params?: FacebookEventParams): void {
    this.track('StartTrial', {
      value,
      predicted_ltv: predictedLtv,
      ...params,
    });
  }

  trackSubscribe(value?: number, predictedLtv?: number, params?: FacebookEventParams): void {
    this.track('Subscribe', {
      value,
      predicted_ltv: predictedLtv,
      ...params,
    });
  }

  // Advanced Matching
  setUserData(userData: FacebookUserData): void {
    this.userData = { ...this.userData, ...userData };
    
    if (this.isInitialized && window.fbq) {
      window.fbq('init', this.config.pixelId, this.userData);
    }
    
    this.saveUserData();
  }

  clearUserData(): void {
    this.userData = {};
    
    if (this.isInitialized && window.fbq) {
      window.fbq('init', this.config.pixelId, {});
    }
    
    this.clearStoredUserData();
  }

  enableAdvancedMatching(): void {
    this.advancedMatchingEnabled = true;
    
    if (this.isInitialized && window.fbq) {
      window.fbq('init', this.config.pixelId, this.userData);
    }
  }

  disableAdvancedMatching(): void {
    this.advancedMatchingEnabled = false;
    
    if (this.isInitialized && window.fbq) {
      window.fbq('init', this.config.pixelId, {});
    }
  }

  // Configuration
  setConfig(config: Partial<FacebookPixelConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (config.enabled && !this.isInitialized) {
      this.initialize();
    }
  }

  getConfig(): FacebookPixelConfig {
    return { ...this.config };
  }

  optOut(): void {
    if (!this.config.enabled) return;

    // Disable Facebook Pixel
    this.config.enabled = false;
    this.saveConfig();
    
    // Clear Facebook Pixel cookies
    this.clearFacebookCookies();
    
    // Opt out of Facebook tracking
    if (window.fbq) {
      window.fbq('consent', 'revoke');
    }
    
    console.log('Facebook Pixel tracking opted out');
  }

  optIn(): void {
    this.config.enabled = true;
    this.saveConfig();
    
    // Grant consent
    if (window.fbq) {
      window.fbq('consent', 'grant');
    }
    
    // Re-initialize
    this.initialize();
    
    console.log('Facebook Pixel tracking opted in');
  }

  updateConsent(consent: 'grant' | 'revoke'): void {
    if (!this.isInitialized || !window.fbq) return;

    window.fbq('consent', consent);
  }

  // Data export and verification
  verifyPixel(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isInitialized || !window.fbq) {
        resolve(false);
        return;
      }

      // Check if pixel is loaded by looking for cookies
      const hasFbp = document.cookie.includes('_fbp=');
      const hasFbc = document.cookie.includes('_fbc=');
      
      resolve(hasFbp || hasFbc);
    });
  }

  getPixelData(): {
    pixelId: string;
    isActive: boolean;
    eventsTracked: number;
    userData: FacebookUserData;
    cookies: Record<string, string>;
  } {
    const cookies: Record<string, string> = {};
    
    // Extract Facebook Pixel cookies
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name.startsWith('_fb') || name === 'fr') {
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

  private loadFacebookPixel(): void {
    if (typeof window === 'undefined' || window.fbq) {
      return;
    }

    // Initialize Facebook Pixel function
    window.fbq = function() {
      window.fbq.callMethod ? 
        window.fbq.callMethod.apply(window.fbq, arguments) : 
        window.fbq.queue.push(arguments);
    };

    if (!window._fbq) {
      window._fbq = window.fbq;
    }

    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = this.config.version;
    window.fbq.queue = [];

    // Create and inject script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://connect.facebook.net/en_US/fbevents.js`;
    
    script.onload = () => {
      console.log('Facebook Pixel SDK loaded');
      
      // Initialize with or without advanced matching
      if (this.advancedMatchingEnabled && Object.keys(this.userData).length > 0) {
        window.fbq('init', this.config.pixelId, this.userData);
      } else {
        window.fbq('init', this.config.pixelId);
      }
      
      if (this.config.autoConfig) {
        window.fbq('set', 'autoConfig', true, this.config.pixelId);
      }
      
      window.fbq('set', 'currency', this.config.currency);
      
      if (this.config.debug) {
        window.fbq('set', 'debug', true);
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Facebook Pixel SDK:', error);
    };

    // Create noscript fallback
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${this.config.pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);

    document.head.appendChild(script);
    document.head.appendChild(noscript);
  }

  private processPendingEvents(): void {
    if (!this.isInitialized || !window.fbq) return;

    this.pendingEvents.forEach(({ event, params }) => {
      if (this.userData && Object.keys(this.userData).length > 0) {
        window.fbq('track', event, params, this.userData);
      } else {
        window.fbq('track', event, params);
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
      
      const userData: FacebookUserData = {
        external_id: userId,
      };
      
      if (email) userData.em = this.hashData(email);
      if (phone) userData.ph = this.hashData(phone);
      if (firstName) userData.fn = this.hashData(firstName);
      if (lastName) userData.ln = this.hashData(lastName);
      
      this.setUserData(userData);
      this.trackCompleteRegistration(0, { currency: 'KES' });
    }) as EventListener);

    window.addEventListener('user-logged-out', () => {
      this.clearUserData();
    });
  }

  private hashData(data: string): string {
    // Facebook requires SHA-256 hashed data for advanced matching
    // In production, implement proper SHA-256 hashing
    // For now, return the data (Facebook will hash it on their end)
    return data.toLowerCase().trim();
  }

  private clearFacebookCookies(): void {
    const cookies = document.cookie.split(';');
    
    cookies.forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name.startsWith('_fb') || name === 'fr') {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-fb-pixel-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Enable if pixel ID is available
      if (this.config.pixelId) {
        this.config.enabled = true;
      }
    } catch (error) {
      console.warn('Failed to load Facebook Pixel config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-fb-pixel-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save Facebook Pixel config:', error);
    }
  }

  private loadUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedUserData = localStorage.getItem('xarastore-fb-user-data');
      if (savedUserData) {
        this.userData = JSON.parse(savedUserData);
      }
    } catch (error) {
      console.warn('Failed to load Facebook user data:', error);
    }
  }

  private saveUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-fb-user-data', JSON.stringify(this.userData));
    } catch (error) {
      console.warn('Failed to save Facebook user data:', error);
    }
  }

  private clearStoredUserData(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('xarastore-fb-user-data');
    } catch (error) {
      console.warn('Failed to clear Facebook user data:', error);
    }
  }

  // Helper methods for common e-commerce scenarios
  trackProductViewEvent(productId: string, productName: string, price?: number, category?: string): void {
    this.trackViewContent(productName, [productId], {
      value: price,
      currency: this.config.currency,
      content_category: category,
    });
  }

  trackAddToCartEvent(productId: string, productName: string, price: number, quantity: number = 1, category?: string): void {
    this.trackAddToCart([productId], price * quantity, {
      content_name: productName,
      content_category: category,
      contents: [{
        id: productId,
        quantity,
        item_price: price,
      }],
    });
  }

  trackPurchaseEvent(
    value: number,
    productIds: string[],
    contents?: Array<{ id: string; quantity: number; item_price?: number }>,
    params?: FacebookEventParams
  ): void {
    this.trackPurchase(value, productIds, contents?.length || productIds.length, {
      contents,
      ...params,
    });
  }

  trackCheckoutStartEvent(value: number, productIds: string[], numItems: number): void {
    this.trackInitiateCheckout(value, productIds, numItems);
  }

  trackSearchEvent(query: string): void {
    this.trackSearch(query);
  }

  trackLeadEvent(value?: number, contentName?: string): void {
    this.trackLead(value, contentName);
  }

  trackRegistrationComplete(value?: number): void {
    this.trackCompleteRegistration(value);
  }
}

export const facebookPixel = FacebookPixelService.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    facebookPixel.initialize();
  }, 0);
}
