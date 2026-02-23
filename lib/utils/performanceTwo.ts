export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  private observers: Set<(metric: string, value: number) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupPerformanceObserver();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  mark(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  measure(startMark: string, endMark: string, name: string): number {
    if (typeof window !== 'undefined' && 'performance' in window) {
      if (performance.getEntriesByName(startMark).length && performance.getEntriesByName(endMark).length) {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name);
        if (entries.length) {
          const duration = entries[0].duration;
          this.measures.set(name, duration);
          this.notifyObservers(name, duration);
          return duration;
        }
      }
    }
    return 0;
  }

  getMetric(name: string): number | undefined {
    return this.measures.get(name);
  }

  getAllMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.measures.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }

  subscribe(callback: (metric: string, value: number) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(metric: string, value: number): void {
    this.observers.forEach(callback => callback(metric, value));
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            this.measures.set('LCP', entry.startTime);
            this.notifyObservers('LCP', entry.startTime);
          } else if (entry.entryType === 'first-input') {
            this.measures.set('FID', entry.startTime);
            this.notifyObservers('FID', entry.startTime);
          } else if (entry.entryType === 'layout-shift') {
            const cls = (entry as any).value;
            this.measures.set('CLS', cls);
            this.notifyObservers('CLS', cls);
          }
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    }
  }

  reportMetrics(): void {
    const metrics = this.getAllMetrics();
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      navigator.sendBeacon('/api/performance', JSON.stringify({
        metrics,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }));
    }
  }

  static measurePageLoad(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        const monitor = PerformanceMonitor.getInstance();
        monitor.measures.set('TTFB', navigationTiming.responseStart - navigationTiming.requestStart);
        monitor.measures.set('FCP', navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart);
        monitor.measures.set('DOMLoad', navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart);
        monitor.measures.set('WindowLoad', navigationTiming.loadEventEnd - navigationTiming.fetchStart);
      }
    }
  }

  static startResourceTiming(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const monitor = PerformanceMonitor.getInstance();
            monitor.measures.set(`resource_${entry.name}`, entry.duration);
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

export function lazyLoadImage(element: HTMLImageElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!element.dataset.src) {
      reject(new Error('No data-src attribute found'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          
          img.onload = () => {
            img.classList.add('loaded');
            observer.unobserve(img);
            resolve();
          };
          
          img.onerror = () => {
            observer.unobserve(img);
            reject(new Error('Failed to load image'));
          };
        }
      });
    });

    observer.observe(element);
  });
}

export function preloadResource(url: string, as: string = 'fetch'): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload ${url}`));
    
    document.head.appendChild(link);
  });
}

export function measureExecutionTime<T extends (...args: any[]) => any>(
  func: T,
  label: string
): (...args: Parameters<T>) => ReturnType<T> {
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const start = performance.now();
    const result = func.apply(this, args);
    const end = performance.now();
    
    PerformanceMonitor.getInstance().measures.set(label, end - start);
    
    return result;
  };
}

export function isSlowNetwork(): boolean {
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType === '2g' || connection.saveData === true;
    }
  }
  return false;
}

export function optimizeForNetwork<T>(fullData: T, slowData: T): T {
  return isSlowNetwork() ? slowData : fullData;
}
