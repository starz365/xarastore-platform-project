export function LoadingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 py-4">
      <div className="container-responsive">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            </div>
            <nav className="hidden lg:flex items-center space-x-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-6 w-16 bg-gray-200 rounded" />
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="hidden sm:flex space-x-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-10 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
