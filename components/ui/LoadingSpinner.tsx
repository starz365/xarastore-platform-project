import { SVGProps } from 'react';
import { cn } from '@/lib/utils/css';

interface LoadingSpinnerProps extends SVGProps<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'secondary';
  label?: string;
}

export function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
  label = 'Loading...',
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const variantClasses = {
    default: 'text-gray-400',
    primary: 'text-red-600',
    secondary: 'text-gray-600',
  };

  return (
    <div className="inline-flex items-center" role="status">
      <svg
        className={cn('animate-spin', sizeClasses[size], variantClasses[variant], className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}
