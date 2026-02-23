import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, TrendingUp, Award, Star } from 'lucide-react';
import { getFeaturedBrands, getAllBrands } from '@/lib/supabase/queries/brands';
import { EmptyState } from '@/components/product/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Brands - Shop by Your Favorite Brands | Xarastore',
  description: 'Discover top brands on Xarastore. Shop from trusted brands with quality products and great deals.',
};

export default async function BrandsPage() {
  const [featuredBrands, allBrands] = await Promise.all([
    getFeaturedBrands(),
    getAllBrands(),
  ]);

  const categories = [
    { name: 'Electronics', count: 42 },
    { name: 'Fashion & Apparel', count: 56 },
    { name: 'Home & Kitchen', count: 34 },
    { name: 'Beauty & Personal Care', count: 28 },
    { name: 'Sports & Outdoors', count: 19 },
    { name: 'Automotive', count: 15 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <Crown className="w-8 h-8" />
              <span className="text-lg font-semibold bg-white/20 px-4 py-1.5 rounded-full">
                PREMIUM BRANDS
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Shop Trusted Brands
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Discover quality products from our curated selection of premium brands.
              Every brand is vetted for excellence.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Quality Guaranteed</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Verified Reviews</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Top Selling</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Brands */}
      <section className="py-12">
        <div className="container-responsive">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">🌟 Featured Brands</h2>
              <p className="text-gray-600 mt-2">Our handpicked selection of premium brands</p>
            </div>
            <Button asChild variant="link">
              <Link href="#all-brands">
                View All Brands
              </Link>
            </Button>
          </div>

          {featuredBrands.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {featuredBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-red-300 hover:shadow-lg transition-all duration-200">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <Image
                        src={brand.logo || '/brand-placeholder.png'}
                        alt={brand.name}
                        fill
                        className="object-contain"
                        sizes="80px"
                      />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-red-600 transition-colors">
                      {brand.name}
                    </h3>
                    <p className="text-sm text-gray-500">{brand.productCount} products</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Featured Brands"
              description="Check back soon for our featured brand selection."
              icon="search"
            />
          )}
        </div>
      </section>

      {/* Brand Categories */}
      <section className="py-12 bg-white">
        <div className="container-responsive">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={`/brands/category/${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group"
              >
                <div className="bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-xl p-6 text-center transition-all duration-200">
                  <h3 className="font-semibold mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.count} brands</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All Brands */}
      <section id="all-brands" className="py-12">
        <div className="container-responsive">
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">All Brands</h2>
            <p className="text-gray-600">Browse our complete collection of trusted brands</p>
          </div>

          {allBrands.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <Suspense fallback={<BrandsGridSkeleton count={12} />}>
                {allBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    className="group"
                  >
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-red-300 hover:shadow-md transition-all duration-200">
                      <div className="relative w-16 h-16 mx-auto mb-3">
                        <Image
                          src={brand.logo || '/brand-placeholder.png'}
                          alt={brand.name}
                          fill
                          className="object-contain"
                          sizes="64px"
                        />
                      </div>
                      <h3 className="font-medium text-sm mb-1 group-hover:text-red-600 transition-colors line-clamp-2">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-gray-500">{brand.productCount} products</p>
                    </div>
                  </Link>
                ))}
              </Suspense>
            </div>
          ) : (
            <EmptyState
              title="No Brands Available"
              description="Brands will be added soon. Please check back later."
              icon="search"
              action={{
                label: 'Browse Products',
                href: '/shop',
              }}
            />
          )}
        </div>
      </section>

      {/* Brand Benefits */}
      <section className="py-12 bg-gray-50">
        <div className="container-responsive">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Shop Branded Products?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quality Assurance</h3>
              <p className="text-gray-600">
                Every brand undergoes strict quality checks to ensure premium products.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Warranty & Support</h3>
              <p className="text-gray-600">
                Official warranties and dedicated customer support from manufacturers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Latest Innovations</h3>
              <p className="text-gray-600">
                Get access to the newest products and latest technology releases.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BrandsGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}
