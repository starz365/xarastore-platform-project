import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  memory: PerformanceMemory | null;
  networkInfo: NetworkInformation | null;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    memory: null,
    networkInfo: null,
  });

  const updateMetrics = useCallback(() => {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    const lcp = lcpEntries[lcpEntries.length - 1];

    const fidEntries = performance.getEntriesByType('first-input');
    const fid = fidEntries[0];

    const clsEntries = performance.getEntriesByType('layout-shift');
    const cls = clsEntries.reduce((sum, entry) => sum + (entry as any).value, 0);

    const navEntries = performance.getEntriesByType('navigation');
    const ttfb = navEntries[0] ? (navEntries[0] as any).responseStart : null;

    const memory = (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
    } : null;

    const networkInfo = (navigator as any).connection || null;

    setMetrics({
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      fid: fid ? Math.round((fid as any).processingStart - (fid as any).startTime) : null,
      cls: Math.round(cls * 1000) / 1000,
      ttfb: ttfb ? Math.round(ttfb) : null,
      memory,
      networkInfo,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    updateMetrics();

    const observer = new PerformanceObserver((list) => {
      updateMetrics();
    });

    try {
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      console.warn('Performance Observer not supported:', e);
    }

    const interval = setInterval(updateMetrics, 10000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [updateMetrics]);

  return metrics;
}
