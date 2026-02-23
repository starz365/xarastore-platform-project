xarastore/app/checkout/delivery/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Clock, Shield, Package, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/shared/Toast';

export default function CheckoutDeliveryPage() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string>('standard');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');

  const deliveryMethods = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: '3-5 business days',
      price: 299,
      icon: Truck,
      features: ['Trackable', 'Signature required', 'Weekday delivery'],
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: '1-2 business days',
      price: 699,
      icon: Clock,
      features: ['Priority handling', 'Real-time tracking', 'Weekend delivery available'],
    },
    {
      id: 'same-day',
      name: 'Same Day Delivery',
      description: 'Within Nairobi only',
      price: 999,
      icon: Package,
      features: ['Order before 12 PM', 'Guaranteed delivery', 'Premium handling'],
    },
  ];

  const handleContinue = () => {
    // Save delivery method to checkout session
    localStorage.setItem('checkout_delivery', JSON.stringify({
      method: selectedMethod,
      instructions: deliveryInstructions,
    }));
    
    toast.success('Delivery method selected');
    router.push('/checkout/payment');
  };

  const handleBack = () => {
    router.push('/checkout/address');
  };

  const selectedDelivery = deliveryMethods.find(m => m.id === selectedMethod);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {['Address', 'Delivery', 'Payment', 'Confirmation'].map((step, index) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= 1 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index <= 1 ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-sm mt-2 ${
                  index <= 1 ? 'font-semibold text-red-600' : 'text-gray-600'
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-200 rounded-full">
            <div className="h-full w-2/4 bg-red-600 rounded-full"></div>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Delivery Method</h1>
          <p className="text-gray-600 mt-2">
            Choose how you want to receive your order
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Delivery Methods */}
          <div className="lg:col-span-2">
            <div className="space-y-4 mb-8">
              {deliveryMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.id}
                    className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all ${
                      selectedMethod === method.id
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedMethod === method.id
                              ? 'border-red-600 bg-red-600'
                              : 'border-gray-300'
                          }`}>
                            {selectedMethod === method.id && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {method.name}
                              </h3>
                              <p className="text-gray-600">{method.description}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Features:</h4>
                            <ul className="space-y-2">
                              {method.features.map((feature, index) => (
                                <li key={index} className="flex items-center text-sm text-gray-600">
                                  <Check className="w-4 h-4 text-green-600 mr-2" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          KES {method.price.toLocaleString()}
                        </div>
                        {method.price === 0 && (
                          <div className="text-sm text-green-600 font-medium">FREE</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delivery Instructions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Delivery Instructions</h2>
              <p className="text-gray-600 mb-4">
                Add special instructions for the delivery driver (optional)
              </p>
              <textarea
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="E.g., Leave at reception, Call before delivery, etc."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 min-h-[120px] focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500 mt-2">
                {deliveryInstructions.length}/500 characters
              </div>
            </div>

            {/* Estimated Delivery */}
            {selectedDelivery && (
              <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Truck className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Estimated Delivery</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-90">Delivery Method</p>
                    <p className="font-semibold">{selectedDelivery.name}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Delivery Time</p>
                    <p className="font-semibold">{selectedDelivery.description}</p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Delivery Cost</p>
                    <p className="font-semibold">
                      {selectedDelivery.price === 0 ? 'FREE' : `KES ${selectedDelivery.price.toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Estimated Arrival</p>
                    <p className="font-semibold">
                      {(() => {
                        const today = new Date();
                        const daysToAdd = selectedDelivery.id === 'standard' ? 4 : 
                                         selectedDelivery.id === 'express' ? 2 : 1;
                        const deliveryDate = new Date(today);
                        deliveryDate.setDate(today.getDate() + daysToAdd);
                        return deliveryDate.toLocaleDateString('en-KE', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        });
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">KES 12,499</span>
                </div>
                
                {selectedDelivery && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span className="font-semibold">
                        {selectedDelivery.price === 0 
                          ? 'FREE' 
                          : `KES ${selectedDelivery.price.toLocaleString()}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-semibold">KES 2,000</span>
                    </div>
                  </>
                )}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-red-600">
                      KES {selectedDelivery 
                        ? (12499 + selectedDelivery.price + 2000).toLocaleString()
                        : '0'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleContinue}
                >
                  Continue to Payment
                </Button>
                
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleBack}
                >
                  Back to Address
                </Button>
              </div>

              {/* Security & Support */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Secure Payment</p>
                    <p className="text-xs text-gray-600">256-bit SSL encryption</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Delivery Guarantee</p>
                    <p className="text-xs text-gray-600">On-time delivery or money back</p>
                  </div>
                </div>
              </div>

              {/* Need Help */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Need help with your order?
                </p>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <span className="text-sm">📞 Call: +254 711 234 567</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <span className="text-sm">💬 Live Chat</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Package Handling</h3>
              <p className="text-gray-600">
                All packages are carefully handled and securely packaged to ensure your items arrive in perfect condition.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📍</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Delivery Areas</h3>
              <p className="text-gray-600">
                We deliver nationwide across Kenya. Some remote areas may have extended delivery times.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">Delivery Hours</h3>
              <p className="text-gray-600">
                Deliveries are made Monday to Saturday, 8 AM to 8 PM. Sunday deliveries available for express orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
