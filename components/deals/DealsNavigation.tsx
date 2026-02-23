'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Flame, Zap, Calendar, Star, Rocket, Clock } from 'lucide-react';

const navItems = [
  {
    href: '/deals',
    label: 'All Deals',
    icon: Flame,
  },
  {
    href: '/deals/flash',
    label: 'Flash Sales',
    icon: Zap,
  },
  {
    href: '/deals/today',
    label: "Today's Deals",
    icon: Calendar,
  },
  {
    href: '/deals/top-rated',
    label: 'Top Rated',
    icon: Star,
  },
  {
    href: '/deals/new',
    label: 'New Arrivals',
    icon: Rocket,
  },
  {
    href: '/deals/ending-soon',
    label: 'Ending Soon',
    icon: Clock,
  },
];

export function DealsNavigation() {
  const pathname = usePathname();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container-responsive">
        <div className="flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/deals' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
