'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface CollapsibleContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined);

interface CollapsibleProps {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Collapsible({
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  disabled = false,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (value: boolean) => {
    if (disabled) return;
    
    if (!isControlled) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };

  const toggle = () => setOpen(!open);

  return (
    <CollapsibleContext.Provider value={{ open, setOpen, disabled }}>
      <div className={cn('w-full', className)} data-state={open ? 'open' : 'closed'}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

interface CollapsibleTriggerProps {
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
  asChild?: boolean;
}

export function CollapsibleTrigger({
  children,
  className,
  showIcon = true,
  iconPosition = 'right',
  asChild = false,
}: CollapsibleTriggerProps) {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error('CollapsibleTrigger must be used within Collapsible');

  const { open, setOpen, disabled } = context;

  const handleClick = () => {
    if (disabled) return;
    setOpen(!open);
  };

  if (asChild) {
    return (
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center justify-between',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
        'transition-colors',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-expanded={open}
      aria-disabled={disabled}
    >
      {iconPosition === 'left' && showIcon && (
        <ChevronDown
          className={cn(
            'w-4 h-4 mr-2 transition-transform',
            open && 'rotate-180'
          )}
        />
      )}
      <span className="flex-1 text-left">{children}</span>
      {iconPosition === 'right' && showIcon && (
        <ChevronDown
          className={cn(
            'w-4 h-4 ml-2 transition-transform',
            open && 'rotate-180'
          )}
        />
      )}
    </button>
  );
}

interface CollapsibleContentProps {
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}

export function CollapsibleContent({
  children,
  className,
  forceMount = false,
}: CollapsibleContentProps) {
  const context = useContext(CollapsibleContext);
  if (!context) throw new Error('CollapsibleContent must be used within Collapsible');

  const { open } = context;

  if (!open && !forceMount) return null;

  return (
    <div
      className={cn(
        'overflow-hidden',
        'animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        className
      )}
      data-state={open ? 'open' : 'closed'}
    >
      <div className="pt-2">{children}</div>
    </div>
  );
}

// Compound component
Collapsible.Trigger = CollapsibleTrigger;
Collapsible.Content = CollapsibleContent;
