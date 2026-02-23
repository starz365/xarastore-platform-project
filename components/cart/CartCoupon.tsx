'use client';

import { useState } from 'react';
import { Tag, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CartCouponProps {
  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedCoupon: string | null;
  couponError: string | null;
  isApplying: boolean;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
}

export function CartCoupon({
  couponCode,
  setCouponCode,
  appliedCoupon,
  couponError,
  isApplying,
  onApplyCoupon,
  onRemoveCoupon,
}: CartCouponProps) {
  const [showCouponInput, setShowCouponInput] = useState(false);

  const availableCoupons = [
    { code: 'WELCOME10', description: '10% off first order' },
    { code: 'SAVE20', description: 'KES 200 off orders over KES 1,000' },
    { code: 'FREESHIP', description: 'Free shipping on any order' },
  ];

  return (
    <div className="mb-6">
      {/* Applied Coupon */}
      {appliedCoupon && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">
                  Coupon <span className="font-bold">{appliedCoupon}</span> applied
                </p>
                <p className="text-sm text-green-700">Discount has been applied to your order</p>
              </div>
            </div>
            <button
              onClick={onRemoveCoupon}
              className="p-1 hover:bg-green-100 rounded-full transition-colors"
              aria-label="Remove coupon"
            >
              <X className="w-4 h-4 text-green-600" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {couponError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{couponError}</p>
          </div>
        </div>
      )}

      {/* Coupon Input */}
      <div className="space-y-3">
        {!showCouponInput && !appliedCoupon ? (
          <button
            onClick={() => setShowCouponInput(true)}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium"
          >
            <Tag className="w-4 h-4" />
            <span>Have a coupon code?</span>
          </button>
        ) : !appliedCoupon ? (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <Input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1"
                maxLength={20}
              />
              <Button
                onClick={onApplyCoupon}
                disabled={!couponCode.trim() || isApplying}
                variant="primary"
              >
                {isApplying ? 'Applying...' : 'Apply'}
              </Button>
            </div>
            <button
              onClick={() => setShowCouponInput(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {/* Available Coupons */}
        {!appliedCoupon && (
          <div className="pt-2">
            <p className="text-sm text-gray-600 mb-2">Available coupons:</p>
            <div className="space-y-2">
              {availableCoupons.map((coupon) => (
                <div
                  key={coupon.code}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setCouponCode(coupon.code);
                    setShowCouponInput(true);
                  }}
                >
                  <div>
                    <span className="font-medium">{coupon.code}</span>
                    <p className="text-xs text-gray-600">{coupon.description}</p>
                  </div>
                  <button className="text-sm font-medium text-red-600 hover:text-red-700">
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
