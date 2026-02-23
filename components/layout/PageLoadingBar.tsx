'use client';

import { useEffect, useState } from 'react';
import { useLoading } from '@/lib/hooks/useLoading';
import { usePathname, useSearchParams } from 'next/navigation';

export function PageLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const { isLoading, progress, message } = useLoading({
    minimumDuration: 400,
    simulateProgress: true,
  });

  // Detect navigation
  useEffect(() => {
    const handleStart = () => {
      setIsNavigating(true);
    };

    const handleEnd = () => {
      setIsNavigating(false);
    };

    // Simulate navigation events
    const timeout = setTimeout(() => {
      handleEnd();
    }, 600);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  if (!isLoading && !isNavigating) return null;

  const currentProgress = isNavigating ? Math.min(90, progress) : progress;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress bar */}
      <div className="h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-700 transition-all duration-300 ease-out"
           style={{ 
             width: `${currentProgress}%`,
             opacity: isLoading || isNavigating ? 1 : 0,
             transform: `translateX(${currentProgress - 100}%)`,
           }}>
        {/* Animated shimmer effect */}
        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
      </div>

      {/* Loading message (only show for longer loads) */}
      {(isLoading || (isNavigating && currentProgress > 30)) && (
        <div className="absolute top-2 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200 animate-fade-in">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-700">{message}</span>
            <span className="text-xs text-gray-500 ml-1">({Math.round(currentProgress)}%)</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
