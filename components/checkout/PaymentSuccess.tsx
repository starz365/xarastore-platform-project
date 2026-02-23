'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Package, Truck, Mail, Download, Share2, Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface PaymentSuccessProps {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  estimatedDelivery: string;
  customerEmail: string;
}

export function PaymentSuccess({
  orderId,
  orderNumber,
  amount,
  currency,
  paymentMethod,
  estimatedDelivery,
  customerEmail,
}: PaymentSuccessProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Track conversion
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: orderId,
          value: amount,
          currency: currency,
          items: [],
        },
      });
    }

    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/account/orders/${orderId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [orderId, amount, currency, router]);

  const handleDownloadReceipt = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/receipt`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  const handleShareOrder = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Xarastore Order #${orderNumber}`,
          text: `I just placed an order on Xarastore! Order #${orderNumber}`,
          url: window.location.origin,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(
        `I just placed an order on Xarastore! Order #${orderNumber}`
      );
      alert('Order details copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="container-responsive">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600">
              Thank you for your order. Your payment has been confirmed.
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Order #{orderNumber}
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Package className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-gray-900">Order Details</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-medium">{orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">
                        {new Date().toLocaleDateString('en-KE', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-green-600">Paid</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Truck className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-gray-900">Delivery</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">Estimated Delivery:</p>
                    <p className="font-medium">{estimatedDelivery}</p>
                    <p className="text-sm text-gray-500">
                      You'll receive tracking information via email.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Mail className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-gray-900">Confirmation</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">Confirmation sent to:</p>
                    <p className="font-medium">{customerEmail}</p>
                    <p className="text-sm text-gray-500">
                      Check your inbox for order details and receipt.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Payment Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-medium">
                        {currency} {amount.toLocaleString('en-KE')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium capitalize">{paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className="font-medium text-green-600">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">What Happens Next?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-blue-600 font-bold">1</div>
                </div>
                <h3 className="font-semibold mb-2">Order Processing</h3>
                <p className="text-sm text-gray-600">
                  We'll prepare your items within 24 hours.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-green-600 font-bold">2</div>
                </div>
                <h3 className="font-semibold mb-2">Shipping</h3>
                <p className="text-sm text-gray-600">
                  You'll get tracking info once shipped.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="text-purple-600 font-bold">3</div>
                </div>
                <h3 className="font-semibold mb-2">Delivery</h3>
                <p className="text-sm text-gray-600">
                  Receive your order at your doorstep.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push(`/account/orders/${orderId}`)}
              className="w-full"
            >
              <Package className="w-5 h-5 mr-2" />
              View Order Details
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/shop')}
              className="w-full"
            >
              <ShoppingBag className="w-5 h-5 mr-2" />
              Continue Shopping
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleDownloadReceipt}
              className="w-full"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleShareOrder}
              className="w-full"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Share Order
            </Button>
          </div>

          {/* Auto-redirect Notice */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-700">
              Redirecting to order details in {countdown} seconds...
            </p>
            <button
              onClick={() => router.push(`/account/orders/${orderId}`)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
            >
              Go now
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center space-y-4">
              <h3 className="font-bold text-gray-900">Need Help?</h3>
              <p className="text-gray-600">
                Our customer support team is available 24/7 to assist you.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button variant="secondary">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support
                </Button>
                <Button variant="secondary">
                  <Home className="w-4 h-4 mr-2" />
                  Help Center
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
