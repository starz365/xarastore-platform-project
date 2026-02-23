'use client';

import { useState, useRef, useEffect, cloneElement, ReactElement } from 'react';
import { cn } from '@/lib/utils/css';

interface HoverCardProps {
  trigger: ReactElement;
  content: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  openDelay?: number;
  closeDelay?: number;
  className?: string;
  contentClassName?: string;
  arrow?: boolean;
  offset?: number;
  onOpenChange?: (open: boolean) => void;
}

export function HoverCard({
  trigger,
  content,
  align = 'center',
  side = 'bottom',
  openDelay = 200,
  closeDelay = 150,
  className,
  contentClassName,
  arrow = true,
  offset = 8,
  onOpenChange,
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<NodeJS.Timeout>();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      onOpenChange?.(true);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
    }
    
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      onOpenChange?.(false);
    }, closeDelay);
  };

  const updatePosition = () => {
    if (!open || !triggerRef.current || !cardRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();

    let left = 0;
    let top = 0;

    // Calculate horizontal position based on align
    switch (align) {
      case 'start':
        left = triggerRect.left;
        break;
      case 'center':
        left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2;
        break;
      case 'end':
        left = triggerRect.right - cardRect.width;
        break;
    }

    // Calculate vertical position based on side
    switch (side) {
      case 'top':
        top = triggerRect.top - cardRect.height - offset;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        break;
      case 'left':
        left = triggerRect.left - cardRect.width - offset;
        top = triggerRect.top + triggerRect.height / 2 - cardRect.height / 2;
        break;
      case 'right':
        left = triggerRect.right + offset;
        top = triggerRect.top + triggerRect.height / 2 - cardRect.height / 2;
        break;
    }

    // Keep within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 8) left = 8;
    if (left + cardRect.width > viewportWidth - 8) {
      left = viewportWidth - cardRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + cardRect.height > viewportHeight - 8) {
      top = viewportHeight - cardRect.height - 8;
    }

    setCoords({ x: left, y: top });
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

  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const arrowPositionClasses = {
    top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
    bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
    left: 'right-[-4px] top-1/2 -translate-y-1/2',
    right: 'left-[-4px] top-1/2 -translate-y-1/2',
  };

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {cloneElement(trigger, {
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
      })}

      {open && (
        <div
          ref={cardRef}
          className={cn(
            'fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200',
            'animate-fade-in',
            contentClassName
          )}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {content}
          
          {arrow && (
            <div
              className={cn(
                'absolute w-2 h-2 bg-white border-t border-l border-gray-200 transform rotate-45',
                arrowPositionClasses[side]
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
