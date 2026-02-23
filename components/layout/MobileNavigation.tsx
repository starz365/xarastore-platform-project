'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  ShoppingBag,
  Tag,
  Grid,
  Heart,
  User,
  MapPin,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const [user, setUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    {
      title: 'Home',
      icon: Home,
      href: '/',
    },
    {
      title: 'Shop',
      icon: ShoppingBag,
      href: '/shop',
      submenu: [
        { title: 'All Products', href: '/shop/all' },
        { title: 'Electronics', href: '/category/electronics' },
        { title: 'Fashion', href: '/category/fashion' },
        { title: 'Home & Garden', href: '/category/home-garden' },
        { title: 'Beauty', href: '/category/beauty' },
        { title: 'Sports', href: '/category/sports' },
      ],
    },
    {
      title: 'Deals',
      icon: Tag,
      href: '/deals',
      submenu: [
        { title: 'Today\'s Deals', href: '/deals/today' },
        { title: 'Flash Sales', href: '/deals/flash' },
        { title: 'Ending Soon', href: '/deals/ending-soon' },
        { title: 'Top Deals', href: '/deals/top' },
      ],
    },
    {
      title: 'Categories',
      icon: Grid,
      href: '/categories',
      submenu: [
        { title: 'All Categories', href: '/categories' },
        { title: 'Electronics', href: '/category/electronics' },
        { title: 'Fashion', href: '/category/fashion' },
        { title: 'Home & Garden', href: '/category/home-garden' },
        { title: 'Beauty', href: '/category/beauty' },
        { title: 'Sports', href: '/category/sports' },
        { title: 'Automotive', href: '/category/automotive' },
        { title: 'Books', href: '/category/books' },
      ],
    },
    {
      title: 'Wishlist',
      icon: Heart,
      href: '/account/wishlist',
    },
    {
      title: 'My Account',
      icon: User,
      href: user ? '/account' : '/auth/login',
      submenu: user
        ? [
            { title: 'My Orders', href: '/account/orders' },
            { title: 'My Profile', href: '/account/profile' },
            { title: 'Addresses', href: '/account/addresses' },
            { title: 'Wishlist', href: '/account/wishlist' },
            { title: 'Settings', href: '/account/settings' },
          ]
        : [
            { title: 'Sign In', href: '/auth/login' },
            { title: 'Create Account', href: '/auth/register' },
          ],
    },
    {
      title: 'Track Order',
      icon: MapPin,
      href: '/track',
    },
    {
      title: 'Help Center',
      icon: HelpCircle,
      href: '/help',
    },
  ];

  const quickLinks = [
    { title: 'About Us', href: '/about' },
    { title: 'Contact Us', href: '/contact' },
    { title: 'Careers', href: '/careers' },
    { title: 'Blog', href: '/blog' },
    { title: 'Terms of Service', href: '/legal/terms' },
    { title: 'Privacy Policy', href: '/legal/privacy' },
    { title: 'Shipping Policy', href: '/legal/shipping' },
    { title: 'Return Policy', href: '/legal/returns' },
  ];

  const handleMenuItemClick = (item: any) => {
    if (item.submenu) {
      setActiveCategory(activeCategory === item.title ? null : item.title);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Navigation Panel */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Xarastore</h1>
                <p className="text-xs text-gray-500">it's a deal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-sm text-gray-600 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Menu */}
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isActive = activeCategory === item.title;

              return (
                <li key={item.title}>
                  <div className="space-y-1">
                    <button
                      onClick={() => handleMenuItemClick(item)}
                      className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-600'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      {hasSubmenu ? (
                        <ChevronRight
                          className={`w-5 h-5 transition-transform ${
                            isActive ? 'rotate-90' : ''
                          }`}
                        />
                      ) : (
                        <ChevronRight className="w-5 h-5 opacity-0" />
                      )}
                    </button>

                    {/* Submenu */}
                    {hasSubmenu && isActive && (
                      <div className="ml-4 pl-7 border-l border-gray-200">
                        <ul className="space-y-1 py-2">
                          {item.submenu.map((subItem) => (
                            <li key={subItem.title}>
                              <Link
                                href={subItem.href}
                                onClick={onClose}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                <span>{subItem.title}</span>
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Quick Links */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>

        {/* Auth Actions */}
        <div className="p-4 border-t border-gray-200">
          {user ? (
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  onClose();
                  window.location.href = '/account';
                }}
              >
                My Account
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  onClose();
                  window.location.href = '/auth/login';
                }}
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onClose();
                  window.location.href = '/auth/register';
                }}
              >
                Create Account
              </Button>
            </div>
          )}
        </div>

        {/* App Download */}
        <div className="p-4 bg-gradient-to-r from-red-600 to-red-800 text-white">
          <h3 className="font-bold mb-2">Get the App</h3>
          <p className="text-sm opacity-90 mb-4">
            Shop faster and get exclusive deals
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
              <div className="text-xs">Download on the</div>
              <div className="font-bold">App Store</div>
            </button>
            <button className="p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
              <div className="text-xs">Get it on</div>
              <div className="font-bold">Google Play</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-center space-x-6">
            <a href="https://facebook.com/xarastore" className="text-gray-600 hover:text-red-600">
              <span className="sr-only">Facebook</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://twitter.com/xarastore" className="text-gray-600 hover:text-red-600">
              <span className="sr-only">Twitter</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
            </a>
            <a href="https://instagram.com/xarastore" className="text-gray-600 hover:text-red-600">
              <span className="sr-only">Instagram</span>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
