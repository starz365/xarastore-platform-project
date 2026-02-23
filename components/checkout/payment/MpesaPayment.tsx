xarastore/components/checkout/payment/MpesaPayment.tsx
'use client';

import { useState } from 'react';
import { Phone, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/shared/Toast';

export function MpesaPayment() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [stkPushSent, setStkPushSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || phoneNumber.length !== 10) {
      toast.error('Invalid phone number', {
        description: 'Please enter a valid 10-digit Kenyan phone number.',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate M-Pesa API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would call your backend API
      // which then calls Safaricom's M-Pesa API
      const response = await fetch('/api/payment/mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: `254${phoneNumber.substring(1)}`,
          amount: 1000, // This should come from cart total
        }),
      });

      if (!response.ok) {
        throw new Error('Payment initiation failed');
      }

      setPaymentInitiated(true);
      setStkPushSent(true);
      
      toast.success('STK Push sent!', {
        description: 'Check your phone to complete the payment.',
      });

      // Simulate payment confirmation
      setTimeout(() => {
        setStkPushSent(false);
        toast.success('Payment confirmed!', {
          description: 'Your order has been successfully placed.',
        });
      }, 5000);

    } catch (error) {
      console.error('M-Pesa payment error:', error);
      toast.error('Payment failed', {
        description: 'Please try again or use a different payment method.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">M-Pesa Instructions</h3>
            <p className="text-sm text-green-700 mt-1">
              1. Enter your M-Pesa registered phone number<br />
              2. Check your phone for STK Push prompt<br />
              3. Enter your M-Pesa PIN to complete payment
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            M-Pesa Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500">+254</span>
            </div>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="712345678"
              className="pl-16"
              required
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Enter the 10-digit number (e.g., 712345678)
          </p>
        </div>

        {paymentInitiated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              {stkPushSent ? (
                <>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Waiting for confirmation</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Check your phone and enter your M-Pesa PIN when prompted.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900">Payment Successful!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      Your payment has been confirmed. Redirecting to order confirmation...
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading || paymentInitiated}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Initiating Payment...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Pay with M-Pesa
              </>
            )}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            By clicking "Pay with M-Pesa", you agree to our terms and conditions.
          </p>
        </div>
      </form>
    </div>
  );
}
