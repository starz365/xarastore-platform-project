'use client';

import { useState } from 'react';
import { Check, Edit, Package, Truck, MapPin, CreditCard, Shield } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';

interface CheckoutReviewProps {
  shippingAddress: any;
  paymentMethod: string;
  deliveryMethod: string;
  onEditSection: (section: string) => void;
  onPlaceOrder: () => Promise<void>;
}

export function CheckoutReview({
  shippingAddress,
  paymentMethod,
  deliveryMethod,
  onEditSection,
  onPlaceOrder,
}: CheckoutReviewProps) {
  const { items, getTotal } = useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = getTotal();
  const shipping = deliveryMethod === 'standard' ? 299 : deliveryMethod === 'express' ? 699 : 999;
  const tax = subtotal * 0.16;
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      await onPlaceOrder();
    } catch (error) {
      console.error('Failed to place order:', error);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Review Your Order</h2>
        <p className="text-gray-600 mt-1">
          Please review all details before placing your order
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Order Summary</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditSection('cart')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                  {item.variant.image && (
                    <img
                      src={item.variant.image}
                      alt={item.variant.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{item.variant.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
              </div>
              <span className="font-medium">
                {formatCurrency(item.variant.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 space-y-2">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-medium">
              {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span className="font-medium">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-red-600" />
            <h3 className="font-bold">Shipping Address</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditSection('address')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        {shippingAddress && (
          <div className="space-y-2">
            <p className="font-medium">{shippingAddress.name}</p>
            <p className="text-gray-600">{shippingAddress.street}</p>
            {shippingAddress.apartment && (
              <p className="text-gray-600">{shippingAddress.apartment}</p>
            )}
            <p className="text-gray-600">
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
            </p>
            <p className="text-gray-600">{shippingAddress.country}</p>
            <p className="text-gray-600">Phone: {shippingAddress.phone}</p>
            {shippingAddress.instructions && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Delivery Instructions:</p>
                <p className="text-sm text-gray-600 mt-1">{shippingAddress.instructions}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery Method */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-red-600" />
            <h3 className="font-bold">Delivery Method</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditSection('delivery')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {deliveryMethod === 'standard' && 'Standard Delivery (3-5 business days)'}
              {deliveryMethod === 'express' && 'Express Delivery (1-2 business days)'}
              {deliveryMethod === 'same-day' && 'Same Day Delivery'}
            </p>
            <p className="text-sm text-gray-600">
              Estimated delivery: {new Date(Date.now() + (deliveryMethod === 'standard' ? 5 : deliveryMethod === 'express' ? 2 : 1) * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
          <span className="font-bold">
            {shipping === 0 ? 'FREE' : formatCurrency(shipping)}
          </span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-red-600" />
            <h3 className="font-bold">Payment Method</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditSection('payment')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {paymentMethod === 'mpesa' && 'M-Pesa'}
              {paymentMethod === 'card' && 'Credit/Debit Card'}
              {paymentMethod === 'bank' && 'Bank Transfer'}
            </p>
            <p className="text-sm text-gray-600">
              {paymentMethod === 'mpesa' && 'Pay instantly via M-Pesa'}
              {paymentMethod === 'card' && 'Secure card payment'}
              {paymentMethod === 'bank' && 'Direct bank transfer'}
            </p>
          </div>
          <Shield className="w-5 h-5 text-green-600" />
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-600 mt-0.5"
            required
          />
          <div>
            <label htmlFor="terms" className="text-sm font-medium text-gray-900">
              I agree to the Terms and Conditions
            </label>
            <p className="text-sm text-gray-600 mt-1">
              By placing your order, you agree to our Terms of Service, Privacy Policy,
              and that you are at least 18 years old. You also agree to receive
              order updates via email and SMS.
            </p>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="pt-6 border-t border-gray-200">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          {isPlacingOrder ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            <>
              <Package className="w-5 h-5 mr-2" />
              Place Order
            </>
          )}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-3">
          You will be redirected to complete payment
        </p>
      </div>
    </div>
  );
}
