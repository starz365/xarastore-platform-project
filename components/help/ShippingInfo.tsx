import { Truck, Clock, MapPin, Package, Shield, RefreshCw } from 'lucide-react';

export function ShippingInfo() {
  const shippingMethods = [
    {
      name: 'Standard Delivery',
      time: '3-5 business days',
      cost: 'KES 299',
      freeOver: 'Free on orders over KES 2,000',
      icon: Truck,
    },
    {
      name: 'Express Delivery',
      time: '1-2 business days',
      cost: 'KES 699',
      freeOver: 'Not applicable',
      icon: Clock,
    },
    {
      name: 'Same Day Delivery',
      time: 'Within Nairobi',
      cost: 'KES 999',
      freeOver: 'Not applicable',
      icon: MapPin,
    },
  ];

  const faqs = [
    {
      question: 'How do I track my order?',
      answer: 'Once your order ships, you will receive a tracking number via email and SMS. You can also track your order from your account dashboard.',
    },
    {
      question: 'Do you ship internationally?',
      answer: 'Yes, we ship to select countries. International shipping costs and delivery times vary by destination. Please contact support for specific rates.',
    },
    {
      question: 'What happens if I\'m not home?',
      answer: 'Our delivery partners will attempt delivery twice. If unsuccessful, your package will be held at a nearby pickup point for 5 days.',
    },
    {
      question: 'Can I change my delivery address?',
      answer: 'You can change your delivery address before your order ships. Contact support immediately if you need to update your address.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Delivery Options
          </h2>
          <p className="text-gray-600">
            Choose the shipping method that works best for you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {shippingMethods.map((method) => {
            const Icon = method.icon;
            return (
              <div key={method.name} className="border border-gray-200 rounded-lg p-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{method.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Time:</span>
                    <span className="font-medium">{method.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost:</span>
                    <span className="font-medium">{method.cost}</span>
                  </div>
                  {method.freeOver && (
                    <div className="text-sm text-green-600 font-medium">
                      {method.freeOver}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <Package className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium">Package Protection</p>
              <p className="text-sm text-gray-600">All packages insured</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium">Secure Delivery</p>
              <p className="text-sm text-gray-600">Contactless options</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium">Easy Returns</p>
              <p className="text-sm text-gray-600">30-day policy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-100 pb-6 last:border-0">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
