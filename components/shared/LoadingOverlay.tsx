'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullScreen?: boolean;
  transparent?: boolean;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  fullScreen = false,
  transparent = false,
  className = '',
}: LoadingOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShow(true);
    } else {
      // Add slight delay before hiding to prevent flash
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className={`
        ${fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10'}
        ${transparent ? 'bg-white/80 backdrop-blur-sm' : 'bg-white/95'}
        flex flex-col items-center justify-center
        transition-all duration-300 ease-out
        ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      aria-live="polite"
      aria-busy={isLoading}
    >
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" color="red" />
        {message && (
          <div className="space-y-2">
            <p className="text-gray-700 font-medium animate-pulse">{message}</p>
            <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 rounded-full animate-[shimmer_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}
      </div>
      
      {/* Optional decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-xara-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-xara-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}
