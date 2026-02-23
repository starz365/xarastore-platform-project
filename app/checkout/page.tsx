'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield, Truck, CreditCard } from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PaymentMethods } from '@/components/checkout/PaymentMethods';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase/client';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<'address' | 'delivery' | 'payment'>('address');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            Complete your purchase securely
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Progress Steps */}
              <div className="border-b border-gray-200">
                <div className="flex">
                  <div
                    className={`flex-1 text-center py-4 ${
                      step === 'address' ? 'border-b-2 border-red-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step === 'address' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        1
                      </div>
                      <span className={`font-medium ${
                        step === 'address' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        Address
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex-1 text-center py-4 ${
                      step === 'delivery' ? 'border-b-2 border-red-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step === 'delivery' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        2
                      </div>
                      <span className={`font-medium ${
                        step === 'delivery' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        Delivery
                      </span>
                    </div>
                  </div>
                  <div
                    className={`flex-1 text-center py-4 ${
                      step === 'payment' ? 'border-b-2 border-red-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step === 'payment' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        3
                      </div>
                      <span className={`font-medium ${
                        step === 'payment' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        Payment
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                {step === 'address' && (
                  <CheckoutForm
                    user={user}
                    onContinue={() => setStep('delivery')}
                  />
                )}
                {step === 'delivery' && (
                  <DeliveryStep onContinue={() => setStep('payment')} />
                )}
                {step === 'payment' && (
                  <PaymentStep />
                )}
              </div>
            </div>

            {/* Security Badges */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                <Shield className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Secure Payment</p>
                  <p className="text-xs text-gray-500">SSL Encrypted</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                <Lock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Privacy Protected</p>
                  <p className="text-xs text-gray-500">Your data is safe</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200">
                <Truck className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Fast Delivery</p>
                  <p className="text-xs text-gray-500">Across Kenya</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({ onContinue }: { onContinue: () => void }) {
  const [selectedMethod, setSelectedMethod] = useState('standard');

  const deliveryMethods = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: '3-5 business days',
      price: 299,
      icon: '🚚',
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: '1-2 business days',
      price: 699,
      icon: '⚡',
    },
    {
      id: 'same-day',
      name: 'Same Day Delivery',
      description: 'Within Nairobi',
      price: 999,
      icon: '🏃',
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Select Delivery Method</h2>
      <div className="space-y-3">
        {deliveryMethods.map((method) => (
          <div
            key={method.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedMethod === method.id
                ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{method.icon}</div>
                <div>
                  <h3 className="font-semibold">{method.name}</h3>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">KES {method.price.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onContinue}
      >
        Continue to Payment
      </Button>
    </div>
  );
}

function PaymentStep() {
  const [selectedMethod, setSelectedMethod] = useState('mpesa');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Select Payment Method</h2>
      <PaymentMethods
        selectedMethod={selectedMethod}
        onSelectMethod={setSelectedMethod}
      />
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            Your payment is secured with bank-level encryption. We never store your payment details.
          </p>
        </div>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          // Handle payment submission
        }}
      >
        <Lock className="w-5 h-5 mr-2" />
        Pay Securely
      </Button>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
