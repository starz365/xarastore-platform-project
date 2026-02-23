import { HTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/css';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  htmlFor?: string;
}

export function Label({
  children,
  className,
  required = false,
  disabled = false,
  error = false,
  size = 'md',
  htmlFor,
  ...props
}: LabelProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'font-medium text-gray-700 block mb-2',
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        error && 'text-red-600',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 ml-1">*</span>}
    </label>
  );
}

interface LabelDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: 'default' | 'error' | 'success' | 'warning';
}

export function LabelDescription({
  children,
  className,
  variant = 'default',
  ...props
}: LabelDescriptionProps) {
  const variantClasses = {
    default: 'text-gray-500',
    error: 'text-red-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
  };

  return (
    <p
      className={cn('text-sm mt-1', variantClasses[variant], className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Compound component
Label.Description = LabelDescription;
