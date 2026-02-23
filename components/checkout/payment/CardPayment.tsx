xarastore/components/checkout/payment/CardPayment.tsx
'use client';

import { useState } from 'react';
import { CreditCard, Calendar, Lock, User, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CardPaymentProps {
  onSubmit: (cardData: any) => Promise<void>;
  onError: (error: string) => void;
}

export function CardPayment({ onSubmit, onError }: CardPaymentProps) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false,
  });

  const [showCVV, setShowCVV] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '';
  };

  const validateCardNumber = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    
    // Check if it's a valid length
    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const getCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'unknown';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Card number validation
    const cleanedCardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cleanedCardNumber) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!/^\d{13,19}$/.test(cleanedCardNumber)) {
      newErrors.cardNumber = 'Card number must be 13-19 digits';
    } else if (!validateCardNumber(cleanedCardNumber)) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Card holder validation
    if (!formData.cardHolder.trim()) {
      newErrors.cardHolder = 'Card holder name is required';
    } else if (formData.cardHolder.trim().length < 3) {
      newErrors.cardHolder = 'Please enter full name';
    }

    // Expiry month validation
    const month = parseInt(formData.expiryMonth);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear() % 100;
    
    if (!formData.expiryMonth) {
      newErrors.expiryMonth = 'Month is required';
    } else if (month < 1 || month > 12) {
      newErrors.expiryMonth = 'Invalid month';
    } else if (parseInt(formData.expiryYear) === currentYear && month < currentMonth) {
      newErrors.expiryMonth = 'Card has expired';
    }

    // Expiry year validation
    const year = parseInt(formData.expiryYear);
    if (!formData.expiryYear) {
      newErrors.expiryYear = 'Year is required';
    } else if (year < currentYear) {
      newErrors.expiryYear = 'Card has expired';
    } else if (year > currentYear + 20) {
      newErrors.expiryYear = 'Invalid year';
    }

    // CVV validation
    const cardType = getCardType(formData.cardNumber);
    const cvvLength = cardType === 'amex' ? 4 : 3;
    
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!new RegExp(`^\\d{${cvvLength}}$`).test(formData.cvv)) {
      newErrors.cvv = cardType === 'amex' ? 'Enter 4-digit CVV' : 'Enter 3-digit CVV';
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
      const cardData = {
        number: formData.cardNumber.replace(/\s/g, ''),
        holder: formData.cardHolder.trim().toUpperCase(),
        expiry: `${formData.expiryMonth.padStart(2, '0')}/${formData.expiryYear}`,
        cvv: formData.cvv,
        type: getCardType(formData.cardNumber),
        save: formData.saveCard,
      };

      await onSubmit(cardData);
    } catch (error: any) {
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardType = getCardType(formData.cardNumber);

  return (
    <div className="space-y-6">
      {/* Card Preview */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-start mb-8">
          <div>
            <CreditCard className="w-8 h-8 mb-2" />
            <div className="text-sm opacity-90">CARD NUMBER</div>
            <div className="text-xl font-mono tracking-wider mt-1">
              {formData.cardNumber || '•••• •••• •••• ••••'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">VALID THRU</div>
            <div className="text-lg font-mono">
              {formData.expiryMonth && formData.expiryYear 
                ? `${formData.expiryMonth}/${formData.expiryYear}`
                : '••/••'}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-sm opacity-90">CARD HOLDER</div>
            <div className="text-lg font-medium">
              {formData.cardHolder || 'YOUR NAME'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">CVV</div>
            <div className="text-lg font-mono">
              {showCVV ? formData.cvv || '•••' : '•••'}
            </div>
          </div>
        </div>
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
          {cardType !== 'unknown' && formData.cardNumber && (
            <div className="mt-1 flex items-center space-x-2">
              <span className="text-xs text-gray-600">Card type:</span>
              <span className="text-xs font-medium capitalize">{cardType}</span>
            </div>
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
              Month *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="expiryMonth"
                value={formData.expiryMonth}
                onChange={(e) => setFormData({ ...formData, expiryMonth: e.target.value })}
                className={`w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all outline-none ${errors.expiryMonth ? 'border-red-500' : ''}`}
                required
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  return (
                    <option key={month} value={month.toString().padStart(2, '0')}>
                      {month.toString().padStart(2, '0')} - {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  );
                })}
              </select>
            </div>
            {errors.expiryMonth && (
              <p className="mt-1 text-sm text-red-600">{errors.expiryMonth}</p>
            )}
          </div>

          {/* Expiry Year */}
          <div>
            <label htmlFor="expiryYear" className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <select
              id="expiryYear"
              value={formData.expiryYear}
              onChange={(e) => setFormData({ ...formData, expiryYear: e.target.value })}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all outline-none ${errors.expiryYear ? 'border-red-500' : ''}`}
              required
            >
              <option value="">Year</option>
              {Array.from({ length: 10 }, (_, i) => {
                const year = (new Date().getFullYear() % 100) + i;
                return (
                  <option key={year} value={year.toString()}>
                    {year.toString().padStart(2, '0')}
                  </option>
                );
              })}
            </select>
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
                type={showCVV ? 'text' : 'password'}
                value={formData.cvv}
                onChange={(e) => setFormData({
                  ...formData,
                  cvv: e.target.value.replace(/\D/g, '').slice(0, cardType === 'amex' ? 4 : 3),
                })}
                className={`pl-10 pr-10 ${errors.cvv ? 'border-red-500' : ''}`}
                placeholder={cardType === 'amex' ? '1234' : '123'}
                maxLength={cardType === 'amex' ? 4 : 3}
                required
              />
              <button
                type="button"
                onClick={() => setShowCVV(!showCVV)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCVV ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.cvv && (
              <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {cardType === 'amex' ? '4 digits on front' : '3 digits on back'}
            </p>
          </div>
        </div>

        {/* Save Card */}
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
            <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">100% Secure Payment</p>
              <p className="text-sm text-gray-600 mt-1">
                • Card details are encrypted using SSL<br />
                • We never store your CVV number<br />
                • PCI-DSS compliant<br />
                • 3D Secure authentication
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
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
              Processing...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Pay Securely
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
