// Server Component – zero JS, zero hydration risk

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-red-50">
      {/* Logo */}
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-r from-red-500 to-red-700
                        flex items-center justify-center
                        animate-pulse shadow-lg">
          <span className="text-4xl font-bold text-white">X</span>
        </div>

        {/* Decorative dots */}
        <span className="absolute -top-3 -left-3 w-3 h-3 bg-red-400 rounded-full animate-bounce" />
        <span className="absolute -top-2 -right-2 w-2.5 h-2.5 bg-red-300 rounded-full animate-bounce [animation-delay:200ms]" />
        <span className="absolute -bottom-3 -right-3 w-3 h-3 bg-red-500 rounded-full animate-bounce [animation-delay:400ms]" />
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 animate-pulse">
          Xarastore
        </h1>
        <p className="text-gray-600">it’s a deal</p>
      </div>

      {/* Progress bar */}
      <div className="w-64 mt-8">
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-red-400 via-red-500 to-red-600
                          animate-loading-bar" />
        </div>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Loading your experience…
        </p>
      </div>
    </div>
  );
}
