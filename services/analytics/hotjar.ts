declare global {
  interface Window {
    hj?: (...args: any[]) => void;
    _hjSettings?: {
      hjid: number;
      hjsv: number;
    };
  }
}

export interface HotjarConfig {
  hjid: number;
  hjsv: number;
  enabled: boolean;
  snippetVersion?: number;
  nonce?: string;
  debug?: boolean;
}

export interface HotjarRecordingConfig {
  sessionReplay?: boolean;
  heatmaps?: boolean;
  feedback?: boolean;
  incomingFeedback?: boolean;
  surveys?: boolean;
  excludeSelectors?: string[];
  disableSessionReplayRecording?: boolean;
}

export interface HotjarUserAttributes {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  created_at?: string;
  last_login?: string;
  plan?: string;
  [key: string]: any;
}

export class HotjarService {
  private static instance: HotjarService;
  private config: HotjarConfig = {
    hjid: parseInt(process.env.NEXT_PUBLIC_HOTJAR_ID || '0'),
    hjsv: parseInt(process.env.NEXT_PUBLIC_HOTJAR_SNIPPET_VERSION || '6'),
    enabled: false,
    debug: process.env.NODE_ENV !== 'production',
  };
  private isInitialized = false;
  private recordingConfig: HotjarRecordingConfig = {
    sessionReplay: true,
    heatmaps: true,
    feedback: true,
    incomingFeedback: true,
    surveys: true,
    excludeSelectors: [
      '[data-hotjar-exclude]',
      '.hj-exclude',
      '[data-skip-hotjar]',
    ],
    disableSessionReplayRecording: false,
  };

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): HotjarService {
    if (!HotjarService.instance) {
      HotjarService.instance = new HotjarService();
    }
    return HotjarService.instance;
  }

  initialize(): void {
    if (this.isInitialized || !this.config.enabled || !this.config.hjid || this.config.hjid === 0) {
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('Hotjar can only be initialized in browser environment');
      return;
    }

    try {
      this.loadHotjarSnippet();
      this.isInitialized = true;
      console.log('Hotjar initialized');
      
      // Apply recording configuration
      this.applyRecordingConfig();
      
      // Set up automatic user identification
      this.setupUserIdentification();
    } catch (error) {
      console.error('Failed to initialize Hotjar:', error);
    }
  }

  identify(userId: string, attributes?: HotjarUserAttributes): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      const userAttributes = {
        ...attributes,
        id: userId,
        identified: true,
        identified_at: new Date().toISOString(),
      };

      this.callHotjar('identify', userId, userAttributes);
      
      // Store in localStorage for persistence
      this.storeUserAttributes(userId, userAttributes);
    } catch (error) {
      console.error('Failed to identify user in Hotjar:', error);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('event', event, properties);
    } catch (error) {
      console.error('Failed to track event in Hotjar:', error);
    }
  }

  tagRecording(tags: string[]): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('tagRecording', tags);
    } catch (error) {
      console.error('Failed to tag recording in Hotjar:', error);
    }
  }

  stateChange(path: string): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('stateChange', path);
    } catch (error) {
      console.error('Failed to change state in Hotjar:', error);
    }
  }

  setRecordingConfig(config: Partial<HotjarRecordingConfig>): void {
    this.recordingConfig = { ...this.recordingConfig, ...config };
    
    if (this.isInitialized) {
      this.applyRecordingConfig();
    }
    
    this.saveRecordingConfig();
  }

  getRecordingConfig(): HotjarRecordingConfig {
    return { ...this.recordingConfig };
  }

  pauseRecording(): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('pauseRecording');
    } catch (error) {
      console.error('Failed to pause Hotjar recording:', error);
    }
  }

  resumeRecording(): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('resumeRecording');
    } catch (error) {
      console.error('Failed to resume Hotjar recording:', error);
    }
  }

  disableSessionReplay(): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('disableSessionReplay');
      this.recordingConfig.disableSessionReplayRecording = true;
      this.saveRecordingConfig();
    } catch (error) {
      console.error('Failed to disable Hotjar session replay:', error);
    }
  }

  enableSessionReplay(): void {
    if (!this.config.enabled || !this.isInitialized) return;

    try {
      this.callHotjar('enableSessionReplay');
      this.recordingConfig.disableSessionReplayRecording = false;
      this.saveRecordingConfig();
    } catch (error) {
      console.error('Failed to enable Hotjar session replay:', error);
    }
  }

  setConfig(config: Partial<HotjarConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (config.enabled && !this.isInitialized) {
      this.initialize();
    }
  }

  getConfig(): HotjarConfig {
    return { ...this.config };
  }

  optOut(): void {
    if (!this.config.enabled) return;

    try {
      this.callHotjar('optOut');
      this.config.enabled = false;
      this.saveConfig();
      console.log('Hotjar tracking opted out');
    } catch (error) {
      console.error('Failed to opt out of Hotjar:', error);
    }
  }

  optIn(): void {
    try {
      this.callHotjar('optIn');
      this.config.enabled = true;
      this.saveConfig();
      console.log('Hotjar tracking opted in');
    } catch (error) {
      console.error('Failed to opt in to Hotjar:', error);
    }
  }

  isUserOptedOut(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return localStorage.getItem('_hjOptOut') === '1';
    } catch (error) {
      return false;
    }
  }

  getSessionUrl(): string | null {
    if (!this.config.enabled || !this.isInitialized) return null;

    try {
      // In production, this would call Hotjar's API
      // For now, return null
      return null;
    } catch (error) {
      console.error('Failed to get Hotjar session URL:', error);
      return null;
    }
  }

  getHeatmapData(): Promise<any> {
    if (!this.config.enabled || !this.isInitialized) {
      return Promise.resolve(null);
    }

    // In production, this would call Hotjar's API
    // For now, return empty promise
    return Promise.resolve(null);
  }

  getFeedbackData(): Promise<any> {
    if (!this.config.enabled || !this.isInitialized) {
      return Promise.resolve(null);
    }

    // In production, this would call Hotjar's API
    // For now, return empty promise
    return Promise.resolve(null);
  }

  private loadHotjarSnippet(): void {
    if (typeof window === 'undefined' || window.hj) {
      return;
    }

    // Set Hotjar settings
    window._hjSettings = {
      hjid: this.config.hjid,
      hjsv: this.config.hjsv,
    };

    // Create Hotjar snippet
    const hotjarSnippet = `
      (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:${this.config.hjid},hjsv:${this.config.hjsv}};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        ${this.config.nonce ? `r.nonce="${this.config.nonce}";` : ''}
        a.appendChild(r);
      })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
    `;

    // Create and inject script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = hotjarSnippet;
    
    if (this.config.nonce) {
      script.nonce = this.config.nonce;
    }
    
    script.onload = () => {
      console.log('Hotjar snippet loaded');
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Hotjar snippet:', error);
    };

    document.head.appendChild(script);
  }

  private callHotjar(method: string, ...args: any[]): void {
    if (typeof window !== 'undefined' && window.hj) {
      try {
        window.hj(method, ...args);
        
        if (this.config.debug) {
          console.log(`Hotjar ${method} called:`, args);
        }
      } catch (error) {
        console.error(`Failed to call Hotjar ${method}:`, error);
      }
    }
  }

  private applyRecordingConfig(): void {
    if (!this.isInitialized) return;

    // Apply exclude selectors
    if (this.recordingConfig.excludeSelectors && this.recordingConfig.excludeSelectors.length > 0) {
      this.recordingConfig.excludeSelectors.forEach(selector => {
        this.callHotjar('exclude', selector);
      });
    }

    // Apply session replay setting
    if (this.recordingConfig.disableSessionReplayRecording) {
      this.disableSessionReplay();
    } else {
      this.enableSessionReplay();
    }

    // Apply other settings
    if (!this.recordingConfig.heatmaps) {
      this.callHotjar('disableHeatmaps');
    }

    if (!this.recordingConfig.feedback) {
      this.callHotjar('disableFeedback');
    }

    if (!this.recordingConfig.incomingFeedback) {
      this.callHotjar('disableIncomingFeedback');
    }

    if (!this.recordingConfig.surveys) {
      this.callHotjar('disableSurveys');
    }
  }

  private setupUserIdentification(): void {
    if (typeof window === 'undefined') return;

    // Try to identify user from localStorage
    try {
      const storedUser = localStorage.getItem('xarastore-hotjar-user');
      if (storedUser) {
        const { userId, attributes } = JSON.parse(storedUser);
        this.identify(userId, attributes);
      }
    } catch (error) {
      console.warn('Failed to load Hotjar user from localStorage:', error);
    }

    // Listen for user authentication events
    window.addEventListener('user-authenticated', ((event: CustomEvent) => {
      const { userId, attributes } = event.detail;
      this.identify(userId, attributes);
    }) as EventListener);

    window.addEventListener('user-logged-out', () => {
      // Clear Hotjar user identification
      this.callHotjar('identify', null, {});
      localStorage.removeItem('xarastore-hotjar-user');
    });
  }

  private storeUserAttributes(userId: string, attributes: HotjarUserAttributes): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-hotjar-user', JSON.stringify({
        userId,
        attributes,
        storedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('Failed to store Hotjar user attributes:', error);
    }
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('xarastore-hotjar-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      const savedRecordingConfig = localStorage.getItem('xarastore-hotjar-recording-config');
      if (savedRecordingConfig) {
        this.recordingConfig = { ...this.recordingConfig, ...JSON.parse(savedRecordingConfig) };
      }

      // Enable if hjid is available
      if (this.config.hjid && this.config.hjid > 0) {
        this.config.enabled = true;
      }
    } catch (error) {
      console.warn('Failed to load Hotjar config:', error);
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-hotjar-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save Hotjar config:', error);
    }
  }

  private saveRecordingConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('xarastore-hotjar-recording-config', JSON.stringify(this.recordingConfig));
    } catch (error) {
      console.warn('Failed to save Hotjar recording config:', error);
    }
  }

  // Helper methods for specific page types
  trackHomepageView(): void {
    this.track('homepage_viewed', {
      page_type: 'homepage',
      timestamp: new Date().toISOString(),
    });
  }

  trackProductPageView(productId: string, productName: string): void {
    this.track('product_page_viewed', {
      page_type: 'product',
      product_id: productId,
      product_name: productName,
      timestamp: new Date().toISOString(),
    });
  }

  trackCategoryPageView(categoryId: string, categoryName: string): void {
    this.track('category_page_viewed', {
      page_type: 'category',
      category_id: categoryId,
      category_name: categoryName,
      timestamp: new Date().toISOString(),
    });
  }

  trackCheckoutStart(): void {
    this.track('checkout_started', {
      page_type: 'checkout',
      step: 'start',
      timestamp: new Date().toISOString(),
    });
  }

  trackCheckoutComplete(orderId: string, amount: number): void {
    this.track('checkout_completed', {
      page_type: 'checkout',
      step: 'complete',
      order_id: orderId,
      amount,
      currency: 'KES',
      timestamp: new Date().toISOString(),
    });
  }

  trackSearch(query: string, resultCount: number): void {
    this.track('search_performed', {
      query,
      result_count: resultCount,
      timestamp: new Date().toISOString(),
    });
  }

  trackError(errorType: string, errorMessage: string, pageUrl: string): void {
    this.track('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      page_url: pageUrl,
      timestamp: new Date().toISOString(),
    });
  }
}

export const hotjar = HotjarService.getInstance();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  setTimeout(() => {
    hotjar.initialize();
  }, 1000); // Delay to ensure page is loaded
}
