'use client';

import { Switch } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Toggle({
  enabled,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}: ToggleProps) {
  const sizeClasses = {
    sm: {
      toggle: 'h-5 w-9',
      dot: 'h-4 w-4',
      translate: enabled ? 'translate-x-4' : 'translate-x-0.5',
    },
    md: {
      toggle: 'h-6 w-11',
      dot: 'h-5 w-5',
      translate: enabled ? 'translate-x-5' : 'translate-x-0.5',
    },
    lg: {
      toggle: 'h-7 w-14',
      dot: 'h-6 w-6',
      translate: enabled ? 'translate-x-7' : 'translate-x-0.5',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <Switch.Group>
      <div className={cn('flex items-center', className)}>
        <Switch
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            currentSize.toggle,
            'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            enabled ? 'bg-red-600' : 'bg-gray-200',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          )}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            className={cn(
              currentSize.dot,
              currentSize.translate,
              'inline-block transform rounded-full bg-white transition-transform'
            )}
          />
        </Switch>
        
        {(label || description) && (
          <Switch.Label className="ml-3 space-y-1">
            {label && (
              <span className={cn(
                'text-sm font-medium',
                disabled ? 'text-gray-400' : 'text-gray-900'
              )}>
                {label}
              </span>
            )}
            {description && (
              <p className={cn(
                'text-sm',
                disabled ? 'text-gray-400' : 'text-gray-500'
              )}>
                {description}
              </p>
            )}
          </Switch.Label>
        )}
      </div>
    </Switch.Group>
  );
}

// Toggle with icon variant
interface ToggleWithIconProps extends Omit<ToggleProps, 'label'> {
  iconOn: React.ReactNode;
  iconOff: React.ReactNode;
  ariaLabel: string;
}

export function ToggleWithIcon({
  enabled,
  onChange,
  iconOn,
  iconOff,
  ariaLabel,
  disabled = false,
  size = 'md',
  className,
}: ToggleWithIconProps) {
  const sizeClasses = {
    sm: {
      toggle: 'h-8 w-14',
      dot: 'h-6 w-6',
      translate: enabled ? 'translate-x-6' : 'translate-x-1',
    },
    md: {
      toggle: 'h-10 w-18',
      dot: 'h-8 w-8',
      translate: enabled ? 'translate-x-8' : 'translate-x-1',
    },
    lg: {
      toggle: 'h-12 w-22',
      dot: 'h-10 w-10',
      translate: enabled ? 'translate-x-10' : 'translate-x-1',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <Switch
      checked={enabled}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        currentSize.toggle,
        'relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        enabled ? 'bg-red-600' : 'bg-gray-200',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
    >
      <span className="sr-only">{ariaLabel}</span>
      <span
        className={cn(
          currentSize.dot,
          currentSize.translate,
          'inline-flex items-center justify-center transform rounded-full bg-white transition-transform'
        )}
      >
        {enabled ? iconOn : iconOff}
      </span>
    </Switch>
  );
}
