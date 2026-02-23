'use client';

import { useEffect, useState } from 'react';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 5000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${
      isOffline 
        ? 'bg-red-600 text-white' 
        : 'bg-green-600 text-white'
    }`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {isOffline ? (
              <>
                <WifiOff className="w-5 h-5" />
                <span className="font-medium">You're offline. Some features may be limited.</span>
              </>
            ) : (
              <>
                <CloudOff className="w-5 h-5" />
                <span className="font-medium">You're back online!</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {isOffline && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center text-sm hover:opacity-80"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry Connection
              </button>
            )}
            <button
              onClick={() => setShowBanner(false)}
              className="opacity-80 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
