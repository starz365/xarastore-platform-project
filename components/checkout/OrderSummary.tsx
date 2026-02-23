'use client';

import { useState } from 'react';
import { Package, Truck, Shield, Clock, AlertCircle } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency, calculateShipping, calculateTax } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';

export function OrderSummary() {
  const { items, getTotal } = useCart();
  const [expanded, setExpanded] = useState(false);

  const subtotal = getTotal();
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const total = Math.max(0, subtotal + shipping + tax);

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
        <p className="text-gray-600 mt-1">
          {items.length} item{items.length !== 1 ? 's' : ''} in your order
        </p>
      </div>

      {/* Items List */}
      <div className="p-6">
        <div className="space-y-4">
          {items.slice(0, expanded ? undefined : 3).map((item) => (
            <div key={item.id} className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.variant.image && (
                  <img
                    src={item.variant.image}
                    alt={item.variant.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-2">
                  {item.variant.name}
                </h4>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-600 text-sm">
                    Qty: {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.variant.price * item.quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {items.length > 3 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              + {items.length - 3} more items
            </button>
          )}

          {expanded && items.length > 3 && (
            <button
              onClick={() => setExpanded(false)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="p-6 border-t border-gray-200">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  Add {formatCurrency(2000 - subtotal)} more for FREE shipping
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-4 mt-4">
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
      </div>

      {/* Delivery Estimate */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <Truck className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium">Estimated Delivery</p>
            <p className="text-sm text-gray-600">
              {estimatedDelivery.toLocaleDateString('en-KE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      <div className="p-6 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm">Easy returns</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm">Secure payment</span>
          </div>
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm">Fast delivery</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm">24/7 support</span>
          </div>
        </div>
      </div>

      {/* Need Help */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600 mb-3">Need help with your order?</p>
        <Button variant="secondary" size="sm" className="w-full">
          Contact Customer Support
        </Button>
      </div>
    </div>
  );
}
