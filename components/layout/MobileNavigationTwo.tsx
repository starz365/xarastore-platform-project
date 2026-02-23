'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  ShoppingBag, 
  Tag, 
  Grid, 
  Star, 
  User, 
  Heart, 
  ShoppingCart,
  ChevronRight,
  X,
  LogOut,
  Settings,
  Package,
  MapPin,
  CreditCard,
  Shield,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { getItemCount } = useCart();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const mainMenu = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Shop', href: '/shop', icon: ShoppingBag },
    { name: 'Deals', href: '/deals', icon: Tag },
    { name: 'Categories', href: '/categories', icon: Grid },
    { name: 'Brands', href: '/brands', icon: Star },
  ];

  const accountMenu = [
    { name: 'My Orders', href: '/account/orders', icon: Package },
    { name: 'Wishlist', href: '/account/wishlist', icon: Heart },
    { name: 'My Wardrobe', href: '/account/wardrobe', icon: User },
    { name: 'Addresses', href: '/account/addresses', icon: MapPin },
    { name: 'Payment Methods', href: '/account/payments', icon: CreditCard },
    { name: 'Account Settings', href: '/account/profile', icon: Settings },
  ];

  const supportMenu = [
    { name: 'Help Center', href: '/help', icon: HelpCircle },
    { name: 'Track Order', href: '/track-order', icon: Package },
    { name: 'Returns', href: '/returns', icon: Shield },
    { name: 'Terms & Privacy', href: '/legal', icon: FileText },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Navigation Panel */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">X</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Xarastore</h1>
                <p className="text-xs text-gray-500">it's a deal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="px-4 pb-4">
            {loading ? (
              <div className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt={user.email}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.user_metadata?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-600">Sign in to access your account</p>
                <div className="flex space-x-2">
                  <Button variant="primary" size="sm" className="flex-1" href="/auth/login">
                    Sign In
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" href="/auth/register">
                    Sign Up
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Cart Button */}
          <Link
            href="/cart"
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4 hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                    {getItemCount()}
                  </span>
                )}
              </div>
              <span className="font-medium">Shopping Cart</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>

          {/* Main Menu */}
          <nav className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Menu
            </h3>
            <ul className="space-y-1">
              {mainMenu.map((item) => {
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
                      onClick={onClose}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Account Menu */}
          {user && (
            <nav className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                My Account
              </h3>
              <ul className="space-y-1">
                {accountMenu.map((item) => {
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
                        onClick={onClose}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {/* Support Menu */}
          <nav className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Help & Support
            </h3>
            <ul className="space-y-1">
              {supportMenu.map((item) => {
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
                      onClick={onClose}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Categories Quick Links */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
              Popular Categories
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Electronics', icon: '📱', href: '/category/electronics' },
                { name: 'Fashion', icon: '👕', href: '/category/fashion' },
                { name: 'Home', icon: '🏠', href: '/category/home' },
                { name: 'Beauty', icon: '💄', href: '/category/beauty' },
                { name: 'Sports', icon: '⚽', href: '/category/sports' },
                { name: 'Automotive', icon: '🚗', href: '/category/automotive' },
              ].map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={onClose}
                >
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium text-sm">{category.name}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* App Download */}
          <div className="p-4 bg-gradient-to-r from-red-600 to-red-700 rounded-lg text-white">
            <h3 className="font-bold mb-2">Get the Xarastore App</h3>
            <p className="text-sm mb-4">Shop faster and get exclusive deals</p>
            <div className="flex space-x-2">
              <button className="flex-1 p-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors">
                App Store
              </button>
              <button className="flex-1 p-2 bg-black/20 hover:bg-black/30 rounded-lg text-sm font-medium transition-colors">
                Google Play
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Xarastore. All rights reserved.</p>
            <div className="flex justify-center space-x-4 mt-2">
              <Link href="/legal/terms" className="hover:text-red-600 transition-colors" onClick={onClose}>
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-red-600 transition-colors" onClick={onClose}>
                Privacy
              </Link>
              <Link href="/help" className="hover:text-red-600 transition-colors" onClick={onClose}>
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
