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
  private thresholds = {
    fcp: 1800, // First Contentful Paint (ms)
    lcp: 2500, // Largest Contentful Paint (ms)
    fid: 100,  // First Input Delay (ms)
    cls: 0.1,  // Cumulative Layout Shift
    tti: 3800, // Time to Interactive (ms)
  };
  private metricsStore: Map<string, number[]> = new Map();
  private slowQueries: Array<{ operation: string; duration: number; timestamp: number }> = [];

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

    // Record metrics for performance score
    this.recordMetric('fcp', this.metrics.firstContentfulPaint || 0);
    this.recordMetric('lcp', this.metrics.largestContentfulPaint || 0);
    this.recordMetric('fid', this.metrics.firstInputDelay || 0);
    this.recordMetric('cls', this.metrics.cumulativeLayoutShift || 0);
    this.recordMetric('tti', this.metrics.domInteractive);

    // Send to analytics
    this.sendMetricsToAnalytics('traditional', this.metrics);
  }

  private captureCoreWebVitals() {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
      
      this.recordMetric('lcp', this.metrics.largestContentfulPaint);
      this.checkThreshold('lcp', this.metrics.largestContentfulPaint);
      
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
        
        this.recordMetric('fid', this.metrics.firstInputDelay);
        this.checkThreshold('fid', this.metrics.firstInputDelay);
        
        this.sendMetricsToAnalytics('fid', {
          value: this.metrics.firstInputDelay,
          url: window.location.href,
          interactionType: entry.name,
        });
      }
    });
    
    fidObserver.observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      
      for (const entry of entries) {
        if (!(entry as any).hadRecentInput) {
          clsEntries.push(entry);
          clsValue += (entry as any).value;
          this.metrics.cumulativeLayoutShift = clsValue;
          
          this.recordMetric('cls', clsValue);
          this.checkThreshold('cls', clsValue);
        }
      }
      
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
      
      this.recordMetric('fcp', this.metrics.firstContentfulPaint);
      this.checkThreshold('fcp', this.metrics.firstContentfulPaint);
      
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

        // Record each long task
        blockingTasks.forEach(task => {
          this.recordMetric('long_task', task.duration);
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

        // Record memory usage
        this.recordMetric('memory_used', memory.usedJSHeapSize / (1024 * 1024)); // MB
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
            name: resource.name.split('/').pop(), // Just filename
            duration: resource.duration,
            size: resource.transferSize,
            type: resource.initiatorType,
          })),
        });

        // Record slowest resource
        const slowest = slowResources.reduce((max, curr) => 
          curr.duration > max.duration ? curr : max
        );
        this.recordMetric('slowest_resource', slowest.duration);
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

      this.recordMetric('network_rtt', connection.rtt);
      this.recordMetric('network_downlink', connection.downlink);

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
      }).catch(() => {}); // Silently fail

      // Also send to Google Analytics if configured
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'performance_metric', {
          event_category: 'Performance',
          event_label: type,
          value: data.value || 0,
          ...data,
        });
      }
    } catch (error) {
      // Silent fail in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send performance metrics:', error);
      }
    }
  }

  private checkThreshold(metric: string, value: number) {
    const threshold = this.thresholds[metric as keyof typeof this.thresholds];
    if (threshold && value > threshold) {
      console.warn(`⚠️ Performance warning: ${metric} = ${value.toFixed(2)}${metric === 'cls' ? '' : 'ms'} exceeds threshold ${threshold}${metric === 'cls' ? '' : 'ms'}`);
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendMetricsToAnalytics('threshold_exceeded', {
          metric,
          value,
          threshold,
          url: window.location.href,
        });
      }
    }
  }

  recordMetric(name: string, value: number) {
    if (!this.metricsStore.has(name)) {
      this.metricsStore.set(name, []);
    }
    this.metricsStore.get(name)?.push(value);
    
    // Keep only last 100 values
    const values = this.metricsStore.get(name);
    if (values && values.length > 100) {
      this.metricsStore.set(name, values.slice(-100));
    }
  }

  getMetricAverage(name: string): number {
    const values = this.metricsStore.get(name);
    if (!values || values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  getMetricMedian(name: string): number {
    const values = this.metricsStore.get(name);
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  getMetric95thPercentile(name: string): number {
    const values = this.metricsStore.get(name);
    if (!values || values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[index];
  }

  getPerformanceScore(): number {
    const weights = {
      fcp: 0.15,
      lcp: 0.25,
      fid: 0.15,
      cls: 0.25,
      tti: 0.20,
    };

    let score = 100;
    
    Object.entries(weights).forEach(([metric, weight]) => {
      const avg = this.getMetricAverage(metric);
      const threshold = this.thresholds[metric as keyof typeof this.thresholds];
      
      if (avg > threshold) {
        const penalty = ((avg - threshold) / threshold) * weight * 100;
        score -= Math.min(penalty, weight * 100);
      }
    });

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [metric, values] of this.metricsStore) {
      if (values.length > 0) {
        summary[metric] = {
          average: this.getMetricAverage(metric),
          median: this.getMetricMedian(metric),
          p95: this.getMetric95thPercentile(metric),
          count: values.length,
        };
      }
    }
    
    return summary;
  }

  measureCustomMetric(name: string, startTime: number) {
    const duration = performance.now() - startTime;
    
    this.recordMetric(name, duration);
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
        
        const entries = performance.getEntriesByName(name);
        if (entries.length > 0) {
          this.recordMetric(name, entries[0].duration);
        }
      },
    };
  }

  /**
   * Track slow database operations
   */
  trackSlowQuery(operation: string, duration: number) {
    if (duration > 1000) { // 1 second
      this.slowQueries.push({ operation, duration, timestamp: Date.now() });
      
      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
      
      console.warn(`🐌 Slow query detected: ${operation} took ${duration.toFixed(2)}ms`);
      
      this.sendMetricsToAnalytics('slow_query', {
        operation,
        duration,
        url: window.location.href,
      });
    }
  }

  getSlowQueries() {
    return [...this.slowQueries];
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics() {
    this.metricsStore.clear();
    this.slowQueries = [];
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper function to measure page section loading
export function measureSectionLoad(sectionName: string) {
  const startTime = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`section_${sectionName}`, duration);
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
      performanceMonitor.recordMetric(`api_${apiName}`, duration);
      performanceMonitor.trackSlowQuery(`API: ${apiName}`, duration);
      
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
      performanceMonitor.recordMetric('image_load', duration);
      
      performanceMonitor.sendMetricsToAnalytics('image_load', {
        imageUrl: imageUrl.split('/').pop(),
        duration,
        success,
        dimensions: naturalDimensions,
        url: window.location.href,
      });
      return duration;
    },
  };
}

// React hook for measuring component render performance
export function useRenderPerformance(name: string) {
  const startTimeRef = useRef(0);
  const renderCountRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    renderCountRef.current += 1;

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTimeRef.current;
      
      performanceMonitor.recordMetric(`${name}_render`, duration);
      performanceMonitor.recordMetric(`${name}_render_count`, renderCountRef.current);

      if (duration > 100) {
        console.warn(`⚠️ Slow render detected for ${name}: ${duration.toFixed(2)}ms (render #${renderCountRef.current})`);
      }
      
      // Check for excessive re-renders
      if (renderCountRef.current > 10) {
        console.warn(`⚠️ Excessive re-renders detected for ${name}: ${renderCountRef.current} renders`);
      }
    };
  });
}

// React hook for measuring component mount time
export function useMountPerformance(name: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`${name}_mount`, duration);
      
      if (duration > 100) {
        console.warn(`⚠️ Slow mount detected for ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  }, [name]);
}

// React hook for measuring data fetching performance
export function useDataFetchPerformance<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const startTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    
    const measure = async () => {
      try {
        const result = await fetchFn();
        const duration = performance.now() - startTimeRef.current;
        
        performanceMonitor.recordMetric('data_fetch', duration);
        
        if (duration > 500) {
          console.warn(`⚠️ Slow data fetch: ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTimeRef.current;
        performanceMonitor.recordMetric('data_fetch_error', duration);
        throw error;
      }
    };
    
    measure();
  }, dependencies);
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
  let lastResult: ReturnType<T>;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
    return lastResult;
  };
}

// Lazy load images with IntersectionObserver
export function lazyLoadImages() {
  if (typeof window === 'undefined') return () => {};

  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.getAttribute('data-src');
        
        if (src) {
          const measure = measureImageLoad(src);
          img.src = src;
          img.onload = () => {
            measure.end(true, {
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.onerror = () => measure.end(false);
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

  return () => imageObserver.disconnect();
}

// Utility to measure function execution time
export function measureExecutionTime<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          performanceMonitor.recordMetric(`exec_${name}`, duration);
          performanceMonitor.trackSlowQuery(`Function: ${name}`, duration);
        });
      }
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`exec_${name}`, duration);
      
      if (duration > 100) {
        performanceMonitor.trackSlowQuery(`Function: ${name}`, duration);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`exec_${name}_error`, duration);
      throw error;
    }
  }) as T;
}

// Batch processor for performance optimization
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private readonly maxSize: number;
  private readonly delay: number;
  private readonly processor: (items: T[]) => Promise<R[]>;
  private pendingResolves: Map<T, { resolve: (value: R) => void; reject: (error: any) => void }> = new Map();

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: { maxSize?: number; delay?: number } = {}
  ) {
    this.processor = processor;
    this.maxSize = options.maxSize || 50;
    this.delay = options.delay || 100;
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(item);
      this.pendingResolves.set(item, { resolve, reject });

      if (this.batch.length >= this.maxSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  private async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.batch.length === 0) return;

    const measure = measureExecutionTime(
      async () => {
        const items = [...this.batch];
        this.batch = [];

        try {
          const results = await this.processor(items);
          
          items.forEach((item, index) => {
            const pending = this.pendingResolves.get(item);
            if (pending) {
              pending.resolve(results[index]);
              this.pendingResolves.delete(item);
            }
          });
        } catch (error) {
          items.forEach((item) => {
            const pending = this.pendingResolves.get(item);
            if (pending) {
              pending.reject(error);
              this.pendingResolves.delete(item);
            }
          });
          throw error;
        }
      },
      'batch_processor'
    );

    measure();
  }

  getPendingCount(): number {
    return this.batch.length;
  }

  clear() {
    this.batch = [];
    this.pendingResolves.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Wait for page load to capture all metrics
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.initialize();
      
      // Log performance score in development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          const score = performanceMonitor.getPerformanceScore();
          const summary = performanceMonitor.getMetricsSummary();
          console.log(`📊 Performance Score: ${score}/100`);
          console.log('📈 Performance Summary:', summary);
        }, 3000);
      }
    }, 1000);
  });
}

export default performanceMonitor;
