import { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'info' | 'warning' | 'success' | 'error' | 'destructive';
  title?: string;
  description?: string;
  icon?: ReactNode;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantConfig = {
  default: {
    container: 'bg-gray-50 border-gray-200 text-gray-900',
    icon: Info,
    iconColor: 'text-gray-600',
    title: 'text-gray-900',
    description: 'text-gray-700',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: Info,
    iconColor: 'text-blue-600',
    title: 'text-blue-900',
    description: 'text-blue-800',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    title: 'text-yellow-900',
    description: 'text-yellow-800',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-900',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    title: 'text-green-900',
    description: 'text-green-800',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon: XCircle,
    iconColor: 'text-red-600',
    title: 'text-red-900',
    description: 'text-red-800',
  },
  destructive: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon: XCircle,
    iconColor: 'text-red-600',
    title: 'text-red-900',
    description: 'text-red-800',
  },
};

export function Alert({
  variant = 'default',
  title,
  description,
  icon,
  showIcon = true,
  dismissible = false,
  onDismiss,
  className,
  children,
  ...props
}: AlertProps) {
  const config = variantConfig[variant];
  const DefaultIcon = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'relative rounded-lg border p-4',
        config.container,
        className
      )}
      {...props}
    >
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0">
            {icon || <DefaultIcon className={cn('w-5 h-5', config.iconColor)} />}
          </div>
        )}
        
        <div className={cn('flex-1', showIcon && 'ml-3')}>
          {title && (
            <h3 className={cn('font-semibold mb-1', config.title)}>
              {title}
            </h3>
          )}
          
          {description && (
            <p className={cn('text-sm', config.description)}>
              {description}
            </p>
          )}
          
          {children && (
            <div className={cn('mt-2', !title && !description && 'mt-0')}>
              {children}
            </div>
          )}
        </div>

        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'ml-3 flex-shrink-0 p-1 rounded-md hover:bg-black/5',
              'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2'
            )}
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Alert variations for common use cases
export function AlertInfo({ title, description, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="info" title={title} description={description} {...props} />;
}

export function AlertWarning({ title, description, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="warning" title={title} description={description} {...props} />;
}

export function AlertSuccess({ title, description, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="success" title={title} description={description} {...props} />;
}

export function AlertError({ title, description, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="error" title={title} description={description} {...props} />;
}

export function AlertDestructive({ title, description, ...props }: Omit<AlertProps, 'variant'>) {
  return <Alert variant="destructive" title={title} description={description} {...props} />;
}
