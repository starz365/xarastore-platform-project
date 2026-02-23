'use client';

interface LoadingProgressProps {
  routeInfo: any;
}

export function LoadingProgress({ routeInfo }: LoadingProgressProps) {
  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
      <div 
        className="h-full bg-red-600 transition-all duration-300 ease-out"
        style={{
          width: '100%',
          animation: 'progress 2s ease-in-out infinite',
        }}
      />
      <div className="fixed top-4 right-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span>{routeInfo.loadingMessage}</span>
        </div>
        {routeInfo.loadingHint && (
          <div className="text-xs text-gray-300 mt-1">
            {routeInfo.loadingHint}
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes progress {
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
