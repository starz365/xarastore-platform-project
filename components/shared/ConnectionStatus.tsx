'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Activity, Battery, Signal } from 'lucide-react';

interface NetworkInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  type: string;
}

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        setNetworkInfo({
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0,
          saveData: conn.saveData || false,
          type: conn.type || 'unknown',
        });
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleConnectionChange = () => {
      updateNetworkInfo();
    };

    setIsOnline(navigator.onLine);
    updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      conn.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        const conn = (navigator as any).connection;
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  const getConnectionQuality = () => {
    if (!networkInfo) return 'Unknown';
    
    const speed = networkInfo.downlink;
    if (speed > 5) return 'Excellent';
    if (speed > 2) return 'Good';
    if (speed > 0.5) return 'Fair';
    return 'Poor';
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'text-red-600';
    
    const quality = getConnectionQuality();
    switch (quality) {
      case 'Excellent': return 'text-green-600';
      case 'Good': return 'text-blue-600';
      case 'Fair': return 'text-yellow-600';
      case 'Poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    
    const quality = getConnectionQuality();
    switch (quality) {
      case 'Excellent': return <Signal className="w-4 h-4" />;
      case 'Good': return <Wifi className="w-4 h-4" />;
      case 'Fair': return <Activity className="w-4 h-4" />;
      case 'Poor': return <Battery className="w-4 h-4" />;
      default: return <Wifi className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          isOnline ? 'bg-gray-100 hover:bg-gray-200' : 'bg-red-100 hover:bg-red-200'
        } transition-colors`}
        aria-label="Connection status"
      >
        {getConnectionIcon()}
        <span className={`text-sm font-medium ${getConnectionColor()}`}>
          {isOnline ? getConnectionQuality() : 'Offline'}
        </span>
      </button>

      {showDetails && networkInfo && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`text-sm font-medium ${getConnectionColor()}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Speed</span>
              <span className="text-sm font-medium">
                {networkInfo.downlink.toFixed(1)} Mbps
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Latency</span>
              <span className="text-sm font-medium">
                {networkInfo.rtt}ms
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Type</span>
              <span className="text-sm font-medium capitalize">
                {networkInfo.effectiveType}
              </span>
            </div>
            
            {networkInfo.saveData && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Saver</span>
                <span className="text-sm font-medium text-yellow-600">
                  Enabled
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Connection information helps optimize your experience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
