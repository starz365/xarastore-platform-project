'use client';

import { useState } from 'react';
import { Search, MessageCircle, Package, RefreshCcw, Truck, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      title: 'Orders & Shipping',
      description: 'Track orders, shipping info, delivery times',
      icon: Package,
      topics: [
        { title: 'How to track my order', href: '/help/shipping/tracking' },
        { title: 'Shipping times & costs', href: '/help/shipping/times' },
        { title: 'International shipping', href: '/help/shipping/international' },
        { title: 'Delivery issues', href: '/help/shipping/issues' },
      ],
    },
    {
      title: 'Returns & Refunds',
      description: 'Return policies, refund process, exchanges',
      icon: RefreshCcw,
      topics: [
        { title: 'Return policy', href: '/help/returns/policy' },
        { title: 'How to return an item', href: '/help/returns/process' },
        { title: 'Refund timeline', href: '/help/returns/refunds' },
        { title: 'Exchange items', href: '/help/returns/exchanges' },
      ],
    },
    {
      title: 'Payments',
      description: 'Payment methods, security, billing issues',
      icon: CreditCard,
      topics: [
        { title: 'Accepted payment methods', href: '/help/payments/methods' },
        { title: 'Payment security', href: '/help/payments/security' },
        { title: 'Billing issues', href: '/help/payments/billing' },
        { title: 'M-Pesa payment guide', href: '/help/payments/mpesa' },
      ],
    },
    {
      title: 'Account & Security',
      description: 'Account management, security, privacy',
      icon: MessageCircle,
      topics: [
        { title: 'Create an account', href: '/help/account/create' },
        { title: 'Reset password', href: '/help/account/password' },
        { title: 'Update account details', href: '/help/account/update' },
        { title: 'Privacy & security', href: '/help/account/privacy' },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Help Center</h2>
        <p className="text-gray-600">
          Browse help topics or search for specific questions
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="primary" className="w-full mt-4">
          Search Help Articles
        </Button>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {helpCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.title} className="border-b border-gray-100 pb-6 last:border-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.title}</h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {category.topics.map((topic) => (
                  <a
                    key={topic.title}
                    href={topic.href}
                    className="p-3 text-sm bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    {topic.title}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
