'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  DollarSign,
  Shield,
  TrendingUp,
  CheckCircle,
  HelpCircle,
  Store,
  Package,
  BarChart,
  Users,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleGetStarted = () => {
    if (user) {
      router.push('/seller/dashboard');
    } else {
      router.push('/auth/register?redirect=/sell/onboarding');
    }
  };

  const features = [
    {
      icon: DollarSign,
      title: '0% Commission',
      description: 'List your products for free with no commission on sales',
    },
    {
      icon: TrendingUp,
      title: 'Reach Millions',
      description: 'Access over 1 million active buyers across Kenya',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Get paid instantly with our secure payment system',
    },
    {
      icon: Package,
      title: 'Easy Shipping',
      description: 'Integrated logistics with nationwide delivery',
    },
    {
      icon: BarChart,
      title: 'Analytics Dashboard',
      description: 'Track sales, views, and customer insights in real-time',
    },
    {
      icon: Users,
      title: 'Seller Support',
      description: '24/7 dedicated support for all sellers',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Sign Up',
      description: 'Create your seller account in minutes',
    },
    {
      number: '02',
      title: 'List Products',
      description: 'Upload your products with our easy tools',
    },
    {
      number: '03',
      title: 'Start Selling',
      description: 'Go live and start making sales immediately',
    },
    {
      number: '04',
      title: 'Get Paid',
      description: 'Withdraw your earnings anytime',
    },
  ];

  const categories = [
    { name: 'Electronics', count: '15,240 sellers' },
    { name: 'Fashion & Clothing', count: '12,850 sellers' },
    { name: 'Home & Garden', count: '8,920 sellers' },
    { name: 'Beauty & Personal Care', count: '7,430 sellers' },
    { name: 'Sports & Outdoors', count: '5,210 sellers' },
    { name: 'Automotive', count: '3,890 sellers' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full mb-6">
              <Store className="w-5 h-5 mr-2" />
              <span className="font-medium">Start Selling Today</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Turn Your Passion Into Profit
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join Kenya's fastest-growing marketplace. Reach millions of customers,
              grow your business, and earn more with Xarastore.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleGetStarted}
                className="text-red-600"
              >
                <Upload className="w-5 h-5 mr-2" />
                Start Selling Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
                onClick={() => router.push('/sell/learn-more')}
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-sm opacity-90">Active Sellers</div>
              </div>
              <div>
                <div className="text-3xl font-bold">KES 10B+</div>
                <div className="text-sm opacity-90">Total Sales</div>
              </div>
              <div>
                <div className="text-3xl font-bold">98%</div>
                <div className="text-sm opacity-90">Happy Sellers</div>
              </div>
              <div>
                <div className="text-3xl font-bold">24h</div>
                <div className="text-sm opacity-90">Fast Payouts</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Sell on Xarastore?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to start, run, and grow your online business
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Selling in 4 Easy Steps
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get your products in front of millions of customers
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 w-full h-0.5 bg-gray-200 transform translate-x-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Top Selling Categories
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Join thousands of successful sellers in these categories
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-red-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-3">
                  {category.name === 'Electronics' && '💻'}
                  {category.name === 'Fashion & Clothing' && '👕'}
                  {category.name === 'Home & Garden' && '🏠'}
                  {category.name === 'Beauty & Personal Care' && '💄'}
                  {category.name === 'Sports & Outdoors' && '⚽'}
                  {category.name === 'Automotive' && '🚗'}
                </div>
                <h3 className="font-semibold mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Success Stories
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Hear from sellers who transformed their businesses with Xarastore
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah K.',
                business: 'Fashion Boutique',
                quote: 'Xarastore helped me grow my business 10x in just 6 months!',
                revenue: 'KES 5M+ monthly',
              },
              {
                name: 'James M.',
                business: 'Electronics Store',
                quote: 'The platform is incredibly easy to use. Customer support is amazing!',
                revenue: 'KES 8M+ monthly',
              },
              {
                name: 'Grace W.',
                business: 'Home Decor',
                quote: 'Started as a hobby, now it\'s my full-time business. Thank you Xarastore!',
                revenue: 'KES 3M+ monthly',
              },
            ].map((story, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                    {story.name.charAt(0)}
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold">{story.name}</h4>
                    <p className="text-gray-400 text-sm">{story.business}</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-4">"{story.quote}"</p>
                <div className="flex items-center text-green-400">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{story.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about selling on Xarastore
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: 'How much does it cost to sell on Xarastore?',
                answer: 'It\'s completely free to list products on Xarastore. We charge 0% commission on sales for the first 3 months, and only 5% thereafter.',
              },
              {
                question: 'How do I get paid?',
                answer: 'Payments are processed instantly to your M-Pesa or bank account. You can withdraw your earnings anytime with no minimum threshold.',
              },
              {
                question: 'How do I ship products?',
                answer: 'We offer integrated shipping with our logistics partners. You can also use your preferred courier service.',
              },
              {
                question: 'What kind of support do you offer?',
                answer: '24/7 dedicated seller support, marketing tools, analytics dashboard, and business growth workshops.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <h3 className="font-semibold text-lg mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-red-50 to-red-100">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-full mb-6">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Ready to Start?</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join 50,000+ Successful Sellers
            </h2>
            <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
              Start your selling journey today. No upfront costs, no commitments.
              Everything you need to succeed is right here.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGetStarted}
              >
                <Store className="w-5 h-5 mr-2" />
                Start Selling Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/contact')}
              >
                <Users className="w-5 h-5 mr-2" />
                Contact Sales Team
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-sm">Approval within 24 hours</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
