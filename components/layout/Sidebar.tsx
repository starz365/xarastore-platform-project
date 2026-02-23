'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Tag,
  Star,
  Package,
  Heart,
  User,
  Settings,
  MapPin,
  CreditCard,
  Shield,
  HelpCircle,
  FileText,
  ChevronRight,
  LogOut,
  Bell,
  Clock,
  Award,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orders: 0,
    wishlist: 0,
    wallet: 0,
    notifications: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchUserStats();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Fetch user stats from API
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const mainNavigation = [
    { name: 'Dashboard', href: '/account', icon: Home, badge: null },
    { name: 'My Orders', href: '/account/orders', icon: Package, badge: stats.orders },
    { name: 'Wishlist', href: '/account/wishlist', icon: Heart, badge: stats.wishlist },
    { name: 'My Wardrobe', href: '/account/wardrobe', icon: User, badge: null },
    { name: 'Notifications', href: '/account/notifications', icon: Bell, badge: stats.notifications },
    { name: 'Recently Viewed', href: '/account/recent', icon: Clock, badge: null },
  ];

  const accountNavigation = [
    { name: 'Addresses', href: '/account/addresses', icon: MapPin },
    { name: 'Payment Methods', href: '/account/payments', icon: CreditCard },
    { name: 'Security', href: '/account/security', icon: Shield },
    { name: 'Preferences', href: '/account/preferences', icon: Settings },
  ];

  const shopNavigation = [
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Deals', href: '/deals', icon: Tag },
    { name: 'Brands', href: '/brands', icon: Star },
    { name: 'Trending', href: '/trending', icon: TrendingUp },
    { name: 'Rewards', href: '/rewards', icon: Award },
  ];

  const supportNavigation = [
    { name: 'Help Center', href: '/help', icon: HelpCircle },
    { name: 'Contact Us', href: '/contact', icon: FileText },
    { name: 'Terms & Privacy', href: '/legal', icon: Shield },
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
      {/* User Profile */}
      <div className="p-6 border-b border-gray-200">
        {loading ? (
          <div className="animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            
            {/* Wallet Balance */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Wallet Balance</span>
                <span className="font-bold text-red-600">KES {stats.wallet.toLocaleString()}</span>
              </div>
              <Button variant="primary" size="sm" className="w-full mt-2">
                Add Funds
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-600 text-sm">Sign in to access your account</p>
            <div className="space-y-2">
              <Button variant="primary" size="sm" className="w-full" href="/auth/login">
                Sign In
              </Button>
              <Button variant="secondary" size="sm" className="w-full" href="/auth/register">
                Create Account
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-200px)]">
        {/* Main Navigation */}
        <nav className="p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Navigation
          </h3>
          <ul className="space-y-1">
            {mainNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.badge !== null && item.badge > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Shop Navigation */}
        <nav className="p-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Shop
          </h3>
          <ul className="space-y-1">
            {shopNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Account Settings */}
        <nav className="p-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Account Settings
          </h3>
          <ul className="space-y-1">
            {accountNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Support */}
        <nav className="p-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Support
          </h3>
          <ul className="space-y-1">
            {supportNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        {user && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-600 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        )}
        <div className="mt-3 text-xs text-gray-500 text-center">
          <p>© {new Date().getFullYear()} Xarastore</p>
          <p className="mt-1">Version 1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
