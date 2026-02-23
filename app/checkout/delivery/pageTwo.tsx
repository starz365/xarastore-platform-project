xarastore/app/checkout/delivery/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Clock, Shield, Package, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { useCart } from '@/lib/hooks/useCart';
import { toast } from '@/components/shared/Toast';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  icon: string;
  features: string[];
}

export default function CheckoutDeliveryPage() {
  const router = useRouter();
  const { items } = useCart();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [items, router]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.setItem('redirectAfterAuth', '/checkout/delivery');
        router.push('/auth/login?checkout=true');
        return;
      }
      setUser(session.user);
      loadShippingAddress();
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const loadShippingAddress = async () => {
    try {
      const savedAddress = sessionStorage.getItem('checkout_address');
      if (savedAddress) {
        setShippingAddress(JSON.parse(savedAddress));
      } else if (user) {
        const { data } = await supabase
          .from('checkout_sessions')
          .select('shipping_address')
          .eq('user_id', user.id)
          .single();

        if (data?.shipping_address) {
          setShippingAddress(data.shipping_address);
          sessionStorage.setItem('checkout_address', JSON.stringify(data.shipping_address));
        } else {
          router.push('/checkout/address');
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load shipping address:', error);
      router.push('/checkout/address');
    } finally {
      setIsLoading(false);
    }
  };

  const deliveryOptions: DeliveryOption[] = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: 'Regular shipping with tracking',
      price: 299,
      estimatedDays: '3-5 business days',
      icon: '🚚',
      features: ['Delivery to door', 'Package tracking', 'SMS notifications', 'Standard insurance'],
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: 'Faster shipping for urgent orders',
      price: 699,
      estimatedDays: '1-2 business days',
      icon: '⚡',
      features: ['Priority handling', 'Real-time tracking', 'Delivery notifications', 'Enhanced insurance'],
    },
    {
      id: 'same-day',
      name: 'Same Day Delivery',
      description: 'Delivery within Nairobi on the same day',
      price: 999,
      estimatedDays: 'Within 8 hours',
      icon: '🏃',
      features: ['Same day delivery', 'Live tracking', 'Phone call confirmation', 'Full insurance'],
    },
    {
      id: 'pickup',
      name: 'Store Pickup',
      description: 'Pick up from our Nairobi store',
      price: 0,
      estimatedDays: 'Ready in 2 hours',
      icon: '🏪',
      features: ['Free pickup', 'No shipping fees', 'Immediate availability', 'In-person support'],
    },
  ];

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
  };

  const calculateTax = (subtotal: number) => {
    return Math.round(subtotal * 0.16); // 16% VAT in Kenya
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const shipping = selectedOption ? 
      deliveryOptions.find(opt => opt.id === selectedOption)?.price || 0 : 0;
    
    return subtotal + tax + shipping;
  };

  const handleProceedToPayment = async () => {
    if (!selectedOption) {
      toast.error('Please select a delivery option');
      return;
    }

    try {
      const selectedDelivery = deliveryOptions.find(opt => opt.id === selectedOption);
      const deliveryData = {
        method: selectedDelivery?.name,
        cost: selectedDelivery?.price,
        estimatedDelivery: selectedDelivery?.estimatedDays,
        features: selectedDelivery?.features,
      };

      // Save delivery option to session storage
      sessionStorage.setItem('checkout_delivery', JSON.stringify(deliveryData));

      // Save to Supabase
      if (user) {
        await supabase
          .from('checkout_sessions')
          .upsert({
            user_id: user.id,
            shipping_address: shippingAddress,
            delivery_method: deliveryData,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      }

      router.push('/checkout/payment');
    } catch (error) {
      console.error('Failed to save delivery option:', error);
      toast.error('Failed to proceed to payment');
    }
  };

  const handleEditAddress = () => {
    router.push('/checkout/address');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        {/* Checkout Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-gray-600">Address</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-green-600"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <div className="font-semibold text-red-600">Delivery</div>
                <div className="text-sm text-gray-600">Shipping method</div>
              </div>
            </div>
            <div className="h-1 w-16 bg-gray-300"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-600">Payment</div>
                <div className="text-sm text-gray-500">Secure checkout</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              {/* Shipping Address */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Shipping to</h2>
                  <div className="space-y-1 text-gray-700">
                    <p className="font-medium">{shippingAddress?.name}</p>
                    <p>{shippingAddress?.street}</p>
                    <p>{shippingAddress?.city}, {shippingAddress?.state}</p>
                    <p>{shippingAddress?.postal_code}, {shippingAddress?.country}</p>
                    <p className="text-red-600">{shippingAddress?.phone}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditAddress}
                >
                  Change
                </Button>
              </div>

              {/* Delivery Options */}
              <h2 className="text-lg font-semibold mb-4">Choose delivery method</h2>
              <div className="space-y-4">
                {deliveryOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedOption === option.id
                        ? 'border-red-600 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedOption === option.id
                              ? 'border-red-600 bg-red-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedOption === option.id && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">{option.icon}</span>
                            <div>
                              <h3 className="font-semibold">{option.name}</h3>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>{option.estimatedDays}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Shield className="w-4 h-4 text-gray-500" />
                                <span>Insured</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Package className="w-4 h-4 text-gray-500" />
                                <span>Tracked</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {option.features.map((feature, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {option.price === 0 ? 'FREE' : `KES ${option.price.toLocaleString()}`}
                        </div>
                        <div className="text-sm text-gray-600">Shipping cost</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Delivery Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Delivery Hours</h4>
                    <p className="text-sm text-gray-600">
                      Monday - Saturday: 8:00 AM - 8:00 PM<br />
                      Sunday: 10:00 AM - 6:00 PM
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Package Handling</h4>
                    <p className="text-sm text-gray-600">
                      All packages are handled with care and insured against damage or loss during transit.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Delivery Guarantee</h4>
                    <p className="text-sm text-gray-600">
                      If your delivery is late, you may be eligible for a shipping fee refund or store credit.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({items.length} items)</span>
                  <span className="font-medium">KES {calculateSubtotal().toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {selectedOption ? (
                      deliveryOptions.find(opt => opt.id === selectedOption)?.price === 0 
                        ? 'FREE' 
                        : `KES ${deliveryOptions.find(opt => opt.id === selectedOption)?.price.toLocaleString()}`
                    ) : 'Select option'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (16% VAT)</span>
                  <span className="font-medium">KES {calculateTax(calculateSubtotal()).toLocaleString()}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>KES {calculateTotal().toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Includes KES {calculateTax(calculateSubtotal()).toLocaleString()} VAT
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={!selectedOption}
                >
                  Continue to Payment
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/checkout/address')}
                >
                  Back to Address
                </Button>
              </div>

              {/* Delivery Estimate */}
              {selectedOption && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">
                        {deliveryOptions.find(opt => opt.id === selectedOption)?.estimatedDays}
                      </h3>
                      <p className="text-xs text-gray-600">
                        Estimated delivery time
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
