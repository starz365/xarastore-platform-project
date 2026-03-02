import Link from 'next/link';
import { Search, Home, Grid, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Page Not Found | Xarastore',
  description: 'The page you are looking for does not exist. Find amazing products and deals on Xarastore.',
};

export default function NotFoundPage() {
  const popularCategories = [
    { name: 'Electronics', slug: 'electronics', icon: '📱' },
    { name: 'Fashion', slug: 'fashion', icon: '👕' },
    { name: 'Home & Garden', slug: 'home-garden', icon: '🏠' },
    { name: 'Beauty', slug: 'beauty', icon: '💄' },
    { name: 'Sports', slug: 'sports', icon: '⚽' },
    { name: 'Automotive', slug: 'automotive', icon: '🚗' },
  ];

  const trendingProducts = [
    { name: 'Wireless Earbuds', category: 'Electronics' },
    { name: 'Running Shoes', category: 'Sports' },
    { name: 'Smart Watch', category: 'Electronics' },
    { name: 'Kitchen Blender', category: 'Home' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-8 md:p-12 text-center">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <MapPin className="w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">404</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-6">Page Not Found</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Column - Search & Navigation */}
              <div>
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                    <Search className="w-5 h-5 mr-2" />
                    Search Our Store
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for products, brands, or categories..."
                      className="w-full px-6 py-4 border border-gray-300 rounded-xl text-lg focus:border-red-600 focus:ring-4 focus:ring-red-600/20 outline-none"
                    />
                    <Button variant="primary" className="absolute right-2 top-2">
                      Search
                    </Button>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Popular Categories</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {popularCategories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/category/${category.slug}`}
                        className="group"
                      >
                        <div className="bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl p-4 text-center transition-all duration-200">
                          <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                            {category.icon}
                          </div>
                          <div className="font-medium group-hover:text-red-600 transition-colors">
                            {category.name}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
                  <div className="space-y-4">
                    <Link href="/" className="block w-full">
                      <Button variant="primary" className="w-full">
                        <Home className="w-5 h-5 mr-2" />
                        Go to Homepage
                      </Button>
                    </Link>
                    <Link href="/shop" className="block w-full">
                      <Button variant="secondary" className="w-full">
                        <Grid className="w-5 h-5 mr-2" />
                        Browse All Products
                      </Button>
                    </Link>
                    <Link href="/deals" className="block w-full">
                      <Button variant="outline" className="w-full">
                        <ArrowRight className="w-5 h-5 mr-2" />
                        View Today's Deals
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column - Trending & Help */}
              <div>
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Trending Now</h3>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6">
                    <div className="space-y-4">
                      {trendingProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600">{product.category}</div>
                          </div>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Common Pages</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'My Account', href: '/account' },
                      { label: 'Shopping Cart', href: '/cart' },
                      { label: 'Help Center', href: '/help' },
                      { label: 'Contact Us', href: '/help/contact' },
                      { label: 'Shipping Info', href: '/legal/shipping' },
                      { label: 'Return Policy', href: '/legal/returns' },
                    ].map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        className="block p-3 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg text-center transition-colors"
                      >
                        <span className="font-medium text-gray-900 hover:text-red-600">
                          {page.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 text-white rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Need Help?</h3>
                  <p className="text-gray-300 mb-6">
                    Our customer support team is available 24/7 to assist you.
                  </p>
                  <div className="space-y-3">
                    <Link href="/help/contact" className="block w-full">
                      <Button variant="secondary" className="w-full text-black">
                        Contact Support
                      </Button>
                    </Link>
                    <Link href="/help" className="block w-full">
                      <Button variant="outline" className="w-full text-blue border-white">
                        Visit Help Center
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Technical Information</h4>
                  <p className="text-sm text-gray-600">
                    Error Code: <code className="bg-gray-100 px-2 py-1 rounded">404_NOT_FOUND</code>
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Status: <span className="font-mono">Page Not Found</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Site Navigation Footer */}
        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {[
            { label: 'Shop All', href: '/shop' },
            { label: "Today's Deals", href: '/deals' },
            { label: 'Gift Cards', href: '/gift-cards' },
            { label: 'Brands', href: '/brands' },
            { label: 'Sell on Xarastore', href: '/sell' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
