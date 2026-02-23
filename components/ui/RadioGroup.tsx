'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface RadioGroupContextType {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroupContext = createContext<RadioGroupContextType | undefined>(undefined);

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  name?: string;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
  className,
  name,
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleChange = (newValue: string) => {
    if (disabled) return;
    
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <RadioGroupContext.Provider value={{ value, onChange: handleChange, disabled, name }}>
      <div
        className={cn('space-y-2', className)}
        role="radiogroup"
        aria-disabled={disabled}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  indicatorClassName?: string;
}

export function RadioItem({
  value,
  children,
  disabled: itemDisabled,
  className,
  labelClassName,
  indicatorClassName,
}: RadioItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioItem must be used within RadioGroup');

  const { value: selectedValue, onChange, disabled: groupDisabled, name } = context;
  const isSelected = selectedValue === value;
  const disabled = groupDisabled || itemDisabled;

  return (
    <label
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
        'hover:bg-gray-50 focus-within:ring-2 focus-within:ring-red-600',
        isSelected ? 'border-red-300 bg-red-50' : 'border-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="radio"
          value={value}
          checked={isSelected}
          onChange={() => !disabled && onChange(value)}
          disabled={disabled}
          name={name}
          className="sr-only"
          aria-checked={isSelected}
        />
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
            isSelected ? 'border-red-600 bg-red-600' : 'border-gray-300',
            indicatorClassName
          )}
          aria-hidden="true"
        >
          {isSelected && (
            <div className="w-2 h-2 bg-white rounded-full" />
          )}
        </div>
      </div>
      <div className={cn('flex-1', labelClassName)}>
        {children}
      </div>
    </label>
  );
}

interface RadioCardProps {
  value: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  cardClassName?: string;
  selectedClassName?: string;
}

export function RadioCard({
  value,
  title,
  description,
  icon,
  disabled = false,
  className,
  cardClassName,
  selectedClassName = 'border-red-600 ring-2 ring-red-600/20',
}: RadioCardProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioCard must be used within RadioGroup');

  const { value: selectedValue, onChange, disabled: groupDisabled } = context;
  const isSelected = selectedValue === value;
  const isDisabled = groupDisabled || disabled;

  return (
    <label
      className={cn(
        'block cursor-pointer',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input
        type="radio"
        value={value}
        checked={isSelected}
        onChange={() => !isDisabled && onChange(value)}
        disabled={isDisabled}
        className="sr-only"
        aria-label={title}
      />
      <div
        className={cn(
          'p-4 border rounded-lg transition-all',
          'hover:border-gray-300 hover:shadow-sm',
          isSelected ? selectedClassName : 'border-gray-200',
          cardClassName
        )}
      >
        <div className="flex items-start space-x-3">
          {icon && (
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isSelected ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
            )}>
              {icon}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {isSelected && (
                <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
    </label>
  );
}

// Radio group with cards
interface RadioCardsProps extends Omit<RadioGroupProps, 'children'> {
  options: Array<{
    value: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
  }>;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export function RadioCards({
  options,
  columns = 2,
  className,
  ...radioGroupProps
}: RadioCardsProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <RadioGroup {...radioGroupProps}>
      <div className={cn('grid gap-3', gridClasses[columns], className)}>
        {options.map((option) => (
          <RadioCard
            key={option.value}
            value={option.value}
            title={option.label}
            description={option.description}
            icon={option.icon}
            disabled={option.disabled}
          />
        ))}
      </div>
    </RadioGroup>
  );
}

// Compound components
RadioGroup.Item = RadioItem;
RadioGroup.Card = RadioCard;
RadioGroup.Cards = RadioCards;
