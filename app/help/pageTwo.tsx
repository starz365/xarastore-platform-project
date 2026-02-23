import { Search, HelpCircle, Truck, Package, CreditCard, Shield, Phone, Mail, MessageCircle, Clock, Star, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const metadata = {
  title: 'Help Center | Xarastore Support',
  description: 'Get help with your orders, delivery, payments, returns, and more. Xarastore customer support is here to help.',
};

export default function HelpPage() {
  const faqs = [
    {
      category: 'Orders',
      questions: [
        { q: 'How do I track my order?', a: 'You can track your order from your account page or using the tracking link in your confirmation email.' },
        { q: 'Can I modify or cancel my order?', a: 'Orders can be modified or cancelled within 1 hour of placement from your account page.' },
        { q: 'How do I return an item?', a: 'Initiate returns from your account page within 30 days of delivery.' },
      ],
    },
    {
      category: 'Delivery',
      questions: [
        { q: 'What are the delivery options?', a: 'We offer standard (3-5 days), express (1-2 days), same-day (Nairobi), and store pickup.' },
        { q: 'Do you deliver outside Kenya?', a: 'Currently we only deliver within Kenya.' },
        { q: 'What are the delivery charges?', a: 'Free delivery for orders over KES 2,000. Standard delivery is KES 299.' },
      ],
    },
    {
      category: 'Payments',
      questions: [
        { q: 'What payment methods do you accept?', a: 'We accept M-Pesa, credit/debit cards, and bank transfers.' },
        { q: 'Is it safe to pay online?', a: 'Yes, all payments are secured with 256-bit SSL encryption.' },
        { q: 'Can I pay cash on delivery?', a: 'Currently we only accept prepaid orders for security reasons.' },
      ],
    },
  ];

  const helpCategories = [
    {
      icon: Package,
      title: 'Order Issues',
      description: 'Track, modify, or cancel orders',
      color: 'bg-blue-100 text-blue-600',
      count: 12,
    },
    {
      icon: Truck,
      title: 'Delivery & Shipping',
      description: 'Delivery times, tracking, fees',
      color: 'bg-green-100 text-green-600',
      count: 8,
    },
    {
      icon: CreditCard,
      title: 'Payment & Refunds',
      description: 'Payment methods, refunds, billing',
      color: 'bg-purple-100 text-purple-600',
      count: 10,
    },
    {
      icon: Shield,
      title: 'Account & Security',
      description: 'Login, password, security',
      color: 'bg-red-100 text-red-600',
      count: 6,
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Available 24/7',
      details: '0700 123 456',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Mail,
      title: 'Email Us',
      description: 'Response within 24 hours',
      details: 'support@xarastore.com',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Available 8AM-10PM',
      details: 'Start Chat',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-12">
        <div className="container-responsive">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How can we help you?
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Find answers, guides, and contact information
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="search"
                placeholder="Search for help topics, orders, or issues..."
                className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-12">
        {/* Help Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Browse Help Categories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <a
                  key={index}
                  href={`/help/category/${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`${category.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {category.count} articles
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Popular FAQs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <Button variant="link" href="/help/faq">
              View All FAQs
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-lg mb-6">{category.category}</h3>
                <div className="space-y-6">
                  {category.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {faq.q}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Methods */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Contact Our Support Team
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div
                  key={index}
                  className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6"
                >
                  <div className="flex items-center space-x-4 mb-6">
                    <div className={`bg-gradient-to-r ${method.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{method.title}</h3>
                      <p className="text-sm opacity-90">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold mb-4">{method.details}</p>
                    <Button
                      variant="secondary"
                      className="text-gray-900"
                      href={method.title === 'Live Chat' ? '#chat' : `tel:${method.details}`}
                    >
                      {method.title === 'Live Chat' ? 'Start Chat' : 'Contact Now'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">24/7 Support</h3>
              <p className="text-gray-600">
                Round-the-clock customer support for urgent issues
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Expert Help</h3>
              <p className="text-gray-600">
                Trained specialists ready to assist with any issue
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Comprehensive Guides</h3>
              <p className="text-gray-600">
                Detailed articles and tutorials for self-help
              </p>
            </div>
          </div>
        </div>

        {/* Help Resources */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Additional Resources
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Return Policy', href: '/help/returns' },
              { title: 'Shipping Policy', href: '/help/shipping' },
              { title: 'Size Guide', href: '/help/size-guide' },
              { title: 'Privacy Policy', href: '/legal/privacy' },
              { title: 'Terms of Service', href: '/legal/terms' },
              { title: 'Cookie Policy', href: '/legal/cookies' },
              { title: 'Accessibility', href: '/legal/accessibility' },
              { title: 'Report Issue', href: '/help/contact' },
            ].map((resource, index) => (
              <a
                key={index}
                href={resource.href}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{resource.title}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
