'use client';

import { useState, useRef, useEffect, cloneElement, ReactElement } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactElement;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  trigger: ReactElement | string;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
  position?: 'top' | 'bottom';
  onSelect?: (value: string) => void;
  selectedValue?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  closeOnSelect?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({
  trigger,
  items,
  align = 'start',
  position = 'bottom',
  onSelect,
  selectedValue,
  className,
  triggerClassName,
  contentClassName,
  itemClassName,
  closeOnSelect = true,
  open: controlledOpen,
  onOpenChange,
}: DropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (value: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };

  const toggleOpen = () => handleOpenChange(!open);

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled || item.separator) return;
    
    item.onClick?.();
    onSelect?.(item.value);
    
    if (closeOnSelect) {
      handleOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const updatePosition = () => {
    if (!open || !triggerRef.current || !dropdownRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();

    let left = triggerRect.left;
    let top = position === 'bottom' 
      ? triggerRect.bottom + 4 
      : triggerRect.top - dropdownRect.height - 4;

    // Adjust based on align
    if (align === 'center') {
      left = triggerRect.left + triggerRect.width / 2 - dropdownRect.width / 2;
    } else if (align === 'end') {
      left = triggerRect.right - dropdownRect.width;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 8) left = 8;
    if (left + dropdownRect.width > viewportWidth - 8) {
      left = viewportWidth - dropdownRect.width - 8;
    }

    if (position === 'top' && top < 8) {
      // Flip to bottom if top doesn't fit
      top = triggerRect.bottom + 4;
    } else if (position === 'bottom' && top + dropdownRect.height > viewportHeight - 8) {
      // Flip to top if bottom doesn't fit
      top = triggerRect.top - dropdownRect.height - 4;
    }

    dropdownRef.current.style.left = `${left}px`;
    dropdownRef.current.style.top = `${top}px`;
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [open]);

  const isStringTrigger = typeof trigger === 'string';

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        ref={triggerRef}
        onClick={toggleOpen}
        className={cn(
          'cursor-pointer',
          triggerClassName,
          isStringTrigger && 'flex items-center space-x-1'
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {isStringTrigger ? (
          <>
            <span>{trigger}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </>
        ) : (
          cloneElement(trigger, {
            'aria-expanded': open,
            'aria-haspopup': 'menu',
          })
        )}
      </div>

      {open && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-orientation="vertical"
          className={cn(
            'fixed z-50 min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200 py-1',
            'animate-fade-in',
            contentClassName
          )}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return (
                <div
                  key={`separator-${index}`}
                  className="my-1 border-t border-gray-200"
                  role="separator"
                />
              );
            }

            const isSelected = selectedValue === item.value;
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(item)}
                disabled={item.disabled}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between',
                  'focus:outline-none focus:bg-gray-100',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  item.destructive
                    ? 'text-red-600 hover:bg-red-50 focus:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-100',
                  itemClassName
                )}
              >
                <div className="flex items-center space-x-2">
                  {Icon && cloneElement(Icon, { className: 'w-4 h-4' })}
                  <span>{item.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-red-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
