'use client';

import { useEffect, useState } from 'react';
import { Apple, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ApplePayPaymentProps {
  amount: number;
  currency: string;
  orderId: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export function ApplePayPayment({ amount, currency, orderId, onSuccess, onError }: ApplePayPaymentProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [applePayError, setApplePayError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Apple Pay is available
    if (typeof window !== 'undefined' && window.ApplePaySession) {
      const canMakePayments = ApplePaySession.canMakePayments();
      setIsAvailable(canMakePayments);
      
      if (!canMakePayments) {
        setApplePayError('Apple Pay is not available on this device');
      }
    } else {
      setIsAvailable(false);
      setApplePayError('Apple Pay is not supported in this browser');
    }
  }, []);

  const initiateApplePay = async () => {
    if (!isAvailable || isProcessing) return;

    setIsProcessing(true);
    setApplePayError(null);

    try {
      // Define payment request
      const paymentRequest = {
        countryCode: 'KE',
        currencyCode: currency,
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: `Xarastore Order #${orderId}`,
          amount: amount.toFixed(2),
          type: 'final' as const,
        },
        lineItems: [
          {
            label: 'Order Total',
            amount: amount.toFixed(2),
          },
        ],
        requiredBillingContactFields: ['postalAddress', 'name', 'email', 'phone'],
        requiredShippingContactFields: [],
      };

      // Create Apple Pay session
      const session = new ApplePaySession(4, paymentRequest);

      // Handle validation
      session.onvalidatemerchant = async (event) => {
        try {
          const response = await fetch('/api/payment/applepay/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              validationUrl: event.validationURL,
              domainName: window.location.hostname,
            }),
          });

          if (!response.ok) {
            throw new Error('Merchant validation failed');
          }

          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error: any) {
          console.error('Apple Pay validation error:', error);
          session.abort();
          onError('Payment validation failed');
          setIsProcessing(false);
        }
      };

      // Handle payment authorization
      session.onpaymentauthorized = async (event) => {
        try {
          const payment = event.payment;
          
          // Process payment with backend
          const response = await fetch('/api/payment/applepay/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId,
              paymentData: payment.token.paymentData,
              billingContact: payment.billingContact,
              shippingContact: payment.shippingContact,
              amount,
              currency,
            }),
          });

          if (!response.ok) {
            throw new Error('Payment processing failed');
          }

          const paymentResult = await response.json();

          if (paymentResult.status === 'success') {
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
            onSuccess(paymentResult);
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            throw new Error(paymentResult.message || 'Payment failed');
          }
        } catch (error: any) {
          console.error('Apple Pay authorization error:', error);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          onError(error.message || 'Payment authorization failed');
        } finally {
          setIsProcessing(false);
        }
      };

      // Handle session cancellation
      session.oncancel = () => {
        setIsProcessing(false);
        onError('Payment was cancelled');
      };

      // Begin the session
      session.begin();
    } catch (error: any) {
      console.error('Apple Pay initiation error:', error);
      setApplePayError(error.message || 'Failed to initiate Apple Pay');
      setIsProcessing(false);
      onError('Apple Pay service is currently unavailable');
    }
  };

  if (!isAvailable) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Apple className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Apple Pay Not Available</h3>
          <p className="text-gray-600 mb-6">
            {applePayError || 'Apple Pay is not supported on this device or browser.'}
          </p>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">How to use Apple Pay</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            <li>• Use Safari browser on iPhone, iPad, or Mac</li>
            <li>• Ensure you have a supported payment card in Wallet</li>
            <li>• Enable Apple Pay in your device settings</li>
            <li>• Sign in with your Apple ID</li>
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
        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
          <Apple className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Apple Pay</h2>
        <p className="text-gray-600 mt-1">
          Pay securely with Touch ID or Face ID
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

      {/* Apple Pay Button */}
      <div className="space-y-4">
        <Button
          variant="default"
          size="lg"
          className="w-full bg-black hover:bg-gray-900 text-white"
          onClick={initiateApplePay}
          disabled={isProcessing || !isAvailable}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Apple className="w-5 h-5 mr-2" />
              Pay with Apple Pay
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            You'll need to authenticate with Face ID, Touch ID, or passcode.
          </p>
        </div>
      </div>

      {/* Security Features */}
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Apple Pay Security</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• Your card number is never shared with merchants</li>
                <li>• Payments are authenticated with Face ID/Touch ID</li>
                <li>• Device-specific number and unique transaction code</li>
                <li>• Built-in fraud protection</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Why use Apple Pay?</h4>
              <p className="text-sm text-green-700 mt-1">
                Faster, more secure checkout. Your actual card numbers are never 
                shared, and you don't have to manually enter your payment details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Support */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Need help with Apple Pay?{' '}
          <a
            href="https://support.apple.com/apple-pay"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Visit Apple Support
          </a>
        </p>
      </div>
    </div>
  );
}
