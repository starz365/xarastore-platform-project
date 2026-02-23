'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Building2, Lock } from 'lucide-react';
import { MpesaPayment } from './payment/MpesaPayment';
import { CardPayment } from './payment/CardPayment';
import { BankTransfer } from './payment/BankTransfer';

interface PaymentMethodsProps {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
}

export function PaymentMethods({ selectedMethod, onSelectMethod }: PaymentMethodsProps) {
  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Pay instantly via M-Pesa',
      icon: Smartphone,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, Amex',
      icon: CreditCard,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: Building2,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Method Selection */}
      <div className="grid grid-cols-3 gap-4">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          return (
            <button
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              className={`p-4 border rounded-lg text-center transition-all ${
                selectedMethod === method.id
                  ? 'border-red-600 ring-2 ring-red-600/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 ${method.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-1">{method.name}</h3>
              <p className="text-xs text-gray-600">{method.description}</p>
            </button>
          );
        })}
      </div>

      {/* Payment Form */}
      <div className="border-t border-gray-200 pt-6">
        {selectedMethod === 'mpesa' && <MpesaPayment />}
        {selectedMethod === 'card' && <CardPayment />}
        {selectedMethod === 'bank' && <BankTransfer />}
      </div>

      {/* Security Info */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <Lock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Secure Payment Guarantee</p>
            <p className="text-sm text-gray-600 mt-1">
              Your payment information is encrypted and secure. We never store your card details.
              All transactions are protected by SSL encryption and PCI compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
