'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Lock, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

declare global {
  interface Window {
    google: any;
  }
}

interface GooglePayPaymentProps {
  amount: number;
  currency: string;
  orderId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export function GooglePayPayment({ amount, currency, orderId, onSuccess, onError }: GooglePayPaymentProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [googlePayError, setGooglePayError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Google Pay is available
    const checkGooglePay = () => {
      if (typeof window !== 'undefined' && window.google) {
        const paymentsClient = new google.payments.api.PaymentsClient({
          environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
        });

        paymentsClient.isReadyToPay({
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
              },
            },
          ],
        })
          .then((response: any) => {
            setIsAvailable(response.result);
          })
          .catch((error: any) => {
            console.error('Google Pay availability check failed:', error);
            setGooglePayError('Google Pay is not available');
            setIsAvailable(false);
          });
      } else {
        setIsAvailable(false);
        setGooglePayError('Google Pay SDK not loaded');
      }
    };

    // Load Google Pay SDK
    const script = document.createElement('script');
    script.src = 'https://pay.google.com/gp/p/js/pay.js';
    script.async = true;
    
    script.onload = () => {
      checkGooglePay();
    };
    
    script.onerror = () => {
      setGooglePayError('Failed to load Google Pay SDK');
      setIsAvailable(false);
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initiateGooglePay = async () => {
    if (!isAvailable || isProcessing) return;

    setIsProcessing(true);
    setGooglePayError(null);

    try {
      const paymentsClient = new google.payments.api.PaymentsClient({
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
      });

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
              billingAddressRequired: true,
              billingAddressParameters: {
                format: 'FULL',
                phoneNumberRequired: true,
              },
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'example',
                gatewayMerchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
              },
            },
          },
        ],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toFixed(2),
          currencyCode: currency,
          countryCode: 'KE',
          displayItems: [
            {
              label: `Order #${orderId}`,
              price: amount.toFixed(2),
              type: 'LINE_ITEM',
            },
          ],
        },
        merchantInfo: {
          merchantId: process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID,
          merchantName: 'Xarastore',
        },
        callbackIntents: ['PAYMENT_AUTHORIZATION'],
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      // Process payment with backend
      const response = await fetch('/api/payment/googlepay/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          paymentData,
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      const paymentResult = await response.json();

      if (paymentResult.status === 'success') {
        onSuccess(paymentResult);
      } else {
        throw new Error(paymentResult.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Google Pay error:', error);
      
      // Check for specific error types
      if (error.statusCode === 'CANCELED') {
        setGooglePayError('Payment was cancelled');
        onError('Payment was cancelled');
      } else if (error.statusCode === 'DEVELOPER_ERROR') {
        setGooglePayError('Configuration error. Please try another method.');
        onError('Payment configuration error');
      } else {
        setGooglePayError(error.message || 'Payment failed');
        onError(error.message || 'Payment processing failed');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Google Pay Not Available</h3>
          <p className="text-gray-600 mb-6">
            {googlePayError || 'Google Pay is not supported on this device or browser.'}
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How to use Google Pay</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Use Chrome browser on Android, iOS, or desktop</li>
            <li>• Ensure you have a supported payment method in Google Pay</li>
            <li>• Sign in to your Google account</li>
            <li>• Enable Google Pay in your device settings</li>
          </ul>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => {
            // Switch to another payment method
            console.log('Switch payment method');
          }}
        >
          Use Another Payment Method
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-2xl font-bold text-gray-800">G</div>
          <div className="text-2xl font-bold text-blue-600">Pay</div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Google Pay</h2>
        <p className="text-gray-600 mt-1">
          Pay faster and more securely
        </p>
      </div>

      {/* Payment Amount */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">Amount to Pay</div>
          <div className="text-3xl font-bold text-gray-900">
            {currency} {amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Google Pay Button */}
      <div className="space-y-4">
        <Button
          variant="default"
          size="lg"
          className="w-full bg-white border-2 border-gray-800 text-gray-900 hover:bg-gray-50"
          onClick={initiateGooglePay}
          disabled={isProcessing || !isAvailable}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <div className="mr-2 flex items-center">
                <div className="text-lg font-bold text-gray-800">G</div>
                <div className="text-lg font-bold text-blue-600">Pay</div>
              </div>
              Pay with Google Pay
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            You'll need to authenticate with your device security method.
          </p>
        </div>
      </div>

      {/* Security Features */}
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Google Pay Security</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Your actual card number is never shared</li>
                <li>• Payments are authenticated with your device</li>
                <li>• Virtual account number for each transaction</li>
                <li>• Google's fraud protection</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Why use Google Pay?</h4>
              <p className="text-sm text-green-700 mt-1">
                Check out faster with your saved payment methods. 
                Your payment info is secure and never shared with the merchant.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Not working?</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Make sure you're signed in to your Google account and 
              have a payment method added to Google Pay.
            </p>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Need help with Google Pay?{' '}
          <a
            href="https://pay.google.com/about/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Visit Google Pay Help
          </a>
        </p>
      </div>
    </div>
  );
}
