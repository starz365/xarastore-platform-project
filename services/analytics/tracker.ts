interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Initialize Google Analytics (if configured)
    if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
      this.initGoogleAnalytics();
    }

    // Initialize other analytics providers as needed
    this.isInitialized = true;
  }

  private initGoogleAnalytics() {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
  }

  trackPageView(path: string) {
    if (typeof window === 'undefined') return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID!, {
        page_path: path,
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Page view:', path);
    }

    // Send to your analytics endpoint
    this.sendToEndpoint('pageview', { path });
  }

  trackEvent(event: AnalyticsEvent) {
    if (typeof window === 'undefined') return;

    // Google Analytics
    if (window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event,
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Event tracked:', event);
    }

    // Send to your analytics endpoint
    this.sendToEndpoint('event', event);
  }

  trackEcommerceEvent(type: string, data: any) {
    const event = {
      category: 'ecommerce',
      action: type,
      ...data,
    };
    this.trackEvent(event);
  }

  trackProductView(productId: string, productName: string) {
    this.trackEcommerceEvent('product_view', {
      product_id: productId,
      product_name: productName,
    });
  }

  trackAddToCart(productId: string, productName: string, price: number, quantity: number = 1) {
    this.trackEcommerceEvent('add_to_cart', {
      product_id: productId,
      product_name: productName,
      price,
      quantity,
    });
  }

  trackCheckoutStarted(orderId: string, amount: number, items: any[]) {
    this.trackEcommerceEvent('begin_checkout', {
      order_id: orderId,
      value: amount,
      items: items.map(item => ({
        item_id: item.productId,
        item_name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }

  trackPurchase(orderId: string, amount: number, items: any[]) {
    this.trackEcommerceEvent('purchase', {
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

  private async sendToEndpoint(type: string, data: any) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }
}

export const analytics = AnalyticsTracker.getInstance();
