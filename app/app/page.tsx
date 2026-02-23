import { Smartphone, Download, QrCode, Bell, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AppStoreBadges } from '@/components/shared/AppStoreBadges';
import Image from 'next/image';

export const metadata = {
  title: 'Xarastore Mobile App - Shop on the Go',
  description: 'Download the Xarastore mobile app for the best shopping experience. Get personalized deals, faster checkout, and exclusive offers.',
};

export default function AppPage() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized for speed and performance',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Get alerts for deals and price drops',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Bank-level encryption and security',
    },
    {
      icon: Download,
      title: 'Offline Browsing',
      description: 'Browse products without internet',
    },
  ];

  const appStats = [
    { value: '4.8', label: 'App Store Rating' },
    { value: '100K+', label: 'Downloads' },
    { value: '99.9%', label: 'Uptime' },
    { value: '<2s', label: 'Load Time' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <Smartphone className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Mobile App Available</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Shop Smarter with Our Mobile App
              </h1>
              
              <p className="text-xl opacity-90">
                Get the full Xarastore experience on your phone. 
                Faster checkout, personalized deals, and exclusive mobile-only offers.
              </p>
              
              <div className="space-y-6">
                <AppStoreBadges />
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <QrCode className="w-24 h-24 text-white/90" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm opacity-80">Scan QR code to download</p>
                    <p className="text-xs opacity-60 mt-1">Point your camera at the QR code</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative aspect-[9/16] max-w-sm mx-auto">
                <Image
                  src="/images/app-screens.png"
                  alt="Xarastore App Screens"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="container-responsive">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Our App?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gray-50">
        <div className="container-responsive">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {appStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section className="py-12">
        <div className="container-responsive">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to Shop Better?
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              Download the Xarastore app today and transform your shopping experience. 
              Available on both iOS and Android.
            </p>
            
            <div className="space-y-6">
              <AppStoreBadges />
              
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  By downloading, you agree to our{' '}
                  <a href="/legal/terms" className="text-red-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/legal/privacy" className="text-red-600 hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-gray-50">
        <div className="container-responsive max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            {[
              {
                q: 'Is the app free to download?',
                a: 'Yes, the Xarastore app is completely free to download from the App Store and Google Play.',
              },
              {
                q: 'Do I need to create a new account?',
                a: 'No, you can use your existing Xarastore account. Your cart, wishlist, and orders will sync automatically.',
              },
              {
                q: 'Are there app-exclusive deals?',
                a: 'Yes! App users get access to exclusive deals, early access to sales, and special promotions.',
              },
              {
                q: 'Is my payment information safe?',
                a: 'Absolutely. We use bank-level encryption and never store your payment details on your device.',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-lg mb-3">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
