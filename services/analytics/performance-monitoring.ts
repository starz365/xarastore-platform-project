import { supabase } from '@/lib/supabase/client';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  page?: string;
  userId?: string;
  device?: string;
  network?: string;
}

interface CoreWebVitals {
  cls: number;
  fid: number;
  lcp: number;
  ttfb: number;
  fcp: number;
  inp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metricsBuffer: PerformanceMetric[] = [];
  private readonly bufferSize = 50;
  private readonly flushInterval = 10000; // 10 seconds
  private isFlushing = false;

  private constructor() {
    this.startAutoFlush();
    this.setupPerformanceObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private startAutoFlush() {
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  private setupPerformanceObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          unit: 'ms',
          timestamp: new Date().toISOString(),
        });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            unit: 'ms',
            timestamp: new Date().toISOString(),
          });
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {}

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.recordMetric({
          name: 'CLS',
          value: clsValue,
          unit: 'score',
          timestamp: new Date().toISOString(),
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}

    // Time to First Byte
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          this.recordMetric({
            name: 'TTFB',
            value: entry.responseStart,
            unit: 'ms',
            timestamp: new Date().toISOString(),
          });
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
    } catch (e) {}
  }

  recordMetric(metric: PerformanceMetric) {
    const enrichedMetric = {
      ...metric,
      page: window.location.pathname,
      device: this.getDeviceInfo(),
      network: this.getNetworkInfo(),
      timestamp: new Date().toISOString(),
    };

    this.metricsBuffer.push(enrichedMetric);

    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}: ${metric.value}${metric.unit}`);
    }
  }

  async recordCustomMetric(name: string, value: number, unit: string = 'ms') {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
    });
  }

  async recordPageLoad() {
    if (typeof window === 'undefined') return;

    const navigationTiming = performance.getEntriesByType('navigation')[0] as any;
    if (navigationTiming) {
      const metrics = {
        dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
        tcp: navigationTiming.connectEnd - navigationTiming.connectStart,
        ssl: navigationTiming.connectEnd - navigationTiming.secureConnectionStart || 0,
        ttfb: navigationTiming.responseStart - navigationTiming.requestStart,
        download: navigationTiming.responseEnd - navigationTiming.responseStart,
        domLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
        total: navigationTiming.loadEventEnd - navigationTiming.startTime,
      };

      Object.entries(metrics).forEach(([name, value]) => {
        this.recordMetric({
          name: `page_load_${name}`,
          value,
          unit: 'ms',
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  async recordApiCall(endpoint: string, duration: number, status: number) {
    this.recordMetric({
      name: 'api_call',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      page: endpoint,
    });

    // Record status code distribution
    this.recordMetric({
      name: `api_status_${status}`,
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
    });
  }

  async recordDatabaseQuery(query: string, duration: number, rows: number) {
    this.recordMetric({
      name: 'db_query',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
    });

    // Record slow queries
    if (duration > 1000) {
      this.recordMetric({
        name: 'slow_query',
        value: duration,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        page: query.substring(0, 100),
      });
    }
  }

  private async flushMetrics() {
    if (this.isFlushing || this.metricsBuffer.length === 0) return;

    this.isFlushing = true;
    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Store in Supabase
      const { error } = await supabase
        .from('performance_metrics')
        .insert(
          metricsToFlush.map(metric => ({
            ...metric,
            session_id: this.getSessionId(),
            user_agent: navigator.userAgent,
          }))
        );

      if (error) throw error;

      // Send to external analytics
      await this.sendToExternalAnalytics(metricsToFlush);

    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendToExternalAnalytics(metrics: PerformanceMetric[]) {
    if (!process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) return;

    try {
      const coreWebVitals = this.calculateCoreWebVitals(metrics);

      await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance',
          data: {
            vitals: coreWebVitals,
            metrics: metrics.slice(0, 10), // Send sample
            timestamp: new Date().toISOString(),
            url: window.location.href,
          },
        }),
      });
    } catch (error) {
      // Silently fail for external analytics
    }
  }

  private calculateCoreWebVitals(metrics: PerformanceMetric[]): CoreWebVitals {
    const vitals: CoreWebVitals = {
      cls: 0,
      fid: 0,
      lcp: 0,
      ttfb: 0,
      fcp: 0,
      inp: 0,
    };

    metrics.forEach(metric => {
      switch (metric.name) {
        case 'CLS':
          vitals.cls = metric.value;
          break;
        case 'FID':
          vitals.fid = metric.value;
          break;
        case 'LCP':
          vitals.lcp = metric.value;
          break;
        case 'TTFB':
          vitals.ttfb = metric.value;
          break;
        case 'FCP':
          vitals.fcp = metric.value;
          break;
        case 'INP':
          vitals.inp = metric.value;
          break;
      }
    });

    return vitals;
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  private getNetworkInfo(): string {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      return conn.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  }

  async getPerformanceReport(startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const report = {
      summary: {
        totalMetrics: data.length,
        avgLCP: this.calculateAverage(data, 'LCP'),
        avgFID: this.calculateAverage(data, 'FID'),
        avgCLS: this.calculateAverage(data, 'CLS'),
        slowestPage: this.findSlowestPage(data),
      },
      trends: this.calculateTrends(data),
      recommendations: this.generateRecommendations(data),
    };

    return report;
  }

  private calculateAverage(metrics: any[], name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }

  private findSlowestPage(metrics: any[]): string {
    const pageTimes = metrics.reduce((acc, metric) => {
      if (!acc[metric.page]) acc[metric.page] = { total: 0, count: 0 };
      acc[metric.page].total += metric.value;
      acc[metric.page].count += 1;
      return acc;
    }, {});

    let slowestPage = '';
    let maxAvg = 0;

    Object.entries(pageTimes).forEach(([page, data]: [string, any]) => {
      const avg = data.total / data.count;
      if (avg > maxAvg) {
        maxAvg = avg;
        slowestPage = page;
      }
    });

    return slowestPage;
  }

  private calculateTrends(metrics: any[]) {
    const hourly = metrics.reduce((acc, metric) => {
      const hour = new Date(metric.timestamp).getHours();
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(metric.value);
      return acc;
    }, {} as Record<number, number[]>);

    return Object.entries(hourly).map(([hour, values]) => ({
      hour: parseInt(hour),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length,
    })).sort((a, b) => a.hour - b.hour);
  }

  private generateRecommendations(metrics: any[]): string[] {
    const recommendations: string[] = [];
    const avgLCP = this.calculateAverage(metrics, 'LCP');
    const avgFID = this.calculateAverage(metrics, 'FID');
    const avgCLS = this.calculateAverage(metrics, 'CLS');

    if (avgLCP > 2500) {
      recommendations.push('Optimize Largest Contentful Paint: Consider lazy-loading images, optimizing server response times.');
    }

    if (avgFID > 100) {
      recommendations.push('Improve First Input Delay: Reduce JavaScript execution time, break up long tasks.');
    }

    if (avgCLS > 0.1) {
      recommendations.push('Reduce Cumulative Layout Shift: Specify dimensions for images and ads, avoid inserting content above existing content.');
    }

    return recommendations;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
