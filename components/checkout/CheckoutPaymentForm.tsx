'use client';

import { useState } from 'react';
import { CreditCard, Calendar, Lock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CheckoutPaymentFormProps {
  onPaymentSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export function CheckoutPaymentForm({ onPaymentSuccess, onError }: CheckoutPaymentFormProps) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Card number validation
    const cleanedCardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cleanedCardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{16}$/.test(cleanedCardNumber)) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }

    // Card holder validation
    if (!formData.cardHolder.trim()) {
      newErrors.cardHolder = 'Card holder name is required';
    } else if (formData.cardHolder.trim().length < 3) {
      newErrors.cardHolder = 'Please enter full name';
    }

    // Expiry month validation
    const month = parseInt(formData.expiryMonth);
    if (!formData.expiryMonth) {
      newErrors.expiryMonth = 'Month is required';
    } else if (month < 1 || month > 12) {
      newErrors.expiryMonth = 'Invalid month';
    }

    // Expiry year validation
    const year = parseInt(formData.expiryYear);
    const currentYear = new Date().getFullYear() % 100;
    if (!formData.expiryYear) {
      newErrors.expiryYear = 'Year is required';
    } else if (year < currentYear) {
      newErrors.expiryYear = 'Card has expired';
    }

    // CVV validation
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'Invalid CVV';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      onError('Please fix the errors in the form');
      return;
    }

    setIsProcessing(true);

    try {
      // Process payment via Stripe or other payment gateway
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'card',
          data: {
            number: formData.cardNumber.replace(/\s/g, ''),
            holder: formData.cardHolder,
            expiry: `${formData.expiryMonth.padStart(2, '0')}/${formData.expiryYear}`,
            cvv: formData.cvv,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment processing failed');
      }

      onPaymentSuccess(data);
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Card Payment</h2>
        <p className="text-gray-600 mt-1">
          Enter your card details securely
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card Number */}
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Card Number *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="cardNumber"
              value={formData.cardNumber}
              onChange={(e) => setFormData({
                ...formData,
                cardNumber: formatCardNumber(e.target.value),
              })}
              className={`pl-10 ${errors.cardNumber ? 'border-red-500' : ''}`}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
            />
          </div>
          {errors.cardNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
          )}
        </div>

        {/* Card Holder */}
        <div>
          <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 mb-2">
            Card Holder Name *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="cardHolder"
              value={formData.cardHolder}
              onChange={(e) => setFormData({
                ...formData,
                cardHolder: e.target.value.toUpperCase(),
              })}
              className={`pl-10 ${errors.cardHolder ? 'border-red-500' : ''}`}
              placeholder="JOHN DOE"
              required
            />
          </div>
          {errors.cardHolder && (
            <p className="mt-1 text-sm text-red-600">{errors.cardHolder}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Expiry Month */}
          <div>
            <label htmlFor="expiryMonth" className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Month *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="expiryMonth"
                value={formData.expiryMonth}
                onChange={(e) => setFormData({
                  ...formData,
                  expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2),
                })}
                className={`pl-10 ${errors.expiryMonth ? 'border-red-500' : ''}`}
                placeholder="MM"
                maxLength={2}
                required
              />
            </div>
            {errors.expiryMonth && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryMonth}</p>
            )}
          </div>

          {/* Expiry Year */}
          <div>
            <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Year *
            </label>
            <Input
              id="expiryYear"
              value={formData.expiryYear}
              onChange={(e) => setFormData({
                ...formData,
                expiryYear: e.target.value.replace(/\D/g, '').slice(0, 2),
              })}
              className={errors.expiryYear ? 'border-red-500' : ''}
              placeholder="YY"
              maxLength={2}
              required
            />
            {errors.expiryYear && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryYear}</p>
            )}
          </div>

          {/* CVV */}
          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-2">
              CVV *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="cvv"
                type="password"
                value={formData.cvv}
                onChange={(e) => setFormData({
                  ...formData,
                  cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                })}
                className={`pl-10 ${errors.cvv ? 'border-red-500' : ''}`}
                placeholder="123"
                maxLength={4}
                required
              />
            </div>
            {errors.cvv && (
              <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
            )}
          </div>
        </div>

        {/* Save Card Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="saveCard"
            checked={formData.saveCard}
            onChange={(e) => setFormData({ ...formData, saveCard: e.target.checked })}
            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-600"
          />
          <label htmlFor="saveCard" className="ml-2 text-sm text-gray-700">
            Save this card for future purchases
          </label>
        </div>

        {/* Security Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Secure Payment</p>
              <p className="text-sm text-gray-600 mt-1">
                Your card details are encrypted and secure. We never store your CVV.
                All transactions are protected by SSL encryption and PCI compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Accepted Cards */}
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">We accept:</span>
          <div className="flex space-x-2">
            <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div className="w-10 h-6 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">MC</span>
            </div>
            <div className="w-10 h-6 bg-blue-800 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">AMEX</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-200">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Pay Securely
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            By clicking "Pay Securely", you agree to our terms and conditions.
          </p>
        </div>
      </form>
    </div>
  );
}
