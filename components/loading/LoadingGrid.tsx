interface LoadingGridProps {
  count?: number;
  showTimer?: boolean;
}

export function LoadingGrid({ count = 8, showTimer = false }: LoadingGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
          <div className="aspect-square bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-16" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            {showTimer && (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            )}
            <div className="flex space-x-2 pt-2">
              <div className="h-10 flex-1 bg-gray-200 rounded" />
              <div className="h-10 w-10 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
