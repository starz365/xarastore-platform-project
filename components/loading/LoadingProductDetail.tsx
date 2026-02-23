export function LoadingProductDetail() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center space-x-2">
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-2 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="flex space-x-2 mt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-16 h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-2 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>

          <div className="h-8 bg-gray-200 rounded w-3/4" />

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-5 w-5 bg-gray-200 rounded" />
              ))}
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-2 bg-gray-200 rounded" />
            <div className="h-4 w-24 bg-gray-200 rounded" />
          </div>

          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-32" />
            <div className="h-6 w-24 bg-gray-200 rounded" />
          </div>

          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 bg-gray-200 rounded-full" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>

          {/* Variants */}
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded" />
              ))}
            </div>
          </div>

          {/* Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-l" />
                <div className="w-16 h-10 bg-gray-200" />
                <div className="w-10 h-10 bg-gray-200 rounded-r" />
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded" />
            </div>
            <div className="h-12 bg-gray-200 rounded" />
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            {['Description', 'Specifications', 'Reviews', 'Q&A'].map((tab) => (
              <div key={tab} className="py-4 flex items-center">
                <div className="h-6 w-24 bg-gray-200 rounded" />
                {tab === 'Reviews' && (
                  <div className="ml-2 h-6 w-8 bg-gray-200 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="py-8">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
