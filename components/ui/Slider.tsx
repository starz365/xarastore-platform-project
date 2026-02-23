'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils/css';

interface SliderProps {
  value?: number | number[];
  defaultValue?: number | number[];
  onChange?: (value: number | number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showValue?: boolean;
  showTicks?: boolean;
  ticks?: number[];
  formatValue?: (value: number) => string;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  tickClassName?: string;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({
    value: controlledValue,
    defaultValue = 0,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    orientation = 'horizontal',
    showLabels = true,
    showValue = true,
    showTicks = false,
    ticks,
    formatValue = (val) => val.toString(),
    className,
    trackClassName,
    rangeClassName,
    thumbClassName,
    labelClassName,
    valueClassName,
    tickClassName,
  }, ref) => {
    const [internalValue, setInternalValue] = useState<number | number[]>(
      controlledValue !== undefined ? controlledValue : defaultValue
    );
    const [isDragging, setIsDragging] = useState(false);
    const [activeThumb, setActiveThumb] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;
    const isRange = Array.isArray(currentValue);

    // Calculate percentage
    const toPercentage = (val: number) => ((val - min) / (max - min)) * 100;
    const fromPercentage = (percent: number) => min + (percent / 100) * (max - min);

    // Snap to step
    const snapToStep = (value: number) => {
      const steps = Math.round((value - min) / step);
      return min + steps * step;
    };

    const getThumbPosition = (thumbIndex: number = 0) => {
      if (isRange) {
        return toPercentage(currentValue[thumbIndex]);
      }
      return toPercentage(currentValue as number);
    };

    const handleTrackClick = (event: React.MouseEvent) => {
      if (disabled) return;

      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      let percentage: number;

      if (orientation === 'horizontal') {
        const x = event.clientX - rect.left;
        percentage = (x / rect.width) * 100;
      } else {
        const y = event.clientY - rect.top;
        percentage = (y / rect.height) * 100;
      }

      percentage = Math.max(0, Math.min(100, percentage));
      const newValue = snapToStep(fromPercentage(percentage));

      if (isRange) {
        const values = [...(currentValue as number[])];
        const closestIndex = values.reduce((closest, val, index) => {
          const diff = Math.abs(val - newValue);
          return diff < closest.diff ? { diff, index } : closest;
        }, { diff: Infinity, index: 0 }).index;

        const newValues = [...values];
        newValues[closestIndex] = newValue;
        newValues.sort((a, b) => a - b);

        if (!isControlled) setInternalValue(newValues);
        onChange?.(newValues);
      } else {
        if (!isControlled) setInternalValue(newValue);
        onChange?.(newValue);
      }
    };

    const handleThumbMouseDown = (thumbIndex: number = 0) => {
      if (disabled) return;
      setIsDragging(true);
      setActiveThumb(thumbIndex);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || disabled || !trackRef.current) return;

      const track = trackRef.current;
      const rect = track.getBoundingClientRect();
      let percentage: number;

      if (orientation === 'horizontal') {
        const x = event.clientX - rect.left;
        percentage = (x / rect.width) * 100;
      } else {
        const y = event.clientY - rect.top;
        percentage = (y / rect.height) * 100;
      }

      percentage = Math.max(0, Math.min(100, percentage));
      const newValue = snapToStep(fromPercentage(percentage));

      if (isRange && activeThumb !== null) {
        const values = [...(currentValue as number[])];
        const otherIndex = activeThumb === 0 ? 1 : 0;
        
        // Ensure thumbs don't cross
        if (activeThumb === 0 && newValue > values[1]) return;
        if (activeThumb === 1 && newValue < values[0]) return;

        const newValues = [...values];
        newValues[activeThumb] = newValue;

        if (!isControlled) setInternalValue(newValues);
        onChange?.(newValues);
      } else if (!isRange) {
        if (!isControlled) setInternalValue(newValue);
        onChange?.(newValue);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setActiveThumb(null);
    };

    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, activeThumb, currentValue]);

    const rangeStart = isRange ? Math.min(...(currentValue as number[])) : min;
    const rangeEnd = isRange ? Math.max(...(currentValue as number[])) : currentValue as number;

    const effectiveTicks = ticks || (showTicks ? Array.from(
      { length: Math.floor((max - min) / step) + 1 },
      (_, i) => min + i * step
    ) : []);

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          orientation === 'horizontal' ? 'w-full' : 'h-full',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {/* Labels */}
        {showLabels && (
          <div className={cn(
            'flex justify-between mb-2',
            orientation === 'vertical' && 'flex-col h-full justify-between',
            labelClassName
          )}>
            <span className="text-sm text-gray-600">{formatValue(min)}</span>
            <span className="text-sm text-gray-600">{formatValue(max)}</span>
          </div>
        )}

        {/* Track */}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className={cn(
            'relative rounded-full bg-gray-200 cursor-pointer',
            orientation === 'horizontal' ? 'w-full h-2' : 'h-full w-2',
            disabled && 'cursor-not-allowed',
            trackClassName
          )}
        >
          {/* Range */}
          <div
            className={cn(
              'absolute rounded-full bg-red-600',
              orientation === 'horizontal'
                ? 'h-full top-0'
                : 'w-full left-0',
              rangeClassName
            )}
            style={{
              [orientation === 'horizontal' ? 'left' : 'bottom']: `${toPercentage(rangeStart)}%`,
              [orientation === 'horizontal' ? 'width' : 'height']: `${toPercentage(rangeEnd) - toPercentage(rangeStart)}%`,
            }}
          />

          {/* Ticks */}
          {showTicks && effectiveTicks.map((tick) => (
            <div
              key={tick}
              className={cn(
                'absolute bg-white border border-gray-300 rounded-full',
                orientation === 'horizontal' ? 'w-1 h-1 -ml-0.5' : 'h-1 w-1 -mt-0.5',
                tickClassName
              )}
              style={{
                [orientation === 'horizontal' ? 'left' : 'bottom']: `${toPercentage(tick)}%`,
              }}
            />
          ))}

          {/* Thumb(s) */}
          {isRange ? (
            (currentValue as number[]).map((val, index) => (
              <div
                key={index}
                onMouseDown={() => handleThumbMouseDown(index)}
                className={cn(
                  'absolute w-6 h-6 bg-white border-2 border-red-600 rounded-full',
                  'shadow-lg cursor-grab active:cursor-grabbing',
                  'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
                  'transform -translate-y-1/2',
                  orientation === 'vertical' && 'transform -translate-x-1/2',
                  thumbClassName
                )}
                style={{
                  [orientation === 'horizontal' ? 'left' : 'bottom']: `${toPercentage(val)}%`,
                  [orientation === 'horizontal' ? 'top' : 'left']: '50%',
                }}
                tabIndex={disabled ? -1 : 0}
                role="slider"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={val}
                aria-label={`Slider thumb ${index + 1}`}
                aria-disabled={disabled}
              />
            ))
          ) : (
            <div
              onMouseDown={() => handleThumbMouseDown(0)}
              className={cn(
                'absolute w-6 h-6 bg-white border-2 border-red-600 rounded-full',
                'shadow-lg cursor-grab active:cursor-grabbing',
                'focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
                'transform -translate-y-1/2',
                orientation === 'vertical' && 'transform -translate-x-1/2',
                thumbClassName
              )}
              style={{
                [orientation === 'horizontal' ? 'left' : 'bottom']: `${toPercentage(currentValue as number)}%`,
                [orientation === 'horizontal' ? 'top' : 'left']: '50%',
              }}
              tabIndex={disabled ? -1 : 0}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={currentValue as number}
              aria-label="Slider"
              aria-disabled={disabled}
            />
          )}
        </div>

        {/* Value Display */}
        {showValue && (
          <div className={cn('mt-2 text-center', valueClassName)}>
            {isRange ? (
              <span className="text-sm font-medium text-gray-900">
                {formatValue((currentValue as number[])[0])} - {formatValue((currentValue as number[])[1])}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {formatValue(currentValue as number)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

// Slider with input
interface SliderWithInputProps extends Omit<SliderProps, 'showValue'> {
  inputClassName?: string;
  showInput?: boolean;
}

export function SliderWithInput({
  inputClassName,
  showInput = true,
  ...sliderProps
}: SliderWithInputProps) {
  const [inputValue, setInputValue] = useState(
    sliderProps.value?.toString() || sliderProps.defaultValue?.toString() || '0'
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && sliderProps.onChange) {
      if (Array.isArray(sliderProps.value)) {
        sliderProps.onChange([numValue]);
      } else {
        sliderProps.onChange(numValue);
      }
    }
  };

  const handleSliderChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setInputValue(value[0].toString());
    } else {
      setInputValue(value.toString());
    }
    sliderProps.onChange?.(value);
  };

  return (
    <div className="flex items-center space-x-4">
      <Slider
        {...sliderProps}
        onChange={handleSliderChange}
        showValue={false}
      />
      {showInput && (
        <div className="relative w-20">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            min={sliderProps.min}
            max={sliderProps.max}
            step={sliderProps.step}
            disabled={sliderProps.disabled}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent',
              inputClassName
            )}
          />
          {sliderProps.formatValue && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {sliderProps.formatValue(parseFloat(inputValue) || 0).replace(/\d/g, '')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Range slider
interface RangeSliderProps extends Omit<SliderProps, 'value' | 'defaultValue'> {
  value?: [number, number];
  defaultValue?: [number, number];
}

export function RangeSlider(props: RangeSliderProps) {
  return <Slider {...props} />;
}

// Compound components
Slider.WithInput = SliderWithInput;
Slider.Range = RangeSlider;
