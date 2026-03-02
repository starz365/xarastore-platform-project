'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Sparkles, TrendingUp, Clock, Star } from 'lucide-react';
import { getCategories } from '@/lib/supabase/queries/products';

interface Category {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data.slice(0, 8)); // Show top 8 categories
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const featuredCategories = [
    {
      name: 'Deal of the Day',
      description: 'Limited time offers',
      icon: Sparkles,
      href: '/deals/today',
      color: 'bg-gradient-to-r from-red-600 to-red-800',
    },
    {
      name: 'Trending Now',
      description: 'Most popular items',
      icon: TrendingUp,
      href: '/trending',
      color: 'bg-gradient-to-r from-orange-600 to-orange-800',
    },
    {
      name: 'New Arrivals',
      description: 'Latest products',
      icon: Clock,
      href: '/new',
      color: 'bg-gradient-to-r from-blue-600 to-blue-800',
    },
    {
      name: 'Top Rated',
      description: 'Customer favorites',
      icon: Star,
      href: '/top-rated',
      color: 'bg-gradient-to-r from-green-600 to-green-800',
    },
  ];

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center space-x-1 font-medium text-gray-700 hover:text-red-600 transition-colors"
      >
        <span>Categories</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-screen max-w-6xl bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="p-8">
            <div className="grid grid-cols-4 gap-8">
              {/* Categories Column */}
              <div className="col-span-3">
                <div className="grid grid-cols-3 gap-6">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, j) => (
                            <div key={j} className="h-3 bg-gray-100 rounded"></div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    categories.map((category) => (
                      <div key={category.id} className="mb-6">
                        <a
                          href={`/category/${category.slug}`}
                          className="font-semibold text-gray-900 hover:text-red-600 transition-colors block mb-3"
                        >
                          {category.name}
                        </a>
                        <div className="space-y-2">
                          {[
                            'Best Sellers',
                            'New Arrivals',
                            'On Sale',
                            'Top Rated',
                          ].map((sub) => (
                            <a
                              key={sub}
                              href={`/category/${category.slug}?filter=${sub.toLowerCase().replace(' ', '-')}`}
                              className="block text-sm text-gray-600 hover:text-red-600 transition-colors"
                            >
                              {sub}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Featured Column */}
              <div className="col-span-1 border-l border-gray-100 pl-8">
                <h3 className="font-semibold text-gray-900 mb-6">Featured</h3>
                <div className="space-y-4">
                  {featuredCategories.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <a
                        key={feature.name}
                        href={feature.href}
                        className="block group"
                      >
                        <div className={`${feature.color} rounded-xl p-4 text-white transition-transform group-hover:scale-105`}>
                          <div className="flex items-center space-x-3 mb-2">
                            <Icon className="w-5 h-5" />
                            <span className="font-semibold">{feature.name}</span>
                          </div>
                          <p className="text-sm opacity-90">{feature.description}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>

                {/* Quick Links */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
                  <div className="space-y-3">
                    <a
                      href="/shop/all"
                      className="flex items-center justify-between text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <span>Shop All Products</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        10K+
                      </span>
                    </a>
                    <a
                      href="/deals"
                      className="flex items-center justify-between text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <span>All Deals</span>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Hot
                      </span>
                    </a>
                    <a
                      href="/brands"
                      className="flex items-center justify-between text-sm text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <span>Brands A-Z</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        200+
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Banner */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Need help choosing?
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get personalized recommendations from our experts
                    </p>
                  </div>
                  <a
                    href="/help/shopping-assistance"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Get Help
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
