import { useState, useEffect, useRef } from 'react';

export function useWakeLock() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = async () => {
    if (!isSupported) {
      setError(new Error('Screen Wake Lock API not supported'));
      return false;
    }

    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setIsActive(true);
      setError(null);

      wakeLockRef.current.addEventListener('release', () => {
        setIsActive(false);
      });

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to acquire wake lock'));
      setIsActive(false);
      return false;
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to release wake lock'));
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        releaseWakeLock();
      }
    };
  }, []);

  return {
    isSupported,
    isActive,
    error,
    requestWakeLock,
    releaseWakeLock,
  };
}
