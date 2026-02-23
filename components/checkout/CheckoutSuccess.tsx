'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Package, Truck, Mail, Smartphone, Download, Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/hooks/useCart';

interface CheckoutSuccessProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  estimatedDelivery: string;
}

export function CheckoutSuccess({
  orderId,
  orderNumber,
  customerEmail,
  estimatedDelivery,
}: CheckoutSuccessProps) {
  const router = useRouter();
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart after successful order
    clearCart();
    
    // Track conversion
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'purchase',
        orderId,
        orderNumber,
      });
    }
  }, [orderId, orderNumber, clearCart]);

  const handleContinueShopping = () => {
    router.push('/shop');
  };

  const handleViewOrder = () => {
    router.push(`/account/orders/${orderId}`);
  };

  const handleDownloadInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12">
      <div className="container-responsive">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Order Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Thank you for your purchase. Your order is being processed.
            </p>
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Order #: {orderNumber}
            </div>
          </div>

          {/* Order Details */}
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
                    <p className="text-gray-600">Order ID: <span className="font-medium">{orderId}</span></p>
                    <p className="text-gray-600">Date: <span className="font-medium">{new Date().toLocaleDateString('en-KE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span></p>
                    <p className="text-gray-600">Status: <span className="font-medium text-green-600">Confirmed</span></p>
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
                      You'll receive tracking information once your order ships.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Mail className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-gray-900">Confirmation Email</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">Sent to:</p>
                    <p className="font-medium">{customerEmail}</p>
                    <p className="text-sm text-gray-500">
                      Check your inbox for order confirmation and receipt.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Smartphone className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-gray-900">Need Help?</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">Contact our support team:</p>
                    <p className="font-medium">0700 123 456</p>
                    <p className="text-sm text-gray-500">
                      Available 24/7 for any order-related questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">What's Next?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Order Processing</h3>
                <p className="text-sm text-gray-600">
                  We'll prepare your items for shipping within 24 hours.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Shipping</h3>
                <p className="text-sm text-gray-600">
                  You'll receive tracking information via email and SMS.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold mb-2">Delivery</h3>
                <p className="text-sm text-gray-600">
                  Your order will be delivered by our trusted partners.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={handleViewOrder}
              className="w-full"
            >
              <Package className="w-5 h-5 mr-2" />
              View Order Details
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleContinueShopping}
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
              onClick={handleDownloadInvoice}
              className="w-full"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Invoice
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center space-y-4">
              <h3 className="font-bold text-gray-900">Stay Updated</h3>
              <p className="text-gray-600">
                Follow us on social media for updates, deals, and new arrivals.
              </p>
              <div className="flex justify-center space-x-4">
                {['Facebook', 'Twitter', 'Instagram', 'TikTok'].map((platform) => (
                  <a
                    key={platform}
                    href="#"
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
