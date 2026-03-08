import { cn } from '@/lib/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    />
  );
}

export function TextSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('h-4 w-full', className)}
      {...props}
    />
  );
}

export function AvatarSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('h-12 w-12 rounded-full', className)}
      {...props}
    />
  );
}

export function CardSkeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      <Skeleton className="h-48 w-full rounded-t-lg" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4, className, ...props }: SkeletonProps & { columns?: number }) {
  return (
    <div className={cn('flex space-x-4 p-4', className)} {...props}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <AvatarSkeleton />
        <div className="space-y-2 flex-1">
          <TextSkeleton className="w-48" />
          <TextSkeleton className="w-64" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} columns={3} />
        ))}
      </div>
    </div>
  );
}
