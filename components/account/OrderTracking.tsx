'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  CheckCircle, 
  Truck, 
  Home, 
  Clock, 
  XCircle,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/shared/LoadingOverlay';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils/currency';

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string;
  estimated_delivery?: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  shipping_address: any;
  estimated_delivery?: string;
  tracking_number?: string;
  courier?: string;
  created_at: string;
  tracking_events: TrackingEvent[];
}

interface OrderTrackingProps {
  orderId: string;
}

export function OrderTracking({ orderId }: OrderTrackingProps) {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', session.session.user.id)
        .single();

      if (fetchError) throw fetchError;

      // Fetch tracking events
      const { data: events } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });

      setOrder({
        ...data,
        tracking_events: events || [],
      });
    } catch (err: any) {
      console.error('Failed to fetch order details:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const refreshTracking = () => {
    setRefreshing(true);
    fetchOrderDetails();
  };

  const getStatusIndex = (status: OrderDetails['status']) => {
    const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
    return statusOrder.indexOf(status);
  };

  const getEventIcon = (status: string) => {
    switch (status) {
      case 'order_placed':
        return <Package className="w-6 h-6" />;
      case 'processing':
        return <RefreshCw className="w-6 h-6" />;
      case 'shipped':
        return <Truck className="w-6 h-6" />;
      case 'out_for_delivery':
        return <Home className="w-6 h-6" />;
      case 'delivered':
        return <CheckCircle className="w-6 h-6" />;
      case 'cancelled':
        return <XCircle className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'shipped':
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Loading order details..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">
          {error || 'Order not found'}
        </p>
        <Button variant="primary" onClick={fetchOrderDetails}>
          Try Again
        </Button>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const progressPercentage = ((currentStatusIndex + 1) / 4) * 100;

  return (
    <div className="space-y-8">
      {/* Order Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order #{order.order_number}
            </h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'delivered' 
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
              <span className="text-gray-600">
                Ordered on {formatDateTime(order.created_at)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={refreshTracking}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="primary" href={`/account/orders/${order.id}`}>
              View Order Details
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Progress</h2>
            {order.estimated_delivery && (
              <span className="text-gray-600">
                Est. Delivery: {formatDateTime(order.estimated_delivery)}
              </span>
            )}
          </div>
          
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-red-600">
                  {progressPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${progressPercentage}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-600 transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="relative">
          {order.tracking_events.map((event, index) => (
            <div key={event.id} className="flex mb-8">
              <div className="flex flex-col items-center mr-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getEventColor(event.status)}`}>
                  {getEventIcon(event.status)}
                </div>
                {index < order.tracking_events.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                )}
              </div>
              <div className="flex-1 pb-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {event.status.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-gray-600 mt-1">{event.description}</p>
                    {event.location && (
                      <div className="flex items-center text-gray-500 mt-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{event.location}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Shipping Address</h3>
          {order.shipping_address ? (
            <div className="space-y-2">
              <p className="font-medium">{order.shipping_address.name}</p>
              <p>{order.shipping_address.street}</p>
              <p>{order.shipping_address.city}, {order.shipping_address.state}</p>
              <p>{order.shipping_address.postal_code}</p>
              <p>{order.shipping_address.country}</p>
              <p className="text-gray-600">📱 {order.shipping_address.phone}</p>
            </div>
          ) : (
            <p className="text-gray-500">No shipping address provided</p>
          )}
        </div>

        {/* Tracking Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tracking Information</h3>
          <div className="space-y-4">
            {order.tracking_number && (
              <div>
                <p className="text-sm text-gray-600">Tracking Number</p>
                <p className="font-mono font-bold text-lg">{order.tracking_number}</p>
              </div>
            )}
            
            {order.courier && (
              <div>
                <p className="text-sm text-gray-600">Courier</p>
                <p className="font-semibold">{order.courier}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-600">Order Total</p>
              <p className="font-bold text-xl">{formatCurrency(order.total)}</p>
            </div>
            
            {order.estimated_delivery && (
              <div>
                <p className="text-sm text-gray-600">Estimated Delivery</p>
                <p className="font-semibold">{formatDateTime(order.estimated_delivery)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-600 font-bold">?</span>
          </div>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">Need Help?</h3>
            <p className="text-yellow-800 mb-4">
              If your delivery is delayed or you have questions about your order, 
              our support team is here to help.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="sm" href="/help">
                Contact Support
              </Button>
              <Button variant="secondary" size="sm" href="/help/faq">
                View FAQs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
