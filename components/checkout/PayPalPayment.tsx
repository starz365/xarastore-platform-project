'use client';

import { useEffect, useState } from 'react';
import { PayPalLogo, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

declare global {
  interface Window {
    paypal: any;
  }
}

interface PayPalPaymentProps {
  amount: number;
  currency: string;
  orderId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export function PayPalPayment({ amount, currency, orderId, onSuccess, onError }: PayPalPaymentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=${currency}`;
    script.async = true;
    
    script.onload = () => {
      setPaypalLoaded(true);
      setIsLoading(false);
    };
    
    script.onerror = () => {
      setPaypalError('Failed to load PayPal SDK');
      setIsLoading(false);
      onError('PayPal service is currently unavailable');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [currency, onError]);

  useEffect(() => {
    if (!paypalLoaded || !window.paypal) return;

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 55,
        },

        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              description: `Order #${orderId}`,
              amount: {
                value: amount.toFixed(2),
                currency_code: currency,
                breakdown: {
                  item_total: {
                    value: amount.toFixed(2),
                    currency_code: currency,
                  },
                },
              },
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          });
        },

        onApprove: async (data: any, actions: any) => {
          try {
            setIsLoading(true);
            
            const details = await actions.order.capture();
            
            // Send payment confirmation to backend
            const response = await fetch('/api/payment/paypal/confirm', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId,
                paymentId: details.id,
                payer: details.payer,
                amount,
                currency,
              }),
            });

            if (!response.ok) {
              throw new Error('Payment confirmation failed');
            }

            const paymentData = await response.json();
            onSuccess(paymentData);
          } catch (error: any) {
            console.error('PayPal approval error:', error);
            onError(error.message || 'Payment approval failed');
          } finally {
            setIsLoading(false);
          }
        },

        onError: (err: any) => {
          console.error('PayPal error:', err);
          onError('Payment processing failed. Please try again.');
          setIsLoading(false);
        },

        onCancel: (data: any) => {
          console.log('PayPal payment cancelled');
          onError('Payment was cancelled');
        },
      }).render('#paypal-button-container');
    } catch (error: any) {
      console.error('PayPal button initialization error:', error);
      setPaypalError('Failed to initialize PayPal');
      onError('PayPal service is currently unavailable');
    }
  }, [paypalLoaded, amount, currency, orderId, onSuccess, onError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
        <p className="text-gray-600">Loading PayPal...</p>
      </div>
    );
  }

  if (paypalError) {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PayPalLogo className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">PayPal Unavailable</h3>
        <p className="text-gray-600 mb-6">{paypalError}</p>
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PayPalLogo className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">PayPal</h2>
        <p className="text-gray-600 mt-1">
          Pay securely with your PayPal account
        </p>
      </div>

      {/* PayPal Button Container */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div id="paypal-button-container"></div>
      </div>

      {/* PayPal Info */}
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Why use PayPal?</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Pay without sharing your card details</li>
            <li>• Fast and secure checkout</li>
            <li>• Buyer protection on all purchases</li>
            <li>• Use your PayPal balance or linked cards</li>
          </ul>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-600 font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-900">Important</p>
              <p className="text-sm text-yellow-700 mt-1">
                You'll be redirected to PayPal to complete your payment.
                Return to this page after successful payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Options */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have PayPal?{' '}
          <button
            onClick={() => {
              // Switch to another payment method
              console.log('Switch payment method');
            }}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Use another payment method
          </button>
        </p>
      </div>
    </div>
  );
}
