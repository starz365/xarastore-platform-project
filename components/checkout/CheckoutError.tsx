'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, ShoppingBag, Home, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CheckoutErrorProps {
  errorCode: string;
  errorMessage: string;
  orderId?: string;
  onRetry?: () => void;
}

export function CheckoutError({
  errorCode,
  errorMessage,
  orderId,
  onRetry,
}: CheckoutErrorProps) {
  const router = useRouter();

  const commonErrors: Record<string, { title: string; solution: string }> = {
    'PAYMENT_FAILED': {
      title: 'Payment Processing Failed',
      solution: 'Please check your payment details and try again, or use a different payment method.',
    },
    'INSUFFICIENT_STOCK': {
      title: 'Items Out of Stock',
      solution: 'Some items in your cart are no longer available. Please update your cart and try again.',
    },
    'NETWORK_ERROR': {
      title: 'Network Connection Issue',
      solution: 'Please check your internet connection and try again.',
    },
    'SESSION_EXPIRED': {
      title: 'Session Expired',
      solution: 'Your session has expired. Please sign in again and retry your order.',
    },
    'ADDRESS_INVALID': {
      title: 'Invalid Shipping Address',
      solution: 'Please verify your shipping address details and try again.',
    },
    'DEFAULT': {
      title: 'Something Went Wrong',
      solution: 'Please try again or contact our support team for assistance.',
    },
  };

  const errorInfo = commonErrors[errorCode] || commonErrors.DEFAULT;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white py-12">
      <div className="container-responsive">
        <div className="max-w-2xl mx-auto">
          {/* Error Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {errorInfo.title}
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {errorMessage}
            </p>
            {orderId && (
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                Reference: {orderId}
              </div>
            )}
          </div>

          {/* Error Details */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-3">What happened?</h3>
                <p className="text-gray-600">
                  We encountered an issue while processing your order. This could be due to:
                </p>
                <ul className="mt-3 space-y-2">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Payment authorization failure</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Network connectivity issues</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Temporary system maintenance</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">Browser cache or cookie issues</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3">How to fix it</h3>
                <p className="text-gray-600 mb-3">
                  {errorInfo.solution}
                </p>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Check your details</p>
                      <p className="text-sm text-gray-600">Verify payment information and shipping address</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Try a different method</p>
                      <p className="text-sm text-gray-600">Use an alternative payment method</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Contact support</p>
                      <p className="text-sm text-gray-600">Get help from our customer service team</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Assurance */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Your payment is safe</p>
                    <p className="text-sm text-green-700 mt-1">
                      No charges were made to your account. If you see a pending charge,
                      it will be automatically reversed within 1-3 business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={onRetry}
              className="w-full"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/cart')}
              className="w-full"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Back to Cart
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/help')}
              className="w-full"
            >
              <Phone className="w-5 h-5 mr-2" />
              Contact Support
            </Button>
          </div>

          {/* Contact Information */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center">
              <h3 className="font-bold text-gray-900 mb-4">Need Immediate Help?</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Phone className="w-5 h-5 text-red-600" />
                  <span className="font-medium">0700 123 456</span>
                </div>
                <p className="text-gray-600">Available 24/7</p>
                <p className="text-sm text-gray-500">
                  Or email us at: support@xarastore.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
