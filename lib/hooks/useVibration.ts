import { useCallback } from 'react';

export function useVibration() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[]): boolean => {
    if (!isSupported) return false;

    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.error('Vibration failed:', error);
      return false;
    }
  }, [isSupported]);

  const vibrateSuccess = useCallback(() => {
    return vibrate([100, 50, 100]);
  }, [vibrate]);

  const vibrateError = useCallback(() => {
    return vibrate([200, 100, 200, 100, 200]);
  }, [vibrate]);

  const vibrateNotification = useCallback(() => {
    return vibrate([100, 200, 100]);
  }, [vibrate]);

  const cancelVibration = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  return {
    isSupported,
    vibrate,
    vibrateSuccess,
    vibrateError,
    vibrateNotification,
    cancelVibration,
  };
}
