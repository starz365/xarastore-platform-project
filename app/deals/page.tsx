import { Suspense } from 'react';
import { Flame, Clock, Zap, TrendingDown, Star, Calendar, Rocket, Target } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { Button } from '@/components/ui/Button';
import { DealTimer } from '@/components/deals/DealTimer';
import { getDeals } from '@/lib/supabase/queries/deals';
import { getDealCategories } from '@/lib/supabase/queries/categories';
import Link from 'next/link';

export const metadata = {
  title: 'Deals & Offers | Xarastore',
  description: 'Discover amazing deals, limited-time offers, and exclusive discounts on Xarastore. Save big on your favorite products!',
};

// Server Component - safe for async operations
export default async function DealsPage() {
  try {
    const [deals, dealCategories] = await Promise.allSettled([
      getDeals(),
      getDealCategories(),
    ]);

    // Safely extract data with fallbacks
    const dealsData = deals.status === 'fulfilled' ? deals.value : [];
    const categoriesData = dealCategories.status === 'fulfilled' ? dealCategories.value : [];

    const featuredDeals = dealsData.filter(deal => deal?.is_featured).slice(0, 8);
    const endingSoonDeals = dealsData
      .filter(deal => deal?.deal_ends_at && new Date(deal.deal_ends_at) < new Date(Date.now() + 24 * 60 * 60 * 1000))
      .slice(0, 4);

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-red-600 to-red-800 text-white">
          <div className="container-responsive py-12 md:py-20">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Flame className="w-5 h-5" />
                <span className="text-sm font-semibold">LIMITED TIME OFFERS</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Unbeatable Deals Await
              </h1>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Shop exclusive discounts, flash sales, and special offers updated daily. 
                Your next great deal starts here.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="#flash-sales" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 h-12 px-6 text-base">
                  <Zap className="w-5 h-5 mr-2" />
                  Flash Sales
                </Link>
                <Link href="#ending-soon" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 border hover:bg-red-50 active:bg-red-100 h-12 px-6 text-base text-white border-white">
                  <Clock className="w-5 h-5 mr-2" />
                  Ending Soon
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Deal Categories */}
        <section className="py-12">
          <div className="container-responsive">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Target className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl md:text-3xl font-bold">Shop by Deal Type</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DealCategoryCard
                href="/deals/flash"
                icon={<Zap className="w-6 h-6" />}
                title="Flash Sales"
                description="Limited time, limited quantity"
                color="from-orange-500 to-red-500"
              />
              <DealCategoryCard
                href="/deals/today"
                icon={<Calendar className="w-6 h-6" />}
                title="Today's Deals"
                description="Daily special offers"
                color="from-blue-500 to-purple-500"
              />
              <DealCategoryCard
                href="/deals/top-rated"
                icon={<Star className="w-6 h-6" />}
                title="Top Rated"
                description="Best reviewed products on sale"
                color="from-yellow-500 to-orange-500"
              />
              <DealCategoryCard
                href="/deals/new"
                icon={<Rocket className="w-6 h-6" />}
                title="New Arrivals"
                description="Fresh products with discounts"
                color="from-green-500 to-teal-500"
              />
            </div>
          </div>
        </section>

        {/* Flash Sales */}
        <section id="flash-sales" className="py-12 bg-white">
          <div className="container-responsive">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Zap className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">⚡ Flash Sales</h2>
                  <p className="text-gray-600">Limited quantities, act fast!</p>
                </div>
              </div>
              <DealTimer targetTime={new Date(Date.now() + 4 * 60 * 60 * 1000)} />
            </div>
            
            <Suspense fallback={<ProductGridSkeleton count={4} />}>
              {featuredDeals.length > 0 ? (
                <ProductGrid products={featuredDeals} showTimer />
              ) : (
                <EmptyDealsState
                  icon={<Zap className="w-12 h-12" />}
                  title="No flash sales active"
                  description="Check back soon for limited-time flash deals"
                />
              )}
            </Suspense>
          </div>
        </section>

        {/* Deal Categories Grid */}
        {categoriesData.length > 0 && (
          <section className="py-12 bg-gray-50">
            <div className="container-responsive">
              <div className="flex items-center space-x-3 mb-8">
                <TrendingDown className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl md:text-3xl font-bold">Hot Categories</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categoriesData.map((category) => (
                  <Link
                    key={category.id}
                    href={`/deals/category/${category.slug}`}
                    className="group"
                  >
                    <div className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-red-300">
                      <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        {category.icon ? (
                          <span className="text-2xl">{category.icon}</span>
                        ) : (
                          <div className="w-6 h-6 bg-red-600 rounded-full" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-600">
                        {category.product_count > 0 ? `${category.product_count} deals` : 'Coming soon'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Ending Soon */}
        <section id="ending-soon" className="py-12">
          <div className="container-responsive">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-red-600" />
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">⏰ Ending Soon</h2>
                  <p className="text-gray-600">Last chance to grab these deals</p>
                </div>
              </div>
              <Link href="/deals/ending-soon" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 text-red-600 underline-offset-4 hover:underline hover:text-red-700 h-10 px-4 py-2">
                View All
              </Link>
            </div>
            
            <Suspense fallback={<ProductGridSkeleton count={4} />}>
              {endingSoonDeals.length > 0 ? (
                <ProductGrid products={endingSoonDeals} showTimer />
              ) : (
                <EmptyDealsState
                  icon={<Clock className="w-12 h-12" />}
                  title="No deals ending soon"
                  description="All current deals are still available"
                />
              )}
            </Suspense>
          </div>
        </section>

        {/* All Deals */}
        <section className="py-12 bg-white border-t border-gray-200">
          <div className="container-responsive">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">All Active Deals</h2>
              <p className="text-gray-600">Browse all available discounts and offers</p>
            </div>
            
            <Suspense fallback={<ProductGridSkeleton count={12} />}>
              {dealsData.length > 0 ? (
                <ProductGrid products={dealsData.slice(0, 12)} />
              ) : (
                <EmptyDealsState
                  icon={<Flame className="w-12 h-12" />}
                  title="No deals available yet"
                  description="Deals will appear here once they're added to the platform"
                  action={{
                    label: 'Browse Products',
                    href: '/shop',
                  }}
                />
              )}
            </Suspense>
          </div>
        </section>

        {/* Deal Tips */}
        <section className="py-12 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="container-responsive">
            <h2 className="text-2xl font-bold text-center mb-10">Maximize Your Savings</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <DealTip
                icon="🔔"
                title="Enable Notifications"
                description="Get instant alerts for new flash sales and price drops"
              />
              <DealTip
                icon="⭐"
                title="Save for Later"
                description="Add deals to your wishlist to track availability"
              />
              <DealTip
                icon="⚡"
                title="Act Quickly"
                description="Flash sales have limited stock and sell out fast"
              />
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    console.error('Error loading deals page:', error);
    return <DealsErrorBoundary />;
  }
}

function DealCategoryCard({ 
  href, 
  icon, 
  title, 
  description, 
  color 
}: { 
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group block"
    >
      <div className={`bg-gradient-to-br ${color} text-white rounded-xl p-6 text-center transition-transform duration-200 group-hover:scale-105`}>
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm opacity-90">{description}</p>
      </div>
    </Link>
  );
}

function DealTip({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function EmptyDealsState({ 
  icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      {action && (
        <Link href={action.href} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-red-600 text-white hover:bg-red-700 h-11 px-8 text-base">
          {action.label}
        </Link>
      )}
    </div>
  );
}

// Error boundary component for when data fetching fails
function DealsErrorBoundary() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="container-responsive py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Flame className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Unable to Load Deals
          </h1>
          <p className="text-gray-600 mb-8">
            We're having trouble loading the deals right now. Please try again later.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-red-600 text-white hover:bg-red-700 h-11 px-8 text-base">
              Go Home
            </Link>
            <Link href="/shop" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 h-11 px-8 text-base">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
