import { RefreshCw, Clock, Shield, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ReturnsInfo() {
  const policy = [
    {
      icon: Clock,
      title: '30-Day Returns',
      description: 'Return most items within 30 days of delivery',
    },
    {
      icon: Shield,
      title: 'Full Refund',
      description: 'Get your money back for eligible returns',
    },
    {
      icon: RefreshCw,
      title: 'Easy Process',
      description: 'Start returns from your account dashboard',
    },
    {
      icon: Package,
      title: 'Free Returns',
      description: 'Free returns for defective or wrong items',
    },
  ];

  const steps = [
    {
      step: 1,
      title: 'Start Return',
      description: 'Go to your order history and select "Return Item"',
    },
    {
      step: 2,
      title: 'Print Label',
      description: 'Download and print the prepaid return label',
    },
    {
      step: 3,
      title: 'Package Item',
      description: 'Pack the item with all original accessories',
    },
    {
      step: 4,
      title: 'Drop Off',
      description: 'Drop at any designated pickup location',
    },
    {
      step: 5,
      title: 'Get Refund',
      description: 'Receive refund within 5-10 business days',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Return Policy
          </h2>
          <p className="text-gray-600">
            We want you to love what you buy. If you don't, here's how we make it right.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {policy.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">
            Important Notes
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                !
              </div>
              <span>Items must be in original condition with tags attached</span>
            </li>
            <li className="flex items-start">
              <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                !
              </div>
              <span>Some items like underwear, personalized products, and software may not be returnable</span>
            </li>
            <li className="flex items-start">
              <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                !
              </div>
              <span>Original shipping costs are non-refundable unless the return is due to our error</span>
            </li>
          </ul>
        </div>

        <Button variant="primary" className="w-full" href="/account/orders">
          Start a Return
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How to Return an Item
          </h2>
          <p className="text-gray-600">
            Follow these simple steps to return your purchase
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200 hidden md:block" />
          <div className="grid md:grid-cols-5 gap-6 relative">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="relative mb-6">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto relative z-10">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Refund Timeline
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Processing Time</span>
              <span className="font-medium">1-2 business days</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Refund to Original Payment</span>
              <span className="font-medium">3-5 business days</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Refund to Store Credit</span>
              <span className="font-medium">Instant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
