export function LoadingFooter() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container-responsive py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Tagline */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gray-700 rounded" />
              <div className="h-6 w-32 bg-gray-700 rounded" />
            </div>
            <div className="h-4 w-48 bg-gray-700 rounded mb-6" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-700 rounded" />
              <div className="h-4 w-40 bg-gray-700 rounded" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="h-6 w-32 bg-gray-700 rounded mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 w-24 bg-gray-700 rounded" />
              ))}
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <div className="h-6 w-48 bg-gray-700 rounded mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 w-32 bg-gray-700 rounded" />
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <div className="h-6 w-40 bg-gray-700 rounded mb-6" />
            <div className="h-10 bg-gray-700 rounded mb-4" />
            <div className="h-10 bg-gray-700 rounded" />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-4 w-16 bg-gray-700 rounded" />
              ))}
            </div>
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 bg-gray-700 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
