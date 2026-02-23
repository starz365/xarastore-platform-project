use client';

import { 
  Shield, 
  Truck, 
  RefreshCw, 
  CreditCard, 
  Lock, 
  Award,
  CheckCircle
} from 'lucide-react';

interface TrustBadge {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

export function TrustBadges() {
  const badges: TrustBadge[] = [
    {
      id: 'secure',
      icon: Shield,
      title: '100% Secure',
      description: 'Bank-level security',
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'delivery',
      icon: Truck,
      title: 'Free Delivery',
      description: 'Over KES 2,000',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'returns',
      icon: RefreshCw,
      title: 'Easy Returns',
      description: '30 Day Policy',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'payment',
      icon: CreditCard,
      title: 'Secure Payment',
      description: 'Multiple options',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      id: 'warranty',
      icon: Award,
      title: 'Warranty',
      description: '1 Year Guarantee',
      color: 'bg-red-100 text-red-600',
    },
    {
      id: 'verified',
      icon: CheckCircle,
      title: 'Verified',
      description: 'Authentic Products',
      color: 'bg-indigo-100 text-indigo-600',
    },
  ];

  return (
    <div className="py-8 border-t border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {badges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className="flex flex-col items-center text-center"
              >
                <div className={`w-12 h-12 ${badge.color} rounded-full flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {badge.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {badge.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
