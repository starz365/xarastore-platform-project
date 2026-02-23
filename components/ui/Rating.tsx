import { Star } from 'lucide-react';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export function Rating({
  value,
  max = 5,
  size = 'md',
  showValue = false,
  className = '',
}: RatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const filledStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }).map((_, index) => {
        if (index < filledStars) {
          return (
            <Star
              key={index}
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
            />
          );
        } else if (index === filledStars && hasHalfStar) {
          return (
            <div key={index} className="relative">
              <Star className={`${sizeClasses[size]} text-gray-300`} />
              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`} />
              </div>
            </div>
          );
        } else {
          return (
            <Star
              key={index}
              className={`${sizeClasses[size]} text-gray-300`}
            />
          );
        }
      })}
      {showValue && (
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
