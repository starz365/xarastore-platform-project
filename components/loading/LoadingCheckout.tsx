export function LoadingCheckout() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Progress Steps */}
            <div className="border-b border-gray-200">
              <div className="flex">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-1 text-center py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full" />
                      <div className="h-4 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
              <div>
                <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i}>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                      <div className="h-10 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Security Badges */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded" />
                <div className="h-6 w-24 bg-gray-200 rounded" />
              </div>
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
