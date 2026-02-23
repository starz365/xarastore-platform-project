import { Skeleton } from '@/components/ui/Skeleton';

interface CollectionGridSkeletonProps {
  count?: number;
}

export function CollectionGridSkeleton({ count = 12 }: CollectionGridSkeletonProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Image Skeleton */}
          <Skeleton className="h-48 w-full" />
          
          {/* Content Skeleton */}
          <div className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
