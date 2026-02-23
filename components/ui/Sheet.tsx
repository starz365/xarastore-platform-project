'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-full',
};

const positionClasses = {
  left: 'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
  top: 'top-0 left-0 w-full',
  bottom: 'bottom-0 left-0 w-full',
};

const transformClasses = {
  left: '-translate-x-full',
  right: 'translate-x-full',
  top: '-translate-y-full',
  bottom: 'translate-y-full',
};

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className,
  overlayClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  footer,
}: SheetProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isHorizontal = position === 'left' || position === 'right';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300',
          overlayClassName
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={cn(
          'pointer-events-none fixed inset-y-0 flex',
          position === 'right' && 'justify-end',
          position === 'left' && 'justify-start',
          position === 'top' && 'items-start',
          position === 'bottom' && 'items-end'
        )}>
          {/* Sheet Panel */}
          <div
            className={cn(
              'pointer-events-auto relative w-screen transform transition-transform duration-300 ease-in-out',
              isHorizontal ? sizeClasses[size] : 'h-auto',
              positionClasses[position],
              isOpen ? 'translate-x-0 translate-y-0' : transformClasses[position],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
          >
            <div className={cn(
              'flex h-full flex-col bg-white shadow-xl',
              contentClassName
            )}>
              {/* Header */}
              {(title || showCloseButton) && (
                <div className={cn(
                  'flex items-center justify-between px-6 py-4 border-b border-gray-200',
                  headerClassName
                )}>
                  {title && (
                    <h2
                      id="sheet-title"
                      className="text-lg font-semibold text-gray-900"
                    >
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Close sheet"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className={cn(
                'flex-1 overflow-y-auto p-6',
                bodyClassName
              )}>
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-gray-200 p-6">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sheet trigger component
interface SheetTriggerProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function SheetTrigger({ children, onClick, className }: SheetTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2',
        'text-sm font-medium text-white bg-red-600 rounded-lg',
        'hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2',
        'transition-colors',
        className
      )}
    >
      {children}
    </button>
  );
}

// Sheet content component
interface SheetContentProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetContent({ children, className }: SheetContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

// Sheet header component
interface SheetHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function SheetHeader({ title, description, className }: SheetHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-2 text-gray-600">{description}</p>
      )}
    </div>
  );
}

// Sheet footer component
interface SheetFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <div className={cn('mt-6 pt-6 border-t border-gray-200', className)}>
      {children}
    </div>
  );
}

// Compound components
Sheet.Trigger = SheetTrigger;
Sheet.Content = SheetContent;
Sheet.Header = SheetHeader;
Sheet.Footer = SheetFooter;
