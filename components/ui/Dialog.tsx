'use client';

import { forwardRef, useEffect, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/css';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  variant?: 'info' | 'warning' | 'success' | 'error' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  isLoading?: boolean;
  className?: string;
  overlayClassName?: string;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    variant = 'info',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
    isLoading = false,
    className,
    overlayClassName,
  }, ref) => {
    const variantConfig = {
      info: {
        icon: Info,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        confirmVariant: 'primary' as const,
      },
      warning: {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        confirmVariant: 'primary' as const,
      },
      success: {
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        confirmVariant: 'primary' as const,
      },
      error: {
        icon: XCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        confirmVariant: 'primary' as const,
      },
      confirm: {
        icon: Info,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        confirmVariant: 'primary' as const,
      },
    };

    const config = variantConfig[variant];
    const Icon = config.icon;

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
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
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

        {/* Dialog Container */}
        <div
          ref={ref}
          className={cn(
            'relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all',
            config.borderColor,
            'border',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
              aria-label="Close dialog"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}

          {/* Icon */}
          <div className={cn('p-6', config.bgColor)}>
            <div className="flex flex-col items-center text-center">
              <div className={cn('p-3 rounded-full mb-4', config.bgColor)}>
                <Icon className={cn('w-8 h-8', config.iconColor)} />
              </div>
              <h2 id="dialog-title" className="text-xl font-bold text-gray-900 mb-2">
                {title}
              </h2>
              <p id="dialog-message" className="text-gray-600">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0">
              {variant === 'confirm' && (
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                  className="sm:order-1"
                >
                  {cancelText}
                </Button>
              )}
              
              <Button
                variant={config.confirmVariant}
                onClick={onConfirm || onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Dialog.displayName = 'Dialog';
