'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  startTime: number | null;
}

interface UseLoadingOptions {
  minimumDuration?: number;
  simulateProgress?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
}

export function useLoading(options: UseLoadingOptions = {}) {
  const {
    minimumDuration = 300,
    simulateProgress = true,
    onStart,
    onComplete,
  } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: 'Loading...',
    startTime: null,
  });

  const startLoading = useCallback((message?: string) => {
    const startTime = Date.now();
    
    setState({
      isLoading: true,
      progress: 0,
      message: message || 'Loading...',
      startTime,
    });

    onStart?.();

    if (simulateProgress) {
      const interval = setInterval(() => {
        setState(prev => {
          if (!prev.isLoading || prev.progress >= 90) {
            clearInterval(interval);
            return prev;
          }

          // Simulate progress (slows down as it approaches 90%)
          const increment = Math.max(1, 10 - (prev.progress / 10));
          return {
            ...prev,
            progress: Math.min(90, prev.progress + increment),
          };
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [simulateProgress, onStart]);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      ...(message && { message }),
    }));
  }, []);

  const completeLoading = useCallback(() => {
    const { startTime } = state;
    const elapsed = startTime ? Date.now() - startTime : 0;
    const remaining = Math.max(0, minimumDuration - elapsed);

    // Jump to 100%
    setState(prev => ({
      ...prev,
      progress: 100,
    }));

    // Wait for minimum duration or simulate natural completion
    setTimeout(() => {
      setState({
        isLoading: false,
        progress: 0,
        message: 'Loading...',
        startTime: null,
      });
      onComplete?.();
    }, remaining);
  }, [state.startTime, minimumDuration, onComplete]);

  const setLoadingMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  // Auto-detect route changes
  useEffect(() => {
    const handleRouteChange = () => {
      startLoading('Loading page...');
    };

    const handleRouteComplete = () => {
      completeLoading();
    };

    // Simulate route change detection
    const timeout = setTimeout(() => {
      handleRouteComplete();
    }, 500);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams, startLoading, completeLoading]);

  return {
    ...state,
    startLoading,
    updateProgress,
    completeLoading,
    setLoadingMessage,
    isComplete: state.progress >= 100 && !state.isLoading,
  };
}
