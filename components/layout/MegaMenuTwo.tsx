'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Smartphone, Laptop, Shirt, Home, Car, Heart, GamepadIcon, Dumbbell } from 'lucide-react';
import { getCategories } from '@/lib/supabase/queries/products';

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
    
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const categoryGroups = [
    {
      title: 'Electronics',
      icon: Smartphone,
      categories: [
        { name: 'Smartphones', slug: 'smartphones', count: 245 },
        { name: 'Laptops', slug: 'laptops', count: 189 },
        { name: 'Tablets', slug: 'tablets', count: 124 },
        { name: 'Headphones', slug: 'headphones', count: 312 },
        { name: 'Smart Watches', slug: 'smart-watches', count: 156 },
        { name: 'Cameras', slug: 'cameras', count: 98 },
      ],
    },
    {
      title: 'Fashion',
      icon: Shirt,
      categories: [
        { name: "Men's Clothing", slug: 'mens-clothing', count: 567 },
        { name: "Women's Clothing", slug: 'womens-clothing', count: 789 },
        { name: 'Shoes', slug: 'shoes', count: 432 },
        { name: 'Bags & Accessories', slug: 'bags-accessories', count: 321 },
        { name: 'Jewelry', slug: 'jewelry', count: 210 },
        { name: 'Watches', slug: 'watches', count: 165 },
      ],
    },
    {
      title: 'Home & Living',
      icon: Home,
      categories: [
        { name: 'Furniture', slug: 'furniture', count: 345 },
        { name: 'Kitchen & Dining', slug: 'kitchen-dining', count: 456 },
        { name: 'Home Decor', slug: 'home-decor', count: 567 },
        { name: 'Bed & Bath', slug: 'bed-bath', count: 234 },
        { name: 'Gardening', slug: 'gardening', count: 123 },
        { name: 'Lighting', slug: 'lighting', count: 189 },
      ],
    },
    {
      title: 'More Categories',
      icon: ChevronDown,
      categories: [
        { name: 'Sports & Outdoors', slug: 'sports-outdoors', count: 234 },
        { name: 'Automotive', slug: 'automotive', count: 189 },
        { name: 'Beauty & Health', slug: 'beauty-health', count: 456 },
        { name: 'Toys & Games', slug: 'toys-games', count: 321 },
        { name: 'Books & Media', slug: 'books-media', count: 210 },
        { name: 'Office Supplies', slug: 'office-supplies', count: 165 },
      ],
    },
  ];

  const featuredCategories = [
    { name: 'Flash Deals', slug: 'deals/flash', icon: '⚡', color: 'bg-yellow-100 text-yellow-600' },
    { name: 'New Arrivals', slug: 'shop/new-arrivals', icon: '🆕', color: 'bg-blue-100 text-blue-600' },
    { name: 'Best Sellers', slug: 'shop/best-sellers', icon: '🔥', color: 'bg-red-100 text-red-600' },
    { name: 'Clearance', slug: 'shop/clearance', icon: '💰', color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div 
      ref={menuRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="flex items-center space-x-1 font-medium text-gray-700 hover:text-red-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>Categories</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-screen max-w-6xl bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-slide-down">
          <div className="p-6">
            <div className="grid grid-cols-12 gap-8">
              {/* Featured Categories */}
              <div className="col-span-3">
                <h3 className="font-bold text-gray-900 mb-4">Featured</h3>
                <div className="space-y-3">
                  {featuredCategories.map((category) => (
                    <Link
                      key={category.name}
                      href={`/${category.slug}`}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className={`${category.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
                        <span className="text-xl">{category.icon}</span>
                      </div>
                      <div>
                        <span className="font-medium group-hover:text-red-600 transition-colors">
                          {category.name}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Shop All Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href="/shop"
                    className="flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Shop All Products</span>
                    <ChevronDown className="w-4 h-4 rotate-270" />
                  </Link>
                </div>
              </div>

              {/* Main Categories */}
              <div className="col-span-9 grid grid-cols-3 gap-6">
                {categoryGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.title} className="space-y-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-red-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">{group.title}</h3>
                      </div>
                      <ul className="space-y-2">
                        {group.categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={`/category/${category.slug}`}
                              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors group"
                              onClick={() => setIsOpen(false)}
                            >
                              <span className="text-gray-700 group-hover:text-red-600 transition-colors">
                                {category.name}
                              </span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {category.count}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Promotional Banner */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-6">
                <Link
                  href="/deals/black-friday"
                  className="relative overflow-hidden rounded-xl group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800"></div>
                  <div className="relative p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Black Friday Sale</h3>
                    <p className="text-red-100 mb-4">Up to 70% off on all electronics</p>
                    <span className="inline-flex items-center font-medium group-hover:underline">
                      Shop Now
                      <ChevronDown className="w-4 h-4 ml-1 rotate-270" />
                    </span>
                  </div>
                </Link>
                <Link
                  href="/collections/holiday-gifts"
                  className="relative overflow-hidden rounded-xl group"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-800"></div>
                  <div className="relative p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Holiday Gift Guide</h3>
                    <p className="text-purple-100 mb-4">Perfect gifts for everyone</p>
                    <span className="inline-flex items-center font-medium group-hover:underline">
                      Find Gifts
                      <ChevronDown className="w-4 h-4 ml-1 rotate-270" />
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
