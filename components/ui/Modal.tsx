'use client';

import { forwardRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  contentClassName?: string;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    closeOnOverlayClick = true,
    closeOnEsc = true,
    showCloseButton = true,
    className,
    overlayClassName,
    contentClassName,
  }, ref) => {
    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full mx-4',
    };

    const handleEscape = useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === 'Escape') {
          onClose();
        }
      },
      [closeOnEsc, onClose]
    );

    useEffect(() => {
      if (isOpen && closeOnEsc) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }, [isOpen, closeOnEsc, handleEscape]);

    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        role="dialog"
        aria-modal="true"
      >
        {/* Overlay */}
        <div
          className={cn(
            'fixed inset-0 bg-black/50 transition-opacity',
            overlayClassName
          )}
          aria-hidden="true"
          onClick={closeOnOverlayClick ? onClose : undefined}
        />

        {/* Modal Container */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={ref}
            className={cn(
              'relative w-full bg-white rounded-2xl shadow-2xl transform transition-all',
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="border-b border-gray-200 p-6">
                {title && (
                  <h2
                    id="modal-title"
                    className="text-xl font-bold text-gray-900 mb-2"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="text-gray-600">
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn('p-6', contentClassName)}>
              {children}
            </div>

            {/* Focus trap */}
            <div className="sr-only" tabIndex={0} />
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';
