'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, AlertCircle, Check } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency, calculateShipping, calculateTax } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CartCoupon } from './CartCoupon';

export function CartSummary() {
  const router = useRouter();
  const { items, getTotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const subtotal = getTotal();
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const discount = couponDiscount;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || isApplying) return;

    setIsApplying(true);
    setCouponError(null);

    try {
      // Validate coupon via API
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          amount: subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid coupon code');
      }

      setAppliedCoupon(couponCode);
      setCouponDiscount(data.discount);
      setCouponCode('');
    } catch (error: any) {
      setCouponError(error.message || 'Failed to apply coupon');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

      {/* Coupon Section */}
      <CartCoupon
        couponCode={couponCode}
        setCouponCode={setCouponCode}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        isApplying={isApplying}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
      />

      {/* Order Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium">
            {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Tax</span>
          <span className="font-medium">{formatCurrency(tax)}</span>
        </div>

        {subtotal < 2000 && (
          <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <Tag className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              Add {formatCurrency(2000 - subtotal)} more to get FREE shipping!
            </span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(total)}
            </div>
            <div className="text-sm text-gray-600">Inclusive of all taxes</div>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full mb-4"
        onClick={handleCheckout}
        disabled={items.length === 0}
      >
        Proceed to Checkout
      </Button>

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
        <Check className="w-4 h-4 text-green-600" />
        <span>Secure checkout</span>
        <span className="text-gray-400">•</span>
        <span>SSL encrypted</span>
      </div>

      {/* Additional Info */}
      <div className="mt-6 space-y-3">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            Prices and shipping costs are confirmed before you complete your purchase.
          </p>
        </div>
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            You can return most items within 30 days of delivery for a full refund.
          </p>
        </div>
      </div>
    </div>
  );
}
