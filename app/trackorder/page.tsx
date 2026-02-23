'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/product/EmptyState';

interface TrackingStep {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: any;
  estimated_delivery: string;
  tracking?: {
    carrier: string;
    tracking_number: string;
    status: string;
    steps: TrackingStep[];
  };
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    loadRecentOrders();
  }, []);

  const loadRecentOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, status, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        setRecentOrders(data || []);
      }
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      setError('Please enter both order number and email');
      return;
    }

    setIsLoading(true);
    setError('');
    setOrder(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tracking:order_tracking(*)
        `)
        .eq('order_number', orderNumber.trim().toUpperCase())
        .eq('user_email', email.trim().toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Order not found. Please check your order number and email.');
        } else {
          throw error;
        }
      } else if (data) {
        setOrder(data);
      }
    } catch (error: any) {
      console.error('Error tracking order:', error);
      setError('Unable to track order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return CheckCircle;
      case 'shipped':
        return Truck;
      case 'processing':
        return Package;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'shipped':
        return 'text-blue-600 bg-blue-100';
      case 'processing':
        return 'text-amber-600 bg-amber-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Placed';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Track Your Order
            </h1>
            <p className="text-gray-600">
              Enter your order number and email to track your package
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Order Number
                  </label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g., XARA-2023-001"
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Tracking Order...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Track Order
                  </>
                )}
              </Button>
            </form>

            {/* Recent Orders (for logged in users) */}
            {recentOrders.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Orders</h3>
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setOrderNumber(order.order_number);
                        // Get email from session
                        const getUserEmail = async () => {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session?.user?.email) {
                            setEmail(session.user.email);
                          }
                        };
                        getUserEmail();
                      }}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div>
                        <div className="font-medium">{order.order_number}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Details */}
          {isLoading ? (
            <OrderDetailsSkeleton />
          ) : order ? (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(order.status)}`}>
                        {(() => {
                          const Icon = getStatusIcon(order.status);
                          return <Icon className="w-6 h-6" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Order {order.order_number}
                        </h2>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          {order.estimated_delivery && (
                            <span className="text-sm text-gray-600">
                              • Est. delivery: {formatDate(order.estimated_delivery)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Button variant="secondary" href={`/account/orders/${order.id}`}>
                      View Order Details
                    </Button>
                    <Button variant="primary" href="/shop">
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tracking Timeline */}
              {order.tracking && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-6">Tracking Information</h3>
                  
                  <div className="space-y-6">
                    {/* Carrier Info */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-600">Carrier</div>
                        <div className="font-medium">{order.tracking.carrier}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Tracking Number</div>
                        <div className="font-medium">{order.tracking.tracking_number}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Current Status</div>
                        <div className="font-medium">{order.tracking.status}</div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                      {order.tracking.steps?.map((step, index) => (
                        <div key={index} className="flex items-start mb-8 last:mb-0">
                          <div className="relative flex-shrink-0 mr-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {index === 0 ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-current" />
                              )}
                            </div>
                            {index < order.tracking!.steps!.length - 1 && (
                              <div className="absolute top-8 left-4 w-0.5 h-8 bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-900">{step.status}</h4>
                                <p className="text-sm text-gray-600 mt-1">{step.location}</p>
                                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(step.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{order.shipping_address.name}</p>
                      <p className="text-gray-600">{order.shipping_address.street}</p>
                      <p className="text-gray-600">
                        {order.shipping_address.city}, {order.shipping_address.state}{' '}
                        {order.shipping_address.postal_code}
                      </p>
                      <p className="text-gray-600">{order.shipping_address.country}</p>
                      {order.shipping_address.phone && (
                        <p className="text-gray-600 mt-2">Phone: {order.shipping_address.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            !isLoading && (
              <EmptyState
                title="Track Your Order"
                description="Enter your order details above to view tracking information"
                icon="search"
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}
