'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface DrawerProps {
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

export function Drawer({
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
}: DrawerProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll when drawer is open
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
          'fixed inset-0 bg-black/50 transition-opacity',
          overlayClassName
        )}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={cn(
          'pointer-events-none fixed inset-y-0 flex',
          position === 'right' && 'justify-end',
          position === 'left' && 'justify-start',
          position === 'top' && 'items-start',
          position === 'bottom' && 'items-end'
        )}>
          {/* Drawer Panel */}
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
            aria-labelledby={title ? 'drawer-title' : undefined}
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
                      id="drawer-title"
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
                      aria-label="Close drawer"
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
