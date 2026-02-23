'use client';

import { useState, useRef, useEffect, cloneElement, ReactElement } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface PopoverProps {
  trigger: ReactElement;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnClickOutside?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  offset?: number;
}

export function Popover({
  trigger,
  children,
  position = 'bottom',
  align = 'center',
  open: controlledOpen,
  onOpenChange,
  closeOnClickOutside = true,
  closeOnEsc = true,
  className,
  contentClassName,
  arrow = true,
  offset = 8,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (value: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };

  const toggleOpen = () => handleOpenChange(!open);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        closeOnClickOutside &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleOpenChange(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        handleOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, closeOnClickOutside, closeOnEsc]);

  const updatePosition = () => {
    if (!open || !triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    let left = 0;
    let top = 0;

    // Calculate horizontal position based on align
    switch (align) {
      case 'start':
        left = triggerRect.left;
        break;
      case 'center':
        left = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
        break;
      case 'end':
        left = triggerRect.right - popoverRect.width;
        break;
    }

    // Calculate vertical position based on position
    switch (position) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        break;
      case 'left':
        left = triggerRect.left - popoverRect.width - offset;
        top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
        break;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 8) left = 8;
    if (left + popoverRect.width > viewportWidth - 8) {
      left = viewportWidth - popoverRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + popoverRect.height > viewportHeight - 8) {
      top = viewportHeight - popoverRect.height - 8;
    }

    popoverRef.current.style.left = `${left}px`;
    popoverRef.current.style.top = `${top}px`;
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

  const positionClasses = {
    top: 'bottom-full',
    bottom: 'top-full',
    left: 'right-full',
    right: 'left-full',
  };

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const arrowPositionClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
    left: 'right-[-4px] top-1/2 -translate-y-1/2',
    right: 'left-[-4px] top-1/2 -translate-y-1/2',
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div ref={triggerRef} onClick={toggleOpen}>
        {cloneElement(trigger, {
          'aria-expanded': open,
          'aria-haspopup': 'dialog',
        })}
      </div>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => handleOpenChange(false)}
          />

          {/* Popover */}
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="true"
            className={cn(
              'fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200',
              'animate-fade-in',
              contentClassName
            )}
          >
            {children}
            
            {arrow && (
              <div
                className={cn(
                  'absolute w-2 h-2 bg-white border-t border-l border-gray-200 transform rotate-45',
                  arrowPositionClasses[position]
                )}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
