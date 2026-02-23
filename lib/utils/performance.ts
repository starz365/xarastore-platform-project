import { useEffect, useRef } from 'react';


interface PerformanceMetrics {
  dnsLookup: number;
  tcpConnection: number;
  sslNegotiation: number;
  timeToFirstByte: number;
  contentDownload: number;
  domInteractive: number;
  domContentLoaded: number;
  pageLoad: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    dnsLookup: 0,
    tcpConnection: 0,
    sslNegotiation: 0,
    timeToFirstByte: 0,
    contentDownload: 0,
    domInteractive: 0,
    domContentLoaded: 0,
    pageLoad: 0,
  };
  private observers: PerformanceObserver[] = [];
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Capture traditional performance timing
    this.captureTraditionalMetrics();

    // Capture Core Web Vitals
    this.captureCoreWebVitals();

    // Capture user-centric metrics
    this.captureUserMetrics();

    // Capture resource timing
    this.captureResourceMetrics();

    // Monitor network information
    this.monitorNetwork();

    this.isInitialized = true;
  }

  private captureTraditionalMetrics() {
    if (!window.performance || !window.performance.timing) return;

    const timing = window.performance.timing;
    
    this.metrics.dnsLookup = timing.domainLookupEnd - timing.domainLookupStart;
    this.metrics.tcpConnection = timing.connectEnd - timing.connectStart;
    this.metrics.sslNegotiation = timing.connectEnd - timing.secureConnectionStart || 0;
    this.metrics.timeToFirstByte = timing.responseStart - timing.requestStart;
    this.metrics.contentDownload = timing.responseEnd - timing.responseStart;
    this.metrics.domInteractive = timing.domInteractive - timing.navigationStart;
    this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    this.metrics.pageLoad = timing.loadEventEnd - timing.navigationStart;

    // Send to analytics
    this.sendMetricsToAnalytics('traditional', this.metrics);
  }

  private captureCoreWebVitals() {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
      
      this.sendMetricsToAnalytics('lcp', {
        value: this.metrics.largestContentfulPaint,
        url: window.location.href,
      });
    });
    
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      for (const entry of entries) {
        this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        
        this.sendMetricsToAnalytics('fid', {
          value: this.metrics.firstInputDelay,
          url: window.location.href,
          interactionType: entry.name,
        });
      }
    });
    
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      const entries = entryList.getEntries();
      
      for (const entry of entries) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      this.metrics.cumulativeLayoutShift = clsValue;
      
      this.sendMetricsToAnalytics('cls', {
        value: clsValue,
        url: window.location.href,
      });
    });
    
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries[0];
      this.metrics.firstContentfulPaint = fcpEntry.startTime;
      
      this.sendMetricsToAnalytics('fcp', {
        value: this.metrics.firstContentfulPaint,
        url: window.location.href,
      });
    });
    
    fcpObserver.observe({ type: 'paint', buffered: true });

    this.observers.push(lcpObserver, fidObserver, clsObserver, fcpObserver);
  }

  private captureUserMetrics() {
    // Time to Interactive approximation
    const interactiveTime = performance.now();
    
    // Send custom metric
    this.sendMetricsToAnalytics('tti', {
      value: interactiveTime,
      url: window.location.href,
    });

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const blockingTasks = entries.filter(entry => entry.duration > 50);
      
      if (blockingTasks.length > 0) {
        this.sendMetricsToAnalytics('long_tasks', {
          count: blockingTasks.length,
          totalDuration: blockingTasks.reduce((sum, task) => sum + task.duration, 0),
          tasks: blockingTasks.map(task => ({
            duration: task.duration,
            startTime: task.startTime,
            name: task.name,
          })),
        });
      }
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);

    // Monitor memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        this.sendMetricsToAnalytics('memory', {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    }
  }

  private captureResourceMetrics() {
    const resourceObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const slowResources = entries.filter(entry => 
        entry.duration > 1000 || 
        (entry.transferSize && entry.transferSize > 1024 * 100)
      );

      if (slowResources.length > 0) {
        this.sendMetricsToAnalytics('slow_resources', {
          count: slowResources.length,
          resources: slowResources.map(resource => ({
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize,
            type: resource.initiatorType,
          })),
        });
      }
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private monitorNetwork() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.sendMetricsToAnalytics('network', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });

      // Monitor network changes
      connection.addEventListener('change', () => {
        this.sendMetricsToAnalytics('network_change', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });
      });
    }
  }

  private async sendMetricsToAnalytics(type: string, data: any) {
    try {
      // Send to internal analytics
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      // Also send to Google Analytics if configured
      if (window.gtag) {
        window.gtag('event', 'performance_metric', {
          event_category: 'Performance',
          event_label: type,
          value: data.value || 0,
          ...data,
        });
      }
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  measureCustomMetric(name: string, startTime: number) {
    const duration = performance.now() - startTime;
    
    this.sendMetricsToAnalytics('custom_metric', {
      name,
      duration,
      url: window.location.href,
    });

    return duration;
  }

  startMeasurement(name: string) {
    const startTime = performance.now();
    
    return {
      end: () => this.measureCustomMetric(name, startTime),
      mark: () => performance.mark(`${name}_start`),
      measure: (markName: string) => {
        performance.mark(`${name}_end`);
        performance.measure(name, `${name}_start`, `${name}_end`);
      },
    };
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper function to measure page section loading
export function measureSectionLoad(sectionName: string) {
  const startTime = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - startTime;
      performanceMonitor.sendMetricsToAnalytics('section_load', {
        section: sectionName,
        duration,
        url: window.location.href,
      });
      return duration;
    },
  };
}

// Helper function to measure API call performance
export function measureApiCall(apiName: string) {
  const startTime = performance.now();
  
  return {
    end: (success: boolean, statusCode?: number) => {
      const duration = performance.now() - startTime;
      performanceMonitor.sendMetricsToAnalytics('api_call', {
        api: apiName,
        duration,
        success,
        statusCode,
        url: window.location.href,
      });
      return duration;
    },
  };
}

// Helper function to measure image loading performance
export function measureImageLoad(imageUrl: string) {
  const startTime = performance.now();
  
  return {
    end: (success: boolean, naturalDimensions?: { width: number; height: number }) => {
      const duration = performance.now() - startTime;
      performanceMonitor.sendMetricsToAnalytics('image_load', {
        imageUrl,
        duration,
        success,
        dimensions: naturalDimensions,
        url: window.location.href,
      });
      return duration;
    },
  };
}







// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private thresholds = {
    fcp: 1800, // First Contentful Paint (ms)
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100,  // First Input Delay (ms)
    cls: 0.1,  // Cumulative Layout Shift
    tti: 3800, // Time to Interactive (ms)
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initWebVitals();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initWebVitals() {
    if ('PerformanceObserver' in window) {
      // Monitor LCP
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor FID
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fid', entry.duration);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor CLS
      let clsValue = 0;
      let clsEntries: any[] = [];

      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsEntries.push(entry);
            clsValue += entry.value;
            this.recordMetric('cls', clsValue);
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)?.push(value);

    // Check thresholds
    const threshold = this.thresholds[name as keyof typeof this.thresholds];
    if (threshold && value > threshold) {
      console.warn(`Performance warning: ${name} = ${value}ms exceeds threshold ${threshold}ms`);
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(name, value, threshold);
      }
    }
  }

  getMetricAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  getPerformanceScore(): number {
    const weights = {
      fcp: 0.15,
      lcp: 0.25,
      fid: 0.15,
      cls: 0.25,
      tti: 0.2,
    };

    let score = 100;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      const avg = this.getMetricAverage(metric);
      const threshold = this.thresholds[metric as keyof typeof this.thresholds];
      
      if (avg > threshold) {
        const penalty = ((avg - threshold) / threshold) * weight * 100;
        score -= penalty;
      }
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async sendToAnalytics(metric: string, value: number, threshold: number) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric,
          value,
          threshold,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }
}

// React hook for measuring component render performance
export function useRenderPerformance(name: string) {
  const startTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTimeRef.current;
      
      const monitor = PerformanceMonitor.getInstance();
      monitor.recordMetric(`${name}_render`, duration);

      if (duration > 100) {
        console.warn(`Slow render detected for ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  }, [name]);
}

// Utility to simulate loading for testing
export function simulateLoading(duration: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Lazy load images
export function lazyLoadImages() {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.1,
  });

  images.forEach((img) => imageObserver.observe(img));
}
