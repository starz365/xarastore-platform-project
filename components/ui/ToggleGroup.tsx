'use client';

import { useState, Children, cloneElement, isValidElement, ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface ToggleGroupProps {
  children: React.ReactNode;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'solid';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

interface ToggleGroupItemProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function ToggleGroupItem({
  value,
  children,
  disabled = false,
  icon,
  className,
  ...props
}: ToggleGroupItemProps) {
  return (
    <button
      type="button"
      data-value={value}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center font-medium transition-all duration-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}

export function ToggleGroup({
  children,
  value: controlledValue,
  onChange,
  multiple = false,
  size = 'md',
  variant = 'default',
  disabled = false,
  className,
  fullWidth = false,
}: ToggleGroupProps) {
  const [internalValue, setInternalValue] = useState<string | string[]>(multiple ? [] : '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    default: {
      base: 'border border-gray-300',
      selected: 'bg-red-50 border-red-600 text-red-700',
      unselected: 'text-gray-700 hover:bg-gray-50',
    },
    outline: {
      base: 'border border-gray-300',
      selected: 'border-red-600 bg-white text-red-700 ring-2 ring-red-600/20',
      unselected: 'text-gray-700 hover:bg-gray-50',
    },
    solid: {
      base: 'border border-transparent',
      selected: 'bg-red-600 text-white',
      unselected: 'text-gray-700 bg-gray-100 hover:bg-gray-200',
    },
  };

  const handleClick = (itemValue: string) => {
    let newValue: string | string[];

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      newValue = currentValues.includes(itemValue)
        ? currentValues.filter(v => v !== itemValue)
        : [...currentValues, itemValue];
    } else {
      newValue = value === itemValue ? '' : itemValue;
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onChange?.(newValue);
  };

  const isSelected = (itemValue: string): boolean => {
    if (multiple) {
      return Array.isArray(value) && value.includes(itemValue);
    }
    return value === itemValue;
  };

  return (
    <div
      className={cn(
        'inline-flex rounded-lg overflow-hidden divide-x divide-gray-200',
        variantClasses[variant].base,
        fullWidth && 'w-full',
        className
      )}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        
        const itemValue = child.props.value;
        const selected = isSelected(itemValue);
        const itemDisabled = disabled || child.props.disabled;

        return cloneElement(child as ReactElement<ToggleGroupItemProps>, {
          onClick: () => !itemDisabled && handleClick(itemValue),
          className: cn(
            sizeClasses[size],
            selected ? variantClasses[variant].selected : variantClasses[variant].unselected,
            itemDisabled && 'opacity-50 cursor-not-allowed',
            'flex-1 text-center',
            child.props.className
          ),
          disabled: itemDisabled,
        });
      })}
    </div>
  );
}

// Usage example component
export function ProductViewToggle() {
  const [view, setView] = useState('grid');

  return (
    <ToggleGroup value={view} onChange={setView} size="sm">
      <ToggleGroupItem value="grid">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </ToggleGroupItem>
      <ToggleGroupItem value="list">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
