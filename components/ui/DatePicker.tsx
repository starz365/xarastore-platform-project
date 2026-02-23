'use client';

import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/css';
import { Calendar as CalendarComponent } from './Calendar';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  format?: string;
  className?: string;
  inputClassName?: string;
  calendarClassName?: string;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
  required?: boolean;
  name?: string;
  error?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({
    value,
    onChange,
    placeholder = 'Select date',
    disabled = false,
    minDate,
    maxDate,
    format = 'YYYY-MM-DD',
    className,
    inputClassName,
    calendarClassName,
    showIcon = true,
    iconPosition = 'right',
    required = false,
    name,
    error,
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(value || null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const formatDate = (date: Date | null) => {
      if (!date) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day);
    };

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      onChange?.(date);
      setIsOpen(false);
      
      // Update hidden input value
      if (inputRef.current) {
        inputRef.current.value = formatDate(date);
      }
    };

    const handleInputClick = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    const handleClear = () => {
      setSelectedDate(null);
      onChange?.(new Date(0));
      setIsOpen(false);
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
      }
    };

    return (
      <div className={cn('relative', className)}>
        {/* Hidden input for form submission */}
        <input
          type="hidden"
          ref={inputRef}
          name={name}
          value={formatDate(selectedDate)}
          required={required}
        />

        {/* Visible input */}
        <div className="relative">
          {showIcon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
          )}
          
          <button
            type="button"
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={cn(
              'w-full text-left px-4 py-2.5 border rounded-lg transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent',
              disabled
                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                : 'bg-white border-gray-300 hover:border-gray-400',
              showIcon && iconPosition === 'left' && 'pl-10',
              showIcon && iconPosition === 'right' && 'pr-10',
              error && 'border-red-500 focus:ring-red-500',
              inputClassName
            )}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label={placeholder}
          >
            <span className={cn(!selectedDate && 'text-gray-500')}>
              {selectedDate ? formatDate(selectedDate) : placeholder}
            </span>
          </button>

          {showIcon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
          )}

          {selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              aria-label="Clear date"
            >
              <ChevronDown className="w-4 h-4 text-gray-400 rotate-45" />
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}

        {/* Calendar popup */}
        {isOpen && !disabled && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            
            <div
              className={cn(
                'absolute z-50 mt-1',
                calendarClassName
              )}
            >
              <CalendarComponent
                value={selectedDate || new Date()}
                onChange={handleDateSelect}
                minDate={minDate}
                maxDate={maxDate}
                disabled={disabled}
                showMonthYearPicker={true}
                showTodayButton={true}
                format={format}
                className="shadow-2xl"
              />
            </div>
          </>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
