import { useState, useEffect, useRef } from 'react';

interface UseIdleOptions {
  timeout?: number;
  events?: string[];
  initialState?: boolean;
}

export function useIdle(options: UseIdleOptions = {}): boolean {
  const {
    timeout = 30000,
    events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'],
    initialState = false,
  } = options;

  const [isIdle, setIsIdle] = useState(initialState);
  const timerRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsIdle(false);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleEvent = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [events, resetTimer]);

  return isIdle;
}
