'use client';

import { useState } from 'react';
import {
  HelpCircle,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Shield,
  Truck,
  RefreshCw,
  CreditCard,
  Package,
  User,
  ChevronRight,
  Search,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const helpCategories = [
    {
      id: 'orders',
      name: 'Orders & Delivery',
      icon: Package,
      questions: [
        'How do I track my order?',
        'What are your delivery times?',
        'How much is delivery?',
        'Can I change my delivery address?',
        'What if I\'m not home for delivery?',
      ],
    },
    {
      id: 'payments',
      name: 'Payments & Pricing',
      icon: CreditCard,
      questions: [
        'What payment methods do you accept?',
        'Is M-Pesa available?',
        'Are there any hidden fees?',
        'How do I get a refund?',
        'Do you offer payment plans?',
      ],
    },
    {
      id: 'returns',
      name: 'Returns & Refunds',
      icon: RefreshCw,
      questions: [
        'What is your return policy?',
        'How do I return an item?',
        'How long do refunds take?',
        'Who pays for return shipping?',
        'Can I exchange an item?',
      ],
    },
    {
      id: 'account',
      name: 'Account & Security',
      icon: User,
      questions: [
        'How do I reset my password?',
        'Is my payment information safe?',
        'How do I update my profile?',
        'Can I delete my account?',
        'How do I enable 2FA?',
      ],
    },
  ];

  const popularArticles = [
    {
      title: 'How to Place Your First Order',
      description: 'Step-by-step guide to shopping on Xarastore',
      category: 'orders',
      readTime: '3 min',
    },
    {
      title: 'M-Pesa Payment Guide',
      description: 'Complete guide to paying with M-Pesa',
      category: 'payments',
      readTime: '5 min',
    },
    {
      title: 'Understanding Delivery Times',
      description: 'Learn about our delivery schedule and estimates',
      category: 'orders',
      readTime: '4 min',
    },
    {
      title: 'Return Policy Explained',
      description: 'Everything you need to know about returns',
      category: 'returns',
      readTime: '6 min',
    },
    {
      title: 'Account Security Best Practices',
      description: 'Keep your account safe and secure',
      category: 'account',
      readTime: '4 min',
    },
    {
      title: 'Deal of the Day Explained',
      description: 'How our daily deals work and how to get them',
      category: 'general',
      readTime: '3 min',
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Available 24/7',
      details: '+254 711 123 456',
      action: 'Call Now',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Response within 2 hours',
      details: 'support@xarastore.com',
      action: 'Send Email',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Instant help available',
      details: 'Chat with an agent',
      action: 'Start Chat',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const filteredArticles = popularArticles.filter(article => {
    if (activeCategory !== 'all' && article.category !== activeCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <HelpCircle className="w-8 h-8" />
              <h1 className="text-4xl md:text-5xl font-bold">How can we help you?</h1>
            </div>
            <p className="text-xl opacity-90 mb-8">
              Find answers, guides, and contact information for all your questions.
            </p>
            
            {/* Search */}
            <div className="max-w-2xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help articles, guides, or FAQs..."
                  className="w-full pl-10 pr-4 py-3 text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        {/* Quick Help Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {helpCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`p-6 text-left rounded-xl border transition-all ${
                    activeCategory === category.id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      activeCategory === category.id
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {category.questions.length} questions
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popular Help Articles</h2>
            <Button variant="link" href="/help/articles">
              View All Articles
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, index) => (
                <a
                  key={index}
                  href={`/help/articles/${article.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="group block"
                >
                  <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full mb-3">
                          {article.category}
                        </span>
                        <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                          {article.title}
                        </h3>
                      </div>
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{article.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{article.readTime} read</span>
                      <span className="flex items-center">
                        Read more
                        <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No articles found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search or browse by category
              </p>
            </div>
          )}
        </div>

        {/* Contact Methods */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-6"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`${method.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{method.title}</h3>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  <p className="text-gray-900 font-medium mb-4">{method.details}</p>
                  <Button variant="outline" className="w-full">
                    {method.action}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                question: 'How long does delivery take?',
                answer: 'Standard delivery takes 3-5 business days within Kenya. Express delivery is available for 1-2 business days.',
              },
              {
                question: 'Is M-Pesa payment safe?',
                answer: 'Yes, M-Pesa payments are processed through Safaricom\'s secure API. We never store your M-Pesa PIN or personal payment details.',
              },
              {
                question: 'Can I return a product if I change my mind?',
                answer: 'Yes, we offer a 30-day return policy for most items. Products must be unused and in original packaging.',
              },
              {
                question: 'Do you deliver outside Kenya?',
                answer: 'Currently, we only deliver within Kenya. We\'re working to expand to other East African countries soon.',
              },
              {
                question: 'How do I track my order?',
                answer: 'Once your order ships, you\'ll receive a tracking number via SMS and email. You can also track from your account page.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Why Choose Xarastore?</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Secure Shopping</h3>
              <p className="text-sm opacity-90">SSL encrypted payments</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm opacity-90">Across Kenya in days</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">Easy Returns</h3>
              <p className="text-sm opacity-90">30-day return policy</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-sm opacity-90">Always here to help</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
