'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      fullWidth = true,
      variant = 'default',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'block rounded-lg border text-sm transition-all duration-200 outline-none resize-none';
    
    const variantStyles = {
      default: 'border-gray-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
      filled: 'border-transparent bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
      outlined: 'border-gray-300 bg-transparent focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
    };

    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : '';

    return (
      <div className={cn(fullWidth ? 'w-full' : '', 'space-y-2')}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            id={id}
            className={cn(
              baseStyles,
              variantStyles[variant],
              disabledStyles,
              'px-4 py-3 min-h-[100px]',
              error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '',
              fullWidth ? 'w-full' : '',
              className
            )}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            {...props}
          />
        </div>
        
        {error && (
          <p
            id={`${id}-error`}
            className="text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p
            id={`${id}-helper`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
