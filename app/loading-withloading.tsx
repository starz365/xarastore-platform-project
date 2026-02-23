export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-red-50">
      {/* Animated Logo */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-red-700 rounded-2xl flex items-center justify-center animate-pulse">
          <div className="relative">
            {/* Pulsing ring */}
            <div className="absolute inset-0 border-4 border-white/30 rounded-full animate-ping"></div>
            {/* X logo */}
            <span className="text-4xl font-bold text-white relative z-10">X</span>
          </div>
        </div>
        
        {/* Floating particles */}
        <div className="absolute -top-4 -left-4 w-4 h-4 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute -bottom-3 -left-3 w-3.5 h-3.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.7s' }}></div>
      </div>

      {/* Loading text with animation */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900 animate-pulse">Xarastore</h1>
          <div className="flex space-x-1">
            <span className="text-red-600 animate-bounce" style={{ animationDelay: '0s' }}>.</span>
            <span className="text-red-600 animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="text-red-600 animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
          </div>
        </div>
        <p className="text-gray-600 animate-pulse">it's a deal</p>
      </div>

      {/* Progress bar */}
      <div className="w-64 max-w-xs mt-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-400 via-red-500 to-red-600 rounded-full animate-[shimmer_2s_ease-in-out_infinite]"></div>
        </div>
        <div className="mt-2 text-sm text-gray-500 text-center animate-pulse">
          Loading your experience...
        </div>
      </div>

      {/* Loading indicators */}
      <div className="mt-12 grid grid-cols-3 gap-6">
        {['Products', 'Deals', 'Cart'].map((item, index) => (
          <div key={item} className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Optional: Add a subtle gradient animation in background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-24 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_4s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_4s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
            width: 10%;
          }
          50% {
            transform: translateX(0%);
            width: 60%;
          }
          100% {
            transform: translateX(100%);
            width: 10%;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
