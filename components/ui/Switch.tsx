'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/css';

interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  labelPosition?: 'left' | 'right';
  labelClassName?: string;
  thumbClassName?: string;
  trackClassName?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({
    checked: controlledChecked,
    defaultChecked = false,
    onCheckedChange,
    disabled = false,
    size = 'md',
    variant = 'default',
    showLabel = false,
    label,
    labelPosition = 'right',
    labelClassName,
    thumbClassName,
    trackClassName,
    className,
    ...props
  }, ref) => {
    const [unchecked, setUnchecked] = useState(defaultChecked);
    
    const isControlled = controlledChecked !== undefined;
    const checked = isControlled ? controlledChecked : unchecked;

    const sizeClasses = {
      sm: {
        container: 'w-8 h-4',
        thumb: 'w-3 h-3',
        translate: 'translate-x-4',
      },
      md: {
        container: 'w-11 h-6',
        thumb: 'w-5 h-5',
        translate: 'translate-x-5',
      },
      lg: {
        container: 'w-14 h-7',
        thumb: 'w-6 h-6',
        translate: 'translate-x-7',
      },
    };

    const variantClasses = {
      default: {
        on: 'bg-red-600',
        off: 'bg-gray-300',
        thumb: 'bg-white',
      },
      primary: {
        on: 'bg-blue-600',
        off: 'bg-gray-300',
        thumb: 'bg-white',
      },
      success: {
        on: 'bg-green-600',
        off: 'bg-gray-300',
        thumb: 'bg-white',
      },
      warning: {
        on: 'bg-yellow-600',
        off: 'bg-gray-300',
        thumb: 'bg-white',
      },
      error: {
        on: 'bg-red-600',
        off: 'bg-gray-300',
        thumb: 'bg-white',
      },
    };

    const handleToggle = () => {
      if (disabled) return;
      
      const newChecked = !checked;
      
      if (!isControlled) {
        setUnchecked(newChecked);
      }
      onCheckedChange?.(newChecked);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleToggle();
      }
    };

    const currentVariant = variantClasses[variant];
    const currentSize = sizeClasses[size];

    return (
      <div className={cn('flex items-center', className)}>
        {showLabel && label && labelPosition === 'left' && (
          <span
            className={cn(
              'mr-3 text-sm font-medium',
              disabled ? 'text-gray-400' : 'text-gray-700',
              labelClassName
            )}
          >
            {label}
          </span>
        )}

        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative inline-flex items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            currentSize.container,
            checked ? currentVariant.on : currentVariant.off,
            trackClassName
          )}
          {...props}
        >
          <span
            className={cn(
              'inline-block rounded-full transition-transform',
              'transform',
              checked ? currentSize.translate : 'translate-x-0.5',
              currentVariant.thumb,
              currentSize.thumb,
              thumbClassName
            )}
          />
        </button>

        {showLabel && label && labelPosition === 'right' && (
          <span
            className={cn(
              'ml-3 text-sm font-medium',
              disabled ? 'text-gray-400' : 'text-gray-700',
              labelClassName
            )}
          >
            {label}
          </span>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

// Switch with icons
interface IconSwitchProps extends Omit<SwitchProps, 'showLabel' | 'label'> {
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
  iconClassName?: string;
}

export function IconSwitch({
  onIcon,
  offIcon,
  iconClassName,
  ...switchProps
}: IconSwitchProps) {
  return (
    <Switch {...switchProps}>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center',
        'transition-opacity',
        switchProps.checked ? 'opacity-0' : 'opacity-100',
        iconClassName
      )}>
        {offIcon}
      </span>
      <span className={cn(
        'absolute inset-0 flex items-center justify-center',
        'transition-opacity',
        switchProps.checked ? 'opacity-100' : 'opacity-0',
        iconClassName
      )}>
        {onIcon}
      </span>
    </Switch>
  );
}

// Switch group
interface SwitchGroupProps {
  children: React.ReactNode;
  label?: string;
  description?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  errorClassName?: string;
}

export function SwitchGroup({
  children,
  label,
  description,
  error,
  className,
  labelClassName,
  descriptionClassName,
  errorClassName,
}: SwitchGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className={cn('block text-sm font-medium text-gray-700', labelClassName)}>
          {label}
        </label>
      )}
      
      {description && (
        <p className={cn('text-sm text-gray-500', descriptionClassName)}>
          {description}
        </p>
      )}
      
      <div className="space-y-3">
        {children}
      </div>
      
      {error && (
        <p className={cn('text-sm text-red-600', errorClassName)}>
          {error}
        </p>
      )}
    </div>
  );
}

// Compound components
Switch.Icon = IconSwitch;
Switch.Group = SwitchGroup;
