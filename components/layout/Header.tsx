'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  Package,
} from 'lucide-react';
import { useCart } from '@/lib/hooks/useCart';
import { SearchBar } from '@/components/search/SearchBar';
import { CartFlyout } from '@/components/cart/CartFlyout';
import { MegaMenu } from './MegaMenu';
import { MobileNavigation } from './MobileNavigation';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const { getItemCount } = useCart();

  // --------------------------
  // Prevent Hydration Mismatch
  // --------------------------
  useEffect(() => {
    setMounted(true);
  }, []);

  // --------------------------
  // Scroll State Optimization
  // --------------------------
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --------------------------
  // Stable Cart Count
  // --------------------------
  const itemCount = useMemo(() => {
    if (!mounted) return 0;
    return getItemCount();
  }, [mounted, getItemCount]);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          scrolled
            ? 'bg-white shadow-lg py-2'
            : 'bg-white border-b border-gray-100 py-4'
        }`}
      >
        <div className="container-responsive">
          <div className="flex items-center justify-between">
            {/* LEFT SECTION */}
            <div className="flex items-center space-x-8">
              <button
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <Link href="/" className="flex items-center space-x-2">
                <div className="hidden lg:flex items-center">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">X</span>
                  </div>
                  <div className="ml-2">
                    <h1 className="text-xl font-bold text-gray-900">
                      Xarastore
                    </h1>
                    <p className="text-xs text-gray-500">it's a deal</p>
                  </div>
                </div>

                <div className="lg:hidden">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">X</span>
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center space-x-6">
                <Link
                  href="/shop"
                  className={`font-medium transition-colors hover:text-red-600 ${
                    pathname === '/shop'
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  Shop
                </Link>

                <Link
                  href="/deals"
                  className={`font-medium transition-colors hover:text-red-600 ${
                    pathname === '/deals'
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  Deals
                </Link>

                <MegaMenu />

                <Link
                  href="/brands"
                  className={`font-medium transition-colors hover:text-red-600 ${
                    pathname.startsWith('/brands')
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}
                >
                  Brands
                </Link>

                <Link
                  href="/category"
                  className={`font-medium transition-colors hover:text-brand-red ${
                    pathname.startsWith('/category')
                      ? 'text-brand-red'
                      : 'text-gray-700'
                  }`}
                >
                  Categories
                </Link>

                <Link
                  href="/collections"
                  className={`font-medium transition-colors hover:text-brand-red ${
                    pathname.startsWith('/collections')
                      ? 'text-brand-red'
                      : 'text-gray-700'
                  }`}
                >
                  Collections
                </Link>
              </nav>
            </div>

            {/* Desktop Search */}
            <div className="hidden lg:block flex-1 max-w-2xl mx-8">
              <SearchBar />
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center space-x-4">
              <button
                className="lg:hidden"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>

              <Link
                href="/trackorder"
                className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
              >
                <Package className="w-5 h-5" />
                <span className="text-sm font-medium hidden lg:inline">
                  Track
                </span>
              </Link>

              <Link
                href="/account/wishlist"
                className="hidden sm:flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:inline">
                  Wishlist
                </span>
              </Link>

              <Link
                href="/account"
                className="hidden sm:flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-medium hidden md:inline">
                  Account
                </span>
              </Link>

              {/* Cart Button */}
              <button
                onClick={openCart}
                className="relative flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5" />

                <span className="text-sm font-medium">
                  {itemCount}
                </span>

                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          {isSearchOpen && (
            <div className="lg:hidden mt-4">
              <SearchBar onClose={() => setIsSearchOpen(false)} />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNavigation
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Cart Flyout */}
      <CartFlyout isOpen={isCartOpen} onClose={closeCart} />
    </>
  );
}
