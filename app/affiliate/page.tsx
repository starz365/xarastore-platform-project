'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart,
  Link as LinkIcon,
  Globe,
  Smartphone,
  Shield,
  CheckCircle,
  Copy,
  ExternalLink,
  Zap,
  Target,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

export default function AffiliatePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleJoinNow = () => {
    if (user) {
      router.push('/affiliate/dashboard');
    } else {
      router.push('/auth/register?redirect=/affiliate/signup');
    }
  };

  const copyAffiliateLink = () => {
    const link = `https://xarastore.com/?ref=${user?.id?.slice(0, 8) || 'joinnow'}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { value: '15%', label: 'Commission Rate', icon: DollarSign, color: 'text-green-600' },
    { value: 'KES 50M+', label: 'Paid to Affiliates', icon: TrendingUp, color: 'text-blue-600' },
    { value: '10K+', label: 'Active Affiliates', icon: Users, color: 'text-purple-600' },
    { value: '45 Days', label: 'Cookie Duration', icon: Shield, color: 'text-yellow-600' },
  ];

  const steps = [
    {
      icon: LinkIcon,
      title: 'Sign Up',
      description: 'Create your free affiliate account',
    },
    {
      icon: Globe,
      title: 'Get Your Links',
      description: 'Generate unique tracking links',
    },
    {
      icon: Smartphone,
      title: 'Share & Promote',
      description: 'Share links across your platforms',
    },
    {
      icon: DollarSign,
      title: 'Earn Commissions',
      description: 'Get paid for every successful referral',
    },
  ];

  const earningExamples = [
    {
      product: 'Smartphone',
      price: 'KES 25,000',
      commission: 'KES 3,750',
      percentage: '15%',
    },
    {
      product: 'Laptop',
      price: 'KES 85,000',
      commission: 'KES 12,750',
      percentage: '15%',
    },
    {
      product: 'Fashion Bundle',
      price: 'KES 8,500',
      commission: 'KES 1,275',
      percentage: '15%',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full mb-6">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span className="font-medium">Affiliate Program</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Earn Money by Sharing What You Love
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join Xarastore's affiliate program and earn up to 15% commission
              on every sale you refer. No fees, no limits, just earnings.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleJoinNow}
                className="text-red-600"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Join Program Free
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white/10"
                onClick={() => router.push('/affiliate/learn-more')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12">
        <div className="container-responsive">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-6 text-center"
                >
                  <div className={`w-12 h-12 ${stat.color.replace('text-', 'bg-')}/10 rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
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
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Start earning in just 4 simple steps
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 right-0 w-full h-0.5 bg-gray-200 transform translate-x-1/2"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Earning Potential */}
      <section className="py-16">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Earning Potential
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See how much you can earn with our 15% commission rate
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                {earningExamples.map((example, index) => (
                  <div key={index} className="p-6 text-center">
                    <div className="text-sm text-gray-600 mb-2">Product</div>
                    <h3 className="font-bold text-lg mb-4">{example.product}</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Price</div>
                        <div className="text-xl font-bold">{example.price}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Your Commission</div>
                        <div className="text-2xl font-bold text-green-600">{example.commission}</div>
                        <div className="text-sm text-gray-600">{example.percentage} commission</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-2">Earn More with Tiered Commissions</h3>
                  <p className="text-gray-700">
                    Earn up to 20% commission based on your performance. The more you sell,
                    the more you earn!
                  </p>
                </div>
                <PieChart className="w-12 h-12 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tools & Features */}
      <section className="py-16 bg-gray-50">
        <div className="container-responsive">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Affiliate Tools
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to maximize your earnings
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart,
                title: 'Real-time Analytics',
                description: 'Track clicks, conversions, and earnings in real-time',
              },
              {
                icon: Target,
                title: 'Smart Links',
                description: 'Generate links for specific products or categories',
              },
              {
                icon: Zap,
                title: 'Automated Payouts',
                description: 'Get paid automatically via M-Pesa or bank transfer',
              },
              {
                icon: Shield,
                title: 'Fraud Protection',
                description: 'Advanced fraud detection ensures fair earnings',
              },
              {
                icon: Users,
                title: 'Dedicated Support',
                description: '24/7 affiliate manager support',
              },
              {
                icon: CheckCircle,
                title: 'Performance Bonuses',
                description: 'Earn bonuses for hitting monthly targets',
              },
            ].map((tool, index) => {
              const Icon = tool.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-300 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{tool.title}</h3>
                  <p className="text-gray-600">{tool.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16">
        <div className="container-responsive">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-2xl p-8 md:p-12 text-white">
              <div className="md:flex items-center justify-between">
                <div className="mb-6 md:mb-0 md:mr-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Ready to Start Earning?
                  </h2>
                  <p className="opacity-90 mb-6">
                    Join thousands of successful affiliates and start earning commissions today.
                  </p>
                  
                  {user ? (
                    <div className="space-y-4">
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm opacity-90">Your Affiliate Link:</span>
                          <button
                            onClick={copyAffiliateLink}
                            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded flex items-center"
                          >
                            {copied ? 'Copied!' : 'Copy'}
                            <Copy className="w-3 h-3 ml-1" />
                          </button>
                        </div>
                        <div className="flex items-center bg-white/5 rounded px-3 py-2">
                          <code className="text-sm truncate">
                            https://xarastore.com/?ref={user.id.slice(0, 8)}
                          </code>
                          <ExternalLink className="w-4 h-4 ml-2 opacity-70" />
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        className="w-full text-red-600"
                        onClick={() => router.push('/affiliate/dashboard')}
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleJoinNow}
                      className="text-red-600"
                    >
                      <DollarSign className="w-5 h-5 mr-2" />
                      Join Now - It's Free
                    </Button>
                  )}
                </div>
                <div className="text-center">
                  <div className="inline-flex flex-col items-center">
                    <div className="text-5xl font-bold mb-2">15%</div>
                    <div className="text-sm opacity-90">Commission Rate</div>
                  </div>
                </div>
              </div>
            </div>
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
              Everything you need to know about our affiliate program
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                question: 'How much does it cost to join?',
                answer: 'It\'s completely free to join our affiliate program. No hidden fees or monthly charges.',
              },
              {
                question: 'How often do you pay commissions?',
                answer: 'Commissions are paid monthly via M-Pesa or bank transfer. Minimum payout is KES 500.',
              },
              {
                question: 'How long is the referral cookie duration?',
                answer: 'We use 45-day cookies. Any purchase made within 45 days of clicking your link earns you commission.',
              },
              {
                question: 'Can I promote on social media?',
                answer: 'Yes! You can promote on Instagram, Facebook, Twitter, YouTube, blogs, websites, and more.',
              },
              {
                question: 'What kind of support do you offer?',
                answer: '24/7 affiliate support, marketing materials, banners, and dedicated affiliate managers.',
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
    </div>
  );
}
