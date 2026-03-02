'use client';

import { useCallback } from 'react';
import { analytics } from '@/services/analytics/tracker';

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export function useAnalytics() {
  const trackEvent = useCallback((categoryOrEvent: string | AnalyticsEvent, action?: string, label?: string, value?: number) => {
    // Handle both string parameters and object parameter
    if (typeof categoryOrEvent === 'object') {
      analytics.trackEvent(categoryOrEvent);
    } else {
      analytics.trackEvent({ 
        category: categoryOrEvent, 
        action: action || '', 
        label, 
        value 
      });
    }
  }, []);

  const trackPageView = useCallback((path: string) => {
    analytics.trackPageView(path);
  }, []);

  const trackProductView = useCallback((productId: string, productName: string) => {
    analytics.trackProductView(productId, productName);
  }, []);

  const trackAddToCart = useCallback((
    productId: string, 
    productName: string, 
    price: number, 
    quantity: number = 1,
    variant?: string
  ) => {
    analytics.trackAddToCart(productId, productName, price, quantity);
    
    // Also track as event with additional data
    analytics.trackEvent({
      category: 'ecommerce',
      action: 'add_to_cart',
      label: productId,
      value: price * quantity,
      product_name: productName,
      quantity,
      variant,
    });
  }, []);

  const trackCheckoutStarted = useCallback((orderId: string, amount: number, items: any[]) => {
    analytics.trackCheckoutStarted(orderId, amount, items);
    
    analytics.trackEvent({
      category: 'ecommerce',
      action: 'begin_checkout',
      label: orderId,
      value: amount,
      items_count: items.length,
    });
  }, []);

  const trackPurchase = useCallback((orderId: string, amount: number, items: any[]) => {
    analytics.trackPurchase(orderId, amount, items);
    
    analytics.trackEvent({
      category: 'ecommerce',
      action: 'purchase',
      label: orderId,
      value: amount,
      items_count: items.length,
    });
  }, []);

  const trackError = useCallback((error: Error | string, context?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : error;
    
    analytics.trackEvent({
      category: 'error',
      action: 'error_occurred',
      label: errorMessage,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const trackSearch = useCallback((query: string, resultsCount: number) => {
    analytics.trackEvent({
      category: 'search',
      action: 'search_performed',
      label: query,
      value: resultsCount,
    });
  }, []);

  const trackFilterApplied = useCallback((filterType: string, filterValue: string) => {
    analytics.trackEvent({
      category: 'filter',
      action: 'filter_applied',
      label: `${filterType}:${filterValue}`,
    });
  }, []);

  const trackWishlistAction = useCallback((action: 'add' | 'remove', productId: string) => {
    analytics.trackEvent({
      category: 'wishlist',
      action: `${action}_to_wishlist`,
      label: productId,
    });
  }, []);

  const trackOutOfStockAction = useCallback((
    action: 'notify_me' | 'preorder' | 'view_similar',
    productId: string,
    email?: string
  ) => {
    analytics.trackEvent({
      category: 'out_of_stock',
      action,
      label: productId,
      email,
    });
  }, []);

  const trackPreorder = useCallback((productId: string, orderNumber: string, estimatedDelivery: string) => {
    analytics.trackEvent({
      category: 'preorder',
      action: 'preorder_placed',
      label: productId,
      order_number: orderNumber,
      estimated_delivery: estimatedDelivery,
    });
  }, []);

  const trackStockNotification = useCallback((productId: string, email: string) => {
    analytics.trackEvent({
      category: 'notification',
      action: 'stock_notification_subscribed',
      label: productId,
      email,
    });
  }, []);

  const trackViewSimilarProducts = useCallback((productId: string, categoryId: string) => {
    analytics.trackEvent({
      category: 'navigation',
      action: 'view_similar_products',
      label: productId,
      category_id: categoryId,
    });
  }, []);

  const trackPromotionClick = useCallback((promotionId: string, promotionName: string) => {
    analytics.trackEvent({
      category: 'promotion',
      action: 'promotion_click',
      label: promotionId,
      promotion_name: promotionName,
    });
  }, []);

  const trackCategoryView = useCallback((categoryId: string, categoryName: string) => {
    analytics.trackEvent({
      category: 'category',
      action: 'category_view',
      label: categoryId,
      category_name: categoryName,
    });
  }, []);

  const trackBrandView = useCallback((brandId: string, brandName: string) => {
    analytics.trackEvent({
      category: 'brand',
      action: 'brand_view',
      label: brandId,
      brand_name: brandName,
    });
  }, []);

  const trackPerformanceMetric = useCallback((metricName: string, value: number, context?: Record<string, any>) => {
    analytics.trackEvent({
      category: 'performance',
      action: metricName,
      value,
      ...context,
    });
  }, []);

  const trackUserAction = useCallback((actionName: string, details?: Record<string, any>) => {
    analytics.trackEvent({
      category: 'user_action',
      action: actionName,
      ...details,
    });
  }, []);

  return {
    // Core methods
    trackEvent,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackCheckoutStarted,
    trackPurchase,
    trackError,
    
    // Enhanced methods
    trackSearch,
    trackFilterApplied,
    trackWishlistAction,
    trackOutOfStockAction,
    trackPreorder,
    trackStockNotification,
    trackViewSimilarProducts,
    trackPromotionClick,
    trackCategoryView,
    trackBrandView,
    trackPerformanceMetric,
    trackUserAction,
  };
}

// Add TypeScript declaration for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
