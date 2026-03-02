'use client';

import { useState, useCallback, memo } from 'react';
import { Bell, Eye, Package, AlertCircle, CheckCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Product } from '@/types';
import { toast } from '@/components/shared/Toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { cn } from '@/lib/utils/cn';
import { validateEmail } from '@/lib/utils/validators';

interface OutOfStockActionsProps {
  product: Product;
  className?: string;
  allowPreorder?: boolean;
  onNotifySubmit?: () => void;
  onViewSimilar?: () => void;
  onPreorder?: () => void;
}

export const OutOfStockActions = memo(function OutOfStockActions({ 
  product, 
  className = '', 
  allowPreorder = false,
  onNotifySubmit,
  onViewSimilar,
  onPreorder
}: OutOfStockActionsProps) {
  const [isNotifyLoading, setIsNotifyLoading] = useState(false);
  const [isPreorderLoading, setIsPreorderLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  // Defensive checks for product data
  const safeProduct = {
    id: product?.id || '',
    name: product?.name || 'Product',
    category: product?.category || { id: '', slug: '', name: 'Uncategorized' },
    estimatedRestockDate: product?.estimatedRestockDate || null,
    allowPreorder: allowPreorder && !!product?.allowPreorder,
  };

  const handleNotifyMe = useCallback(async () => {
    if (!showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError(null);
    setIsNotifyLoading(true);

    try {
      const response = await fetch('/api/notifications/stock-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: safeProduct.id,
          productName: safeProduct.name,
          email: email.trim(),
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to register notification');
      }

      setNotifySuccess(true);
      toast.success('Notification registered!', {
        description: `We'll email you at ${email} when ${safeProduct.name} is back in stock.`,
        duration: 5000,
      });

      trackEvent({
        category: 'product',
        action: 'stock_notification',
        label: safeProduct.id,
        value: 1,
        email: email,
      });

      onNotifySubmit?.();

      // Reset after 3 seconds
      setTimeout(() => {
        setShowEmailInput(false);
        setEmail('');
        setNotifySuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to register notification:', error);
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
      
      trackEvent({
        category: 'product',
        action: 'stock_notification_failed',
        label: safeProduct.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsNotifyLoading(false);
    }
  }, [showEmailInput, email, safeProduct.id, safeProduct.name, user?.id, onNotifySubmit, trackEvent]);

  const handlePreorder = useCallback(async () => {
    setIsPreorderLoading(true);

    try {
      if (!user) {
        // Save intended action to localStorage for after login
        localStorage.setItem('preorderAfterLogin', JSON.stringify({
          productId: safeProduct.id,
          productName: safeProduct.name,
          timestamp: new Date().toISOString(),
        }));

        toast.info('Please sign in to preorder', {
          description: 'You\'ll be redirected to login.',
          action: {
            label: 'Sign In',
            onClick: () => window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`,
          },
        });
        
        trackEvent({
          category: 'product',
          action: 'preorder_redirect_login',
          label: safeProduct.id,
        });
        
        setIsPreorderLoading(false);
        return;
      }

      const response = await fetch('/api/orders/preorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: safeProduct.id,
          quantity: 1,
          estimatedDelivery: safeProduct.estimatedRestockDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Preorder failed');
      }

      toast.success('Preorder placed!', {
        description: `Your preorder for ${safeProduct.name} has been received. Estimated delivery: ${new Date(data.estimatedDelivery).toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        duration: 7000,
      });

      trackEvent({
        category: 'product',
        action: 'preorder',
        label: safeProduct.id,
        value: 1,
        orderNumber: data.orderNumber,
      });

      onPreorder?.();
    } catch (error) {
      console.error('Preorder failed:', error);
      toast.error('Preorder failed', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
      
      trackEvent({
        category: 'product',
        action: 'preorder_failed',
        label: safeProduct.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsPreorderLoading(false);
    }
  }, [user, safeProduct.id, safeProduct.name, safeProduct.estimatedRestockDate, onPreorder, trackEvent]);

  const handleViewSimilar = useCallback(() => {
    if (onViewSimilar) {
      onViewSimilar();
    } else if (safeProduct.category?.slug) {
      window.location.href = `/category/${safeProduct.category.slug}?exclude=${safeProduct.id}`;
    } else {
      window.location.href = '/shop';
    }

    trackEvent({
      category: 'product',
      action: 'view_similar_out_of_stock',
      label: safeProduct.id,
    });
  }, [onViewSimilar, safeProduct.category?.slug, safeProduct.id, trackEvent]);

  const formatRestockDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return null;
    }
  };

  const restockDate = formatRestockDate(safeProduct.estimatedRestockDate);

  return (
    <div 
      className={cn('space-y-4', className)}
      role="region"
      aria-label="Out of stock actions"
    >
      {/* Out of Stock Badge */}
      <div 
        className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg"
        role="status"
        aria-live="polite"
      >
        <div className="flex-shrink-0">
          <Package className="w-5 h-5 text-red-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-red-700">Currently Out of Stock</p>
          {restockDate && (
            <p className="text-sm text-red-600">
              Expected restock: <time dateTime={safeProduct.estimatedRestockDate!}>{restockDate}</time>
            </p>
          )}
        </div>
      </div>

      {/* Notify Me Section */}
      <div className="space-y-3">
        {showEmailInput && !notifySuccess && (
          <div className="space-y-2 animate-fade-in">
            <label 
              htmlFor="notify-email" 
              className="block text-sm font-medium text-gray-700"
            >
              Email address for notification
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <Input
                id="notify-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNotifyMe();
                  }
                }}
                placeholder="you@example.com"
                className={cn(
                  'pl-10',
                  emailError && 'border-red-500 focus:ring-red-500'
                )}
                autoComplete="email"
                disabled={isNotifyLoading}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
            </div>
            {emailError && (
              <p id="email-error" className="text-sm text-red-600">
                {emailError}
              </p>
            )}
          </div>
        )}

        {notifySuccess ? (
          <div 
            className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-fade-in"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
            <p className="text-sm text-green-700">We'll notify you when available!</p>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleNotifyMe}
            disabled={isNotifyLoading || notifySuccess}
            className="w-full relative"
            aria-label={showEmailInput ? 'Submit notification email' : 'Notify me when available'}
          >
            {isNotifyLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                Registering...
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" aria-hidden="true" />
                {showEmailInput ? 'Submit Notification' : 'Notify Me When Available'}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Secondary Actions */}
      <div className={cn(
        'grid gap-3',
        safeProduct.allowPreorder ? 'grid-cols-2' : 'grid-cols-1'
      )}>
        {safeProduct.allowPreorder && (
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePreorder}
            disabled={isPreorderLoading}
            className="w-full"
            aria-label="Preorder this item"
          >
            {isPreorderLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Processing...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" aria-hidden="true" />
                Preorder
              </>
            )}
          </Button>
        )}
        
        <Button
          variant="secondary"
          size="lg"
          onClick={handleViewSimilar}
          className={cn('w-full', !safeProduct.allowPreorder && 'col-span-1')}
          aria-label="View similar products"
        >
          <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
          View Similar Products
        </Button>
      </div>

      {/* Additional Info */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
        <span>Join waitlist to be notified immediately when stock arrives</span>
      </div>
    </div>
  );
});

OutOfStockActions.displayName = 'OutOfStockActions';
