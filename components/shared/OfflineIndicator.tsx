'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (isOnline || !show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-lg shadow-lg">
        <WifiOff className="w-5 h-5" />
        <span className="text-sm font-medium">You're offline</span>
        <button
          onClick={() => setShow(false)}
          className="ml-2 text-gray-400 hover:text-white"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
