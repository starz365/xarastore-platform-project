'use client';

import { useState } from 'react';
import { Package, RefreshCw, Clock, CheckCircle, XCircle, Truck, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ReturnsPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const checkReturnEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsChecking(false);
    alert('Return eligibility check feature coming soon!');
  };

  const returnSteps = [
    {
      step: 1,
      icon: Package,
      title: 'Initiate Return',
      description: 'Start return process online or contact support',
      time: 'Within 30 days of delivery',
    },
    {
      step: 2,
      icon: RefreshCw,
      title: 'Package Item',
      description: 'Pack item securely with all original accessories',
      time: 'Use original packaging if possible',
    },
    {
      step: 3,
      icon: Truck,
      title: 'Return Shipping',
      description: 'Use provided return label or drop-off location',
      time: 'Free returns for eligible items',
    },
    {
      step: 4,
      icon: CheckCircle,
      title: 'Receive Refund',
      description: 'Refund processed within 5-10 business days',
      time: 'To original payment method',
    },
  ];

  const eligibleItems = [
    'Unused items in original condition',
    'Items with all original tags and packaging',
    'Items purchased within last 30 days',
    'Faulty or damaged items',
  ];

  const nonEligibleItems = [
    'Personalized or custom items',
    'Underwear and swimwear (hygiene reasons)',
    'Perishable goods',
    'Digital products',
    'Items without proof of purchase',
  ];

  const returnMethods = [
    {
      method: 'Pickup Service',
      description: 'Schedule a pickup from your location',
      cost: 'Free for eligible returns',
      time: '1-3 business days',
      icon: '🚚',
    },
    {
      method: 'Drop-off Point',
      description: 'Drop at any Xarastore partner location',
      cost: 'Free',
      time: 'Same day processing',
      icon: '📍',
    },
    {
      method: 'Store Return',
      description: 'Return to any Xarastore physical store',
      cost: 'Free',
      time: 'Immediate processing',
      icon: '🏪',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Returns & Exchanges</h1>
          <p className="text-xl opacity-90 max-w-3xl">
            Easy returns within 30 days. Most items qualify for free returns.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        {/* Check Eligibility */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Check Return Eligibility</h2>
              <p className="text-gray-600">Enter your order details to start a return</p>
            </div>
          </div>

          <form onSubmit={checkReturnEligibility} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number *
                </label>
                <Input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ORD-123456"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Returns accepted within 30 days of delivery</span>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Start Return'}
              </Button>
            </div>
          </form>
        </div>

        {/* Return Process */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-8 text-center">Return Process in 4 Easy Steps</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {returnSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-300">0{step.step}</div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {step.time}
                    </div>
                  </div>
                  {step.step < 4 && (
                    <div className="hidden lg:block absolute top-1/2 right-0 w-6 h-0.5 bg-gray-200 transform translate-x-3"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Eligible Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6">What Can Be Returned</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Eligible Items</h3>
                  </div>
                  <ul className="space-y-3">
                    {eligibleItems.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <XCircle className="w-6 h-6 text-red-600" />
                    <h3 className="font-semibold text-gray-900">Non-Eligible Items</h3>
                  </div>
                  <ul className="space-y-3">
                    {nonEligibleItems.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <XCircle className="w-3 h-3 text-red-600" />
                        </div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Refund Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="flex items-center space-x-3 mb-6">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold">Refund Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Refund Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-gray-700">Return received</span>
                      <span className="font-medium">Day 1</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-gray-700">Inspection & processing</span>
                      <span className="font-medium">2-3 business days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Refund issued</span>
                      <span className="font-medium">5-10 business days</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Refund Methods</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Original Payment</span>
                      <span className="text-sm text-gray-600">5-10 days</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Store Credit</span>
                      <span className="text-sm text-gray-600">Instant</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Bank Transfer</span>
                      <span className="text-sm text-gray-600">3-5 days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Return Methods */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold mb-6">Return Methods</h2>
              <div className="space-y-6">
                {returnMethods.map((method) => (
                  <div key={method.method} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="text-2xl">{method.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{method.method}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-green-600">{method.cost}</span>
                      <span className="text-gray-500">{method.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Tips */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Tips</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-red-600 font-bold text-xs">!</span>
                    </div>
                    Include all original accessories and packaging
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-red-600 font-bold text-xs">!</span>
                    </div>
                    Print and attach the return label securely
                  </li>
                  <li className="flex items-start">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <span className="text-red-600 font-bold text-xs">!</span>
                    </div>
                    Keep tracking number for return status
                  </li>
                </ul>
              </div>

              {/* Contact Support */}
              <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Need help with your return?{' '}
                  <a href="/help/contact" className="font-semibold hover:underline">
                    Contact our support team
                  </a>{' '}
                  for immediate assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
