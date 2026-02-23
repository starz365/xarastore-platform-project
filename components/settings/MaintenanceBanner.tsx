'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { settingsManager } from '@/lib/utils/settings';

export function MaintenanceBanner() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    checkMaintenanceMode();
    
    // Check every minute
    const interval = setInterval(checkMaintenanceMode, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      const settings = await settingsManager.getSiteSettings();
      setIsMaintenance(settings.maintenance_mode);
      setMessage(settings.maintenance_message || '');
    } catch (error) {
      console.error('Failed to check maintenance mode:', error);
    }
  };

  if (!isMaintenance || !isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="container-responsive">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-800 font-medium">Maintenance Mode</p>
              {message && (
                <p className="text-yellow-700 text-sm mt-1">{message}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-yellow-600 hover:text-yellow-800 ml-4 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
