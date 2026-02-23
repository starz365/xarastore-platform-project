'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';
import { CartItem } from './CartItem';
import { CartEmptyState } from './CartEmptyState';
import { CartRecommendations } from './CartRecommendations';

interface CartFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartFlyout({ isOpen, onClose }: CartFlyoutProps) {
  const router = useRouter();
  const { items, getTotal, getItemCount } = useCart();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleCheckout = () => {
    onClose();
    router.push('/checkout');
  };

  const handleViewCart = () => {
    onClose();
    router.push('/cart');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Cart Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ShoppingBag className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
            <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
              {getItemCount()} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <CartEmptyState onClose={onClose} />
          ) : (
            <>
              {/* Cart Items */}
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>

              {/* Recommendations */}
              <CartRecommendations />
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(getTotal())}
              </span>
            </div>

            <div className="text-sm text-gray-600 text-center">
              Shipping & taxes calculated at checkout
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCheckout}
              >
                Checkout Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleViewCart}
              >
                View Cart
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <span>✓ Secure checkout</span>
              <span>✓ Free returns</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
