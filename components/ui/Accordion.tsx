'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface AccordionContextType {
  openItems: string[];
  toggleItem: (value: string) => void;
  allowMultiple?: boolean;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

interface AccordionProps {
  defaultValue?: string | string[];
  children: ReactNode;
  className?: string;
  allowMultiple?: boolean;
  onValueChange?: (value: string | string[]) => void;
  type?: 'single' | 'multiple';
}

export function Accordion({
  defaultValue = [],
  children,
  className,
  allowMultiple = false,
  onValueChange,
  type = allowMultiple ? 'multiple' : 'single',
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(
    Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []
  );

  const toggleItem = (value: string) => {
    let newOpenItems: string[];
    
    if (type === 'single') {
      newOpenItems = openItems.includes(value) ? [] : [value];
    } else {
      newOpenItems = openItems.includes(value)
        ? openItems.filter(item => item !== value)
        : [...openItems, value];
    }

    setOpenItems(newOpenItems);
    onValueChange?.(type === 'single' ? newOpenItems[0] || '' : newOpenItems);
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function AccordionItem({ value, children, className, disabled = false }: AccordionItemProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const { openItems } = context;
  const isOpen = openItems.includes(value);

  return (
    <div
      className={cn(
        'border border-gray-200 rounded-lg overflow-hidden',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      data-state={isOpen ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
}

interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  icon?: 'chevron' | 'plus';
  iconPosition?: 'left' | 'right';
  showIcon?: boolean;
}

export function AccordionTrigger({
  children,
  className,
  icon = 'chevron',
  iconPosition = 'right',
  showIcon = true,
}: AccordionTriggerProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionTrigger must be used within Accordion');

  const { openItems, toggleItem } = context;
  const value = (children as any).props?.value || '';
  const isOpen = openItems.includes(value);

  const Icon = icon === 'chevron' ? ChevronDown : isOpen ? Minus : Plus;

  return (
    <button
      type="button"
      onClick={() => toggleItem(value)}
      className={cn(
        'flex w-full items-center justify-between p-4 text-left font-medium',
        'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
        'transition-colors',
        className
      )}
      aria-expanded={isOpen}
      aria-controls={`accordion-content-${value}`}
    >
      {iconPosition === 'left' && showIcon && (
        <Icon
          className={cn(
            'w-5 h-5 mr-3 transition-transform',
            isOpen && icon === 'chevron' && 'rotate-180'
          )}
        />
      )}
      <span className="flex-1">{children}</span>
      {iconPosition === 'right' && showIcon && (
        <Icon
          className={cn(
            'w-5 h-5 ml-3 transition-transform',
            isOpen && icon === 'chevron' && 'rotate-180'
          )}
        />
      )}
    </button>
  );
}

interface AccordionContentProps {
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}

export function AccordionContent({ children, className, forceMount = false }: AccordionContentProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionContent must be used within Accordion');

  const { openItems } = context;
  const value = (children as any).props?.value || '';
  const isOpen = openItems.includes(value);

  if (!isOpen && !forceMount) return null;

  return (
    <div
      id={`accordion-content-${value}`}
      className={cn(
        'px-4 pb-4',
        'animate-in fade-in-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className
      )}
    >
      <div className="pt-0">{children}</div>
    </div>
  );
}

// Compound component
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;
