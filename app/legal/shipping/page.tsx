import { Truck, Package, Clock, MapPin, Shield, DollarSign } from 'lucide-react';

export const metadata = {
  title: 'Shipping Policy | Xarastore',
  description: 'Delivery timelines, shipping costs, and delivery information for Xarastore orders.',
};

export default function ShippingPage() {
  const shippingMethods = [
    {
      name: 'Standard Delivery',
      time: '3-5 business days',
      cost: 'KES 299 (Free over KES 2,000)',
      coverage: 'Nationwide',
      features: ['Doorstep delivery', 'Tracking included', 'Weekday delivery'],
      icon: '🚚',
    },
    {
      name: 'Express Delivery',
      time: '1-2 business days',
      cost: 'KES 699',
      coverage: 'Major cities',
      features: ['Priority processing', 'Real-time tracking', 'Delivery notifications'],
      icon: '⚡',
    },
    {
      name: 'Same-Day Delivery',
      time: 'Within Nairobi',
      cost: 'KES 999',
      coverage: 'Nairobi only',
      features: ['Order before 12 PM', 'Evening delivery slots', 'Live tracking'],
      icon: '🏃',
    },
    {
      name: 'Store Pickup',
      time: 'Ready in 2 hours',
      cost: 'FREE',
      coverage: 'Select locations',
      features: ['No delivery fees', 'Flexible pickup times', 'Instant availability'],
      icon: '🏪',
    },
  ];

  const deliveryAreas = [
    {
      region: 'Nairobi & Surrounding',
      time: '1-2 days',
      notes: 'Includes Kiambu, Kajiado, Machakos',
    },
    {
      region: 'Major Cities',
      time: '2-3 days',
      notes: 'Mombasa, Kisumu, Nakuru, Eldoret',
    },
    {
      region: 'Other Urban Areas',
      time: '3-4 days',
      notes: 'All county headquarters',
    },
    {
      region: 'Remote Areas',
      time: '4-7 days',
      notes: 'Additional charges may apply',
    },
  ];

  const shippingRestrictions = [
    'Large furniture items require special delivery arrangement',
    'Hazardous materials cannot be shipped',
    'Perishable goods have special handling requirements',
    'High-value items require signature on delivery',
    'International shipping currently unavailable',
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="flex items-center space-x-3 mb-4">
            <Truck className="w-8 h-8" />
            <h1 className="text-4xl md:text-5xl font-bold">Shipping Policy</h1>
          </div>
          <p className="text-xl opacity-90 max-w-3xl">
            Fast, reliable delivery across Kenya. See our shipping options and delivery times.
          </p>
        </div>
      </div>

      <div className="container-responsive py-12">
        {/* Shipping Methods */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Shipping Methods</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {shippingMethods.map((method) => (
              <div key={method.name} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-3xl">{method.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{method.name}</h3>
                    <p className="text-sm text-gray-600">{method.coverage}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <Clock className="w-4 h-4 mr-2" />
                      Delivery Time
                    </div>
                    <p className="font-semibold">{method.time}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Cost
                    </div>
                    <p className="font-semibold">{method.cost}</p>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Features</div>
                    <ul className="space-y-2">
                      {method.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <div className="w-2 h-2 bg-red-600 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Delivery Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order & Delivery Timeline</h2>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Order Processing</h3>
                    <p className="text-gray-700">
                      Orders are processed within 24 hours on business days (Monday-Friday). 
                      Orders placed after 12 PM may be processed the next business day.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Shipping & Tracking</h3>
                    <p className="text-gray-700">
                      Once shipped, you'll receive a tracking number via email and SMS. 
                      Use this to monitor your package in real-time.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Delivery Attempt</h3>
                    <p className="text-gray-700">
                      Our delivery partner will attempt delivery during business hours. 
                      You'll receive a call/SMS 30 minutes before arrival.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Failed Delivery</h3>
                    <p className="text-gray-700">
                      If delivery fails, we'll schedule a second attempt. After 3 attempts, 
                      the package returns to our warehouse and a restocking fee may apply.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Areas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Areas & Times</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Region</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Estimated Delivery</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deliveryAreas.map((area, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{area.region}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 text-gray-400 mr-2" />
                            {area.time}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{area.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Shipping Restrictions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Package className="w-6 h-6 text-red-600" />
                <h3 className="font-bold">Shipping Restrictions</h3>
              </div>
              <ul className="space-y-3">
                {shippingRestrictions.map((restriction, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                      <span className="text-red-600 text-xs">!</span>
                    </div>
                    <span className="text-sm text-gray-700">{restriction}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Delivery Tips */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl p-6">
              <h3 className="font-bold mb-4">Delivery Tips</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 opacity-80 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Accurate Address</h4>
                    <p className="text-sm opacity-90">Include landmarks for easier delivery</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 opacity-80 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Secure Delivery</h4>
                    <p className="text-sm opacity-90">Request delivery instructions if needed</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 opacity-80 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Delivery Hours</h4>
                    <p className="text-sm opacity-90">8 AM - 8 PM, Monday to Saturday</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Shipping */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Shipping Support</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Delivery Issues</p>
                    <p className="text-sm text-gray-600">+254 711 123 456</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Package className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Order Tracking</p>
                    <p className="text-sm text-gray-600">tracking@xarastore.com</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  For urgent delivery inquiries, call our support line between 8 AM - 8 PM.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* International Shipping */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">International Shipping</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Current Status</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-bold text-xl">🌍</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-yellow-900">Coming Soon</h4>
                    <p className="text-yellow-800">International shipping launching Q2 2024</p>
                  </div>
                </div>
                <p className="text-sm text-yellow-700">
                  We're working to expand our delivery network to serve East Africa and 
                  beyond. Sign up for notifications when international shipping becomes 
                  available.
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Planned Regions</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">East Africa</span>
                  <span className="text-sm text-gray-600">Q2 2024</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">Southern Africa</span>
                  <span className="text-sm text-gray-600">Q3 2024</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">Europe & North America</span>
                  <span className="text-sm text-gray-600">Q4 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
