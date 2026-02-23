import { useCallback } from 'react';
import { analytics } from '@/services/analytics/tracker';

export function useAnalytics() {
  const trackEvent = useCallback((category: string, action: string, label?: string, value?: number) => {
    analytics.trackEvent({ category, action, label, value });
  }, []);

  const trackPageView = useCallback((path: string) => {
    analytics.trackPageView(path);
  }, []);

  const trackProductView = useCallback((productId: string, productName: string) => {
    analytics.trackProductView(productId, productName);
  }, []);

  const trackAddToCart = useCallback((productId: string, productName: string, price: number, quantity: number = 1) => {
    analytics.trackAddToCart(productId, productName, price, quantity);
  }, []);

  const trackCheckoutStarted = useCallback((orderId: string, amount: number, items: any[]) => {
    analytics.trackCheckoutStarted(orderId, amount, items);
  }, []);

  const trackPurchase = useCallback((orderId: string, amount: number, items: any[]) => {
    analytics.trackPurchase(orderId, amount, items);
  }, []);

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    analytics.trackEvent({
      category: 'error',
      action: 'error_occurred',
      label: error.message,
      ...context,
    });
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackCheckoutStarted,
    trackPurchase,
    trackError,
  };
}
