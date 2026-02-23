xarastore/components/checkout/payment/BankTransfer.tsx
'use client';

import { useState } from 'react';
import { Building2, Copy, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BankTransferProps {
  amount: number;
  orderNumber: string;
  onComplete: () => void;
}

export function BankTransfer({ amount, orderNumber, onComplete }: BankTransferProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bankDetails = {
    bankName: 'Equity Bank Kenya Limited',
    accountName: 'Xarastore Limited',
    accountNumber: '1234567890',
    branch: 'Nairobi CBD',
    branchCode: '068',
    swiftCode: 'EQBLKENA',
    instructions: 'Use Order Number as reference',
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleMarkAsPaid = () => {
    // In production, this would trigger a verification process
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Bank Transfer</h2>
        <p className="text-gray-600 mt-1">
          Transfer the exact amount to our bank account
        </p>
      </div>

      {/* Payment Amount */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="text-center">
          <div className="text-sm text-blue-600 mb-2">Transfer Amount</div>
          <div className="text-3xl font-bold text-gray-900 mb-4">
            KES {amount.toLocaleString('en-KE')}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Please complete within 24 hours
            </span>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-900">Bank Account Details</h3>
        
        {Object.entries(bankDetails).map(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          
          return (
            <div key={key} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">{label}</div>
                <div className="font-medium mt-1">{value}</div>
              </div>
              <button
                onClick={() => handleCopy(value, key)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={`Copy ${label}`}
              >
                {copiedField === key ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Important Notes */}
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900">Important Notes</h4>
              <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                <li>• Transfer the exact amount: KES {amount.toLocaleString('en-KE')}</li>
                <li>• Use Order Number <strong>{orderNumber}</strong> as reference</li>
                <li>• Keep your transfer receipt for verification</li>
                <li>• Orders will be processed after payment confirmation</li>
                <li>• Confirmation may take 1-3 business days</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Processing Time */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Processing Time</p>
              <p className="text-sm text-gray-600 mt-1">
                Orders are processed within 24 hours of payment confirmation.
                You'll receive an email once payment is verified.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleMarkAsPaid}
        >
          I've Completed the Transfer
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already transferred?{' '}
            <button
              onClick={() => {
                // In production, this would open a form to upload receipt
                console.log('Upload receipt clicked');
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Upload Receipt
            </button>
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a
              href="/help/bank-transfer"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              View detailed instructions
            </a>
          </p>
        </div>
      </div>

      {/* Payment Confirmation */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900">Payment Confirmation</h4>
            <p className="text-sm text-green-700 mt-1">
              After completing your transfer, please email your receipt to 
              <strong> payments@xarastore.com</strong> with your order number 
              <strong> {orderNumber}</strong> in the subject line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
