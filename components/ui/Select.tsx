'use client';

import { useState, useRef, useEffect, forwardRef, ReactNode } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
  description?: string;
  group?: string;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  optionClassName?: string;
  selectedClassName?: string;
  groupClassName?: string;
  error?: boolean;
  success?: boolean;
  required?: boolean;
  name?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({
    value,
    defaultValue,
    onValueChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    searchable = false,
    clearable = false,
    multiple = false,
    size = 'md',
    className,
    triggerClassName,
    contentClassName,
    optionClassName,
    selectedClassName = 'bg-red-50 text-red-700',
    groupClassName,
    error = false,
    success = false,
    required = false,
    name,
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<string | string[]>(
      multiple ? (value ? [value] : defaultValue ? [defaultValue] : []) : value || defaultValue || ''
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
      sm: 'py-1.5 px-3 text-sm',
      md: 'py-2.5 px-4',
      lg: 'py-3 px-4 text-lg',
    };

    // Handle value changes
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(multiple ? (Array.isArray(value) ? value : [value]) : value);
      }
    }, [value, multiple]);

    // Filter options based on search
    useEffect(() => {
      if (!searchQuery.trim()) {
        setFilteredOptions(options);
        return;
      }

      const query = searchQuery.toLowerCase();
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query)
      );
      setFilteredOptions(filtered);
    }, [searchQuery, options]);

    // Group options by group
    const groupedOptions = filteredOptions.reduce((acc, option) => {
      const group = option.group || 'General';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(option);
      return acc;
    }, {} as Record<string, SelectOption[]>);

    const findOption = (val: string) => options.find(opt => opt.value === val);

    const handleSelect = (optionValue: string) => {
      if (multiple) {
        const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter(v => v !== optionValue)
          : [...currentValues, optionValue];
        
        setSelectedValue(newValues);
        onValueChange?.(newValues.join(','));
      } else {
        setSelectedValue(optionValue);
        onValueChange?.(optionValue);
        setIsOpen(false);
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (multiple) {
        setSelectedValue([]);
        onValueChange?.('');
      } else {
        setSelectedValue('');
        onValueChange?.('');
      }
    };

    const getDisplayValue = () => {
      if (multiple) {
        const values = Array.isArray(selectedValue) ? selectedValue : [];
        if (values.length === 0) return placeholder;
        
        const selectedOptions = values.map(val => findOption(val)).filter(Boolean);
        if (selectedOptions.length === 1) return selectedOptions[0]!.label;
        return `${selectedOptions.length} selected`;
      } else {
        const option = findOption(selectedValue as string);
        return option ? option.label : placeholder;
      }
    };

    const isOptionSelected = (optionValue: string) => {
      if (multiple) {
        return Array.isArray(selectedValue) && selectedValue.includes(optionValue);
      }
      return selectedValue === optionValue;
    };

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          contentRef.current &&
          !contentRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        // Focus search input if searchable
        if (searchable && searchRef.current) {
          setTimeout(() => searchRef.current?.focus(), 0);
        }
      }

      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, searchable]);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          // Implement keyboard navigation here
          break;
        case 'Enter':
          e.preventDefault();
          // Select focused option
          break;
      }
    };

    return (
      <div className={cn('relative', className)}>
        {/* Hidden input for form submission */}
        <input
          type="hidden"
          name={name}
          value={multiple ? (Array.isArray(selectedValue) ? selectedValue.join(',') : '') : selectedValue}
          required={required}
        />

        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'w-full text-left border rounded-lg transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent',
            'flex items-center justify-between',
            sizeClasses[size],
            disabled
              ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
              : 'bg-white hover:border-gray-400',
            error && 'border-red-500 focus:ring-red-500',
            success && 'border-green-500 focus:ring-green-500',
            triggerClassName
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
        >
          <span className={cn(
            'truncate',
            !selectedValue && 'text-gray-500'
          )}>
            {getDisplayValue()}
          </span>
          <div className="flex items-center space-x-2 ml-2">
            {clearable && selectedValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-gray-100 rounded"
                aria-label="Clear selection"
              >
                <ChevronDown className="w-4 h-4 text-gray-400 rotate-45" />
              </button>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Dropdown Content */}
        {isOpen && !disabled && (
          <div
            ref={contentRef}
            className={cn(
              'absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 z-50',
              'max-h-96 overflow-hidden flex flex-col',
              contentClassName
            )}
            role="listbox"
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="flex-1 overflow-y-auto p-2">
              {Object.keys(groupedOptions).length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No options found
                </div>
              ) : (
                Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <div key={group} className="mb-2">
                    {group !== 'General' && (
                      <div className={cn(
                        'px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                        groupClassName
                      )}>
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option) => {
                      const isSelected = isOptionSelected(option.value);

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => !option.disabled && handleSelect(option.value)}
                          disabled={option.disabled}
                          className={cn(
                            'w-full text-left px-3 py-2 rounded transition-colors',
                            'flex items-center justify-between',
                            'focus:outline-none focus:bg-gray-100',
                            option.disabled && 'opacity-50 cursor-not-allowed',
                            isSelected ? selectedClassName : 'hover:bg-gray-100',
                            optionClassName
                          )}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={option.disabled}
                        >
                          <div className="flex items-center space-x-3">
                            {option.icon && (
                              <div className={cn(
                                'w-5 h-5',
                                isSelected ? 'text-red-600' : 'text-gray-500'
                              )}>
                                {option.icon}
                              </div>
                            )}
                            <div className="text-left">
                              <div className="font-medium">{option.label}</div>
                              {option.description && (
                                <div className="text-sm text-gray-500">{option.description}</div>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Multiple Selection Footer */}
            {multiple && (
              <div className="border-t border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {Array.isArray(selectedValue) ? selectedValue.length : 0} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
