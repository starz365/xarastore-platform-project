import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { 
  ArrowRight, 
  CheckCircle, 
  TrendingUp, 
  Shield, 
  Truck, 
  RefreshCw, 
  Clock,
  Tag, 
  Sparkles, 
  Smartphone, 
  Star,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { CategoryGrid } from '@/components/category/CategoryGrid';
import { AppStoreBadges } from '@/components/shared/AppStoreBadges';
import { getFeaturedProducts, getDeals, getCategories, getBrands } from '@/lib/supabase/queries/products';
import { getStats } from '@/lib/supabase/queries/stats';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Type definitions for better type safety
interface TrustIndicator {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

interface AppFeature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
}

interface Stats {
  products?: number;
  brands?: number;
  categories?: number;
}

// Metadata for SEO
export const metadata: Metadata = {
  title: 'Xarastore - Kenya\'s Fastest-Growing Marketplace | Shop Electronics, Fashion & More',
  description: 'Discover amazing products at unbeatable prices on Xarastore. Shop electronics, fashion, home goods, and more with free delivery, secure payment, and 30-day returns.',
  keywords: ['online shopping Kenya', 'electronics', 'fashion', 'marketplace', 'deals', 'free delivery'],
  openGraph: {
    title: 'Xarastore - Your Deal Starts Here',
    description: 'Shop electronics, fashion, home goods and more at unbeatable prices',
    type: 'website',
    locale: 'en_KE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xarastore - Kenya\'s Fastest-Growing Marketplace',
    description: 'Discover amazing products at unbeatable prices',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Trust indicators configuration
const trustIndicators: TrustIndicator[] = [
  {
    icon: Truck,
    title: 'Free Delivery',
    description: 'Over KES 2,000',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    description: '100% Protected',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: RefreshCw,
    title: 'Easy Returns',
    description: '30 Days Policy',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Tag,
    title: 'Best Prices',
    description: 'Price Match Guarantee',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    icon: Clock,
    title: 'Dedicated Help',
    description: '24/7 Support',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
   },
];

// App features configuration
const appFeatures: AppFeature[] = [
  {
    icon: Sparkles,
    title: 'Personalized Deals',
    description: 'Get recommendations based on your preferences',
  },
  {
    icon: TrendingUp,
    title: 'Price Alerts',
    description: 'Never miss a price drop on items you love',
  },
  {
    icon: Shield,
    title: 'Secure Wallet',
    description: 'Store payment methods securely for faster checkout',
  },
  {
    icon: Smartphone,
    title: 'Mobile-Optimized',
    description: 'Shop seamlessly on any device',
  },
];

export default async function HomePage() {
  // Parallel data fetching with error handling
  const [
    featuredProductsResult,
    dealsResult,
    categoriesResult,
    brandsResult,
    statsResult
  ] = await Promise.allSettled([
    getFeaturedProducts(),
    getDeals(),
    getCategories(),
    getBrands(),
    getStats(),
  ]);

  // Extract data with fallbacks
  const featuredProducts = featuredProductsResult.status === 'fulfilled' ? featuredProductsResult.value : [];
  const deals = dealsResult.status === 'fulfilled' ? dealsResult.value : [];
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const brands = brandsResult.status === 'fulfilled' ? brandsResult.value : [];
  const stats: Stats = statsResult.status === 'fulfilled' ? statsResult.value : {};

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative bg-gradient-to-r from-red-600 to-red-800 text-white overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-black/20" />
          <Image
            src="/images/hero-pattern.svg"
            alt=""
            fill
            className="object-cover opacity-10"
            priority
            sizes="100vw"
          />
        </div>

        <div className="container-responsive relative py-12 md:py-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
                <Star className="w-4 h-4 mr-2" aria-hidden="true" />
                <span className="text-sm font-medium">Kenya's Fastest-Growing Marketplace</span>  
              </div>

              <h1 id="hero-heading" className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Your deal{' '}
                <span className="relative inline-block">
                  starts here
                  <span className="absolute -bottom-2 left-0 right-0 h-1 bg-white/30 rounded-full" aria-hidden="true" />
                </span>
              </h1>

              <p className="text-lg md:text-xl opacity-90 max-w-2xl">
                Discover amazing products at unbeatable prices.
                Shop electronics, fashion, home goods, and more with confidence.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button asChild variant="secondary" size="lg" className="shadow-lg">
                  <Link href="/shop">
                    Start Shopping
                    <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-white hover:bg-white/10">
                  <Link href="/deals">
                    View Deals
                    <Tag className="ml-2 w-5 h-5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/20">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold" aria-label={`${stats?.products?.toLocaleString() || '0'} products available`}>
                    {stats?.products?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm opacity-80">Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold" aria-label={`${stats?.brands?.toLocaleString() || '0'} brands available`}>
                    {stats?.brands?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm opacity-80">Brands</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold" aria-label={`${stats?.categories?.toLocaleString() || '0'} categories available`}>
                    {stats?.categories?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm opacity-80">Categories</div>
                </div>
              </div>
            </div>

            <div className="relative" aria-hidden="true">
              <div className="relative aspect-square max-w-xl mx-auto">
                <Image
                  src="/images/hero-illustration.svg"
                  alt="Xarastore shopping experience illustration"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white text-gray-900 p-3 rounded-xl shadow-lg animate-float">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Tag className="w-4 h-4 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold">Up to 70% OFF</div>
                    <div className="text-xs">Flash Deals</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white text-gray-900 p-3 rounded-xl shadow-lg animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4 text-green-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-bold">Free Delivery</div>
                    <div className="text-xs">Nairobi & Major Cities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section 
        className="py-8 bg-gray-50" 
        aria-labelledby="trust-indicators-heading"
      >
        <div className="container-responsive">
          <h2 id="trust-indicators-heading" className="sr-only">Trust Indicators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustIndicators.map((item) => (
              <div key={item.title} className="flex items-center space-x-3">
                <div className={`p-2 ${item.bgColor} rounded-lg flex-shrink-0`} aria-hidden="true">
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">{item.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16" aria-labelledby="featured-products-heading">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 id="featured-products-heading" className="text-2xl md:text-3xl font-bold">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-2">Handpicked just for you</p>
            </div>
            <Button asChild variant="link">
              <Link href="/shop" className="inline-flex items-center">
                View All
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ErrorBoundary
            fallback={
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unable to Load Featured Products
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We're having trouble loading featured products. Please try again later.
                </p>
                <Button asChild variant="primary">
                  <Link href="/shop">Browse All Products</Link>
                </Button>
              </div>
            }
          >
            <Suspense fallback={<ProductGridSkeleton count={8} />}>
              {featuredProducts && featuredProducts.length > 0 ? (
                <ProductGrid products={featuredProducts} />
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Tag className="w-12 h-12 text-gray-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Featured Products
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Check back soon for amazing featured products!
                  </p>
                  <Button asChild variant="primary">
                    <Link href="/shop">Browse All Products</Link>
                  </Button>
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>

      {/* Hot Deals */}
      <section 
        className="py-12 md:py-16 bg-gradient-to-br from-red-50 to-orange-50"
        aria-labelledby="hot-deals-heading"
      >
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0" aria-hidden="true">
                <Tag className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 id="hot-deals-heading" className="text-2xl md:text-3xl font-bold">
                  🔥 Hot Deals
                </h2>
                <p className="text-gray-600">Limited time offers</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" aria-hidden="true" />
              <span className="text-sm font-medium text-red-600">Ending Soon</span>
            </div>
          </div>

          <ErrorBoundary
            fallback={
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unable to Load Deals
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We're having trouble loading deals. Please try again later.
                </p>
                <Button asChild variant="primary">
                  <Link href="/deals">View All Deals</Link>
                </Button>
              </div>
            }
          >
            <Suspense fallback={<ProductGridSkeleton count={8} />}>
              {deals && deals.length > 0 ? (
                <ProductGrid products={deals} showTimer />
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <Tag className="w-12 h-12 text-red-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Active Deals
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Stay tuned for amazing deals coming soon!
                  </p>
                  <Button asChild variant="primary">
                    <Link href="/shop">Browse Products</Link>
                  </Button>
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>

      {/* Categories Section */}
      <section
        className="py-12 md:py-16 bg-gradient-to-b from-white to-gray-50/50"
        aria-labelledby="categories-heading"
      >
        <div className="container-responsive">
          {/* Section Header */}
          <div className="mb-10 md:mb-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2
                  id="categories-heading"
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight"
                >
                  Shop by Category
                </h2>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  Discover our curated collections across multiple categories. Find exactly what you need.
                </p>
              </div>

              {/* View All Link - Desktop */}
              <Link
                href="/categories"
                className="hidden md:inline-flex items-center text-red-600 hover:text-red-700 font-medium transition-colors group"
                aria-label="View all categories"
              >
                <span className="mr-2">View All</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /> 
              </Link>
            </div>

            {/* Category Stats Bar */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-500">    
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" aria-hidden="true" />
                <span>100+ Categories</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" aria-hidden="true" />
                <span>Fast Delivery</span>
              </div>
              <div className="hidden md:flex items-center">
                <Shield className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" aria-hidden="true" />
                <span>Quality Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Categories Content with Error Boundary */}
          <ErrorBoundary fallback={<CategoryErrorFallback />}>
            <Suspense fallback={<CategoryGridSkeleton />}>
              {categories && categories.length > 0 ? (
                <>
                  <CategoryGrid
                    categories={categories}
                    loading="eager"
                    priority
                  />

                  {/* Mobile View All Link */}
                  <div className="md:hidden mt-8 text-center">
                    <Link
                      href="/categories"
                      className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      aria-label="View all categories"
                    >
                      View All Categories
                      <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Tag className="w-12 h-12 text-gray-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No Categories Available
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Categories will appear here once added to the system.
                  </p>
                  <Button asChild variant="primary">
                    <Link href="/shop">Browse Products</Link>
                  </Button>
                </div>
              )}

              {/* Performance Monitoring Marker */}
              <div
                data-perf-marker="categories-loaded"
                className="hidden"
                aria-hidden="true"
              />
            </Suspense>
          </ErrorBoundary>

          {/* SEO Structured Data (JSON-LD) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "name": "Product Categories",
                "description": "Browse through our extensive collection of product categories",   
                "numberOfItems": categories?.length || 0,
                "itemListElement": categories?.map((category: Category, index: number) => ({
                  "@type": "ListItem",
                  "position": index + 1,
                  "item": {
                    "@type": "CategoryCode",
                    "name": category.name,
                    "url": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://xarastore.com'}/category/${category.slug}`,
                    "image": category.imageUrl
                  }
                })) || []
              })
            }}
          />
        </div>
      </section>

      {/* Mobile App CTA */}
      <section 
        className="py-12 md:py-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white"
        aria-labelledby="mobile-app-heading"
      >
        <div className="container-responsive">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                <Smartphone className="w-4 h-4 mr-2" aria-hidden="true" />
                <span className="text-sm font-medium">Mobile App Available</span>
              </div>

              <h2 id="mobile-app-heading" className="text-3xl md:text-4xl font-bold">
                Shop on the go with our mobile app
              </h2>

              <p className="text-gray-300 text-lg">
                Get the best deals, personalized recommendations, and faster checkout on your mobile device.
              </p>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {appFeatures.map((feature) => (
                    <div key={feature.title} className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
                        <feature.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-gray-400">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <AppStoreBadges />
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[9/16] max-w-sm mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-4">
                <div className="w-full h-full bg-gradient-to-br from-red-600/20 to-orange-600/20 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-24 h-24 text-white/30" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brands */}
      <section className="py-12 md:py-16" aria-labelledby="brands-heading">
        <div className="container-responsive">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 id="brands-heading" className="text-2xl md:text-3xl font-bold">
                Top Brands
              </h2>
              <p className="text-gray-600 mt-2">Shop from trusted brands</p>
            </div>
            <Button asChild variant="link">
              <Link href="/brands" className="inline-flex items-center">
                View All Brands
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ErrorBoundary
            fallback={
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unable to Load Brands
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We're having trouble loading brands. Please try again later.
                </p>
              </div>
            }
          >
            {brands && brands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {brands.slice(0, 12).map((brand: Brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.slug}`}
                    className="group focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-lg"
                  >
                    <div className="bg-white border border-gray-200 hover:border-red-300 hover:shadow-md rounded-lg p-4 flex items-center justify-center h-24 transition-all duration-200">
                      {brand.logo ? (
                        <div className="relative w-full h-12">
                          <Image
                            src={brand.logo}
                            alt={`${brand.name} logo`}
                            fill
                            className="object-contain group-hover:scale-105 transition-transform"   
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-800 group-hover:text-red-600 text-center">     
                          {brand.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Tag className="w-12 h-12 text-gray-400" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Brands Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Brands will appear here once added
                </p>
              </div>
            )}
          </ErrorBoundary>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-12 md:py-16 bg-gray-50" aria-labelledby="newsletter-heading">
        <div className="container-responsive max-w-2xl text-center">
          <h2 id="newsletter-heading" className="text-2xl md:text-3xl font-bold mb-4">
            Never Miss a Deal
          </h2>
          <p className="text-gray-600 mb-8">
            Subscribe to our newsletter and be the first to know about exclusive offers
          </p>

          <form className="flex flex-col sm:flex-row gap-4" action="/api/newsletter" method="POST">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              type="email"
              id="newsletter-email"
              name="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
              required
              aria-required="true"
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="whitespace-nowrap"
              aria-label="Subscribe to newsletter"
            >
              Subscribe
            </Button>
          </form>

          <p className="text-sm text-gray-500 mt-4">
            By subscribing, you agree to our Privacy Policy and consent to receive updates.       
          </p>
        </div>
      </section>
    </div>
  );
}

// Category Error Fallback Component
function CategoryErrorFallback() {
  return (
    <div className="text-center py-12" role="alert">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Categories Temporarily Unavailable
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        We're having trouble loading categories. Please try refreshing the page.
      </p>
      <Button asChild variant="primary">
        <Link href="/categories" className="inline-flex items-center">
          View Categories
          <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

// Enhanced CategoryGridSkeleton Component
function CategoryGridSkeleton() {
  return (
    <div className="space-y-8">
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
        role="status"
        aria-label="Loading categories"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl bg-gray-100"
          >
            <div className="aspect-square w-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Mobile View All Link Skeleton */}
      <div className="md:hidden text-center pt-4">
        <div className="h-12 w-48 bg-gray-200 rounded-lg mx-auto animate-pulse" />
      </div>
    </div>
  );
}
