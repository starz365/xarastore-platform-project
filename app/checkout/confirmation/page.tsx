xarastore/app/checkout/confirmation/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Truck, Package, Mail, Phone, MapPin, Download, Share2, Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/currency';

interface OrderDetails {
  id: string;
  order_number: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  status: string;
  items: any[];
  shipping_address: any;
  delivery_method: any;
  payment_method: string;
  payment_status: string;
  created_at: string;
  estimated_delivery?: string;
}

export default function CheckoutConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');

  const orderId = searchParams.get('order');
  const paymentId = searchParams.get('payment');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (orderId && user) {
      loadOrderDetails();
    }
  }, [orderId, user]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadOrderDetails = async () => {
    if (!orderId || !user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setOrder(data);

      // Calculate estimated delivery date
      const orderDate = new Date(data.created_at);
      const deliveryDays = data.delivery_method?.estimatedDays?.match(/\d+/)?.[0] || 3;
      const deliveryDate = new Date(orderDate);
      deliveryDate.setDate(orderDate.getDate() + parseInt(deliveryDays));
      
      setEstimatedDelivery(deliveryDate.toLocaleDateString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));

      // Update payment status if needed
      if (paymentId && data.payment_status === 'pending') {
        await updatePaymentStatus(data.id);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
      router.push('/account/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePaymentStatus = async (orderId: string) => {
    try {
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const downloadInvoice = async () => {
    // In production, generate and download PDF invoice
    alert('Invoice download feature coming soon!');
  };

  const shareOrder = async () => {
    try {
      const shareData = {
        title: `My Xarastore Order #${order?.order_number}`,
        text: `I just placed an order on Xarastore! Order #${order?.order_number}`,
        url: window.location.href,
      };

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Order link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const trackOrder = () => {
    router.push(`/account/orders/${order?.order_number}/track`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-responsive">
          <div className="max-w-3xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8 animate-pulse"></div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-responsive">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Order Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              We couldn't find the order you're looking for.
            </p>
            <Button asChild variant="primary" className="w-full">
              <a href="/account/orders">
                View My Orders
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Order Confirmed!
          </h1>
          
          <p className="text-xl text-gray-600 mb-2">
            Thank you for your purchase, {user?.user_metadata?.full_name || 'Customer'}!
          </p>
          
          <p className="text-gray-600">
            We've sent a confirmation email to <span className="font-semibold">{user?.email}</span>
          </p>
          
          <div className="mt-6 inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <span className="text-sm font-medium">Order #</span>
            <span className="font-bold text-red-600">{order.order_number}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
                
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>{order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax (16% VAT)</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-4 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-red-600">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery & Shipping */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-6">Delivery Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center">
                    <MapPin className="w-5 h-5 text-red-600 mr-2" />
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-gray-700">
                    <p className="font-medium">{order.shipping_address?.name}</p>
                    <p>{order.shipping_address?.street}</p>
                    <p>{order.shipping_address?.city}, {order.shipping_address?.state}</p>
                    <p>{order.shipping_address?.postal_code}, {order.shipping_address?.country}</p>
                    <p className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-500" />
                      {order.shipping_address?.phone}
                    </p>
                  </div>
                </div>

                {/* Delivery Method */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center">
                    <Truck className="w-5 h-5 text-red-600 mr-2" />
                    Delivery Method
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{order.delivery_method?.method}</p>
                      <p className="text-sm text-gray-600">{order.delivery_method?.estimatedDelivery}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Estimated Delivery:</p>
                      <p className="text-green-600 font-semibold">{estimatedDelivery}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Payment Method:</p>
                      <p className="font-medium capitalize">{order.payment_method}</p>
                      <p className={`text-sm ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {order.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold mb-6">Order Status</h3>
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium">Order Placed</p>
                    <p className="text-xs text-gray-600">Today</p>
                  </div>
                  
                  <div className="flex-1 h-1 bg-gray-200"></div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Processing</p>
                    <p className="text-xs text-gray-500">1-2 days</p>
                  </div>
                  
                  <div className="flex-1 h-1 bg-gray-200"></div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Truck className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Shipped</p>
                    <p className="text-xs text-gray-500">{estimatedDelivery.split(' ')[0]}</p>
                  </div>
                  
                  <div className="flex-1 h-1 bg-gray-200"></div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-xs text-gray-500">Soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-6">What's Next?</h2>
              
              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={trackOrder}
                >
                  <Truck className="w-5 h-5 mr-2" />
                  Track Your Order
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={downloadInvoice}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Invoice
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={shareOrder}
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Order
                </Button>
              </div>

              {/* Order Support */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Email Support</p>
                      <p className="text-xs text-gray-600">support@xarastore.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Call Us</p>
                      <p className="text-xs text-gray-600">0700 123 456</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Shopping */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/shop')}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Continue Shopping
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => router.push('/')}
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Homepage
                </Button>
              </div>

              {/* Order Tips */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold mb-3">Order Tips</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Save your order number for tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Check your email for updates</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Keep your phone nearby for delivery calls</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps Banner */}
        <div className="mt-12 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Your Shopping Journey Continues</h2>
              <p className="opacity-90">
                Explore more amazing deals and discover new favorites on Xarastore
              </p>
            </div>
            <div className="flex space-x-4">
              <Button variant="secondary" className="text-red-600" asChild>
                <a href="/deals">
                  View Deals
                </a>
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                <a href="/account/orders">
                  My Orders
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
