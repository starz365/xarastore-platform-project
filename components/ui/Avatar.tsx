import { HTMLAttributes, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/css';
import { User } from 'lucide-react';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  src?: string;
  alt?: string;
  fallback?: string;
  variant?: 'circle' | 'square' | 'rounded';
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
  statusPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const variantClasses = {
  circle: 'rounded-full',
  square: 'rounded',
  rounded: 'rounded-lg',
};

const statusSizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

const statusColorClasses = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const statusPositionClasses = {
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
};

export function Avatar({
  size = 'md',
  src,
  alt = '',
  fallback,
  variant = 'circle',
  status = null,
  statusPosition = 'bottom-right',
  className,
  children,
  ...props
}: AvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderFallback = () => {
    if (fallback) {
      return (
        <span className="font-semibold text-white">
          {getInitials(fallback)}
        </span>
      );
    }
    return <User className="w-1/2 h-1/2 text-white" />;
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center bg-red-600 text-white',
        sizeClasses[size],
        variantClasses[variant],
        'overflow-hidden',
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        renderFallback()
      )}
      
      {status && (
        <span
          className={cn(
            'absolute border-2 border-white rounded-full',
            statusSizeClasses[size],
            statusColorClasses[status],
            statusPositionClasses[statusPosition]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
      
      {children}
    </div>
  );
}

interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
  spacing?: number;
}

export function AvatarGroup({
  children,
  max = 5,
  spacing = -4,
  className,
  ...props
}: AvatarGroupProps) {
  const avatars = React.Children.toArray(children);
  const shouldTruncate = avatars.length > max;
  const visibleAvatars = shouldTruncate ? avatars.slice(0, max - 1) : avatars;
  const remaining = avatars.length - visibleAvatars.length;

  return (
    <div
      className={cn('flex items-center', className)}
      style={{ marginLeft: `${Math.abs(spacing)}px` }}
      {...props}
    >
      {visibleAvatars.map((avatar, index) => (
        <div
          key={index}
          className="border-2 border-white rounded-full"
          style={{ marginLeft: `${spacing}px` }}
        >
          {avatar}
        </div>
      ))}
      
      {shouldTruncate && (
        <div
          className={cn(
            'flex items-center justify-center border-2 border-white rounded-full bg-gray-200',
            'text-gray-600 font-semibold',
            sizeClasses.md // Use medium size for remaining count
          )}
          style={{ marginLeft: `${spacing}px` }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Compound component
Avatar.Group = AvatarGroup;
