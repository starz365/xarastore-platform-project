import { Suspense } from 'react';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { getTodaysDeals } from '@/lib/supabase/queries/deals';

export const metadata = {
  title: "Today's Deals | Xarastore",
  description: "Daily special offers and exclusive discounts available only today. Don't miss out!",
};

export default async function TodaysDealsPage() {
  const todaysDeals = await getTodaysDeals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-semibold">DAILY DEALS</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              📅 Today's Deals
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Fresh discounts updated daily. These offers are only available today!
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Refreshes daily at midnight EAT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Daily Special Offers</h2>
              <p className="text-gray-600 mt-2">
                {todaysDeals.length > 0 
                  ? `${todaysDeals.length} exclusive deal${todaysDeals.length !== 1 ? 's' : ''} for today`
                  : "Check back tomorrow for new daily deals"
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Updated daily</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {todaysDeals.length > 0 ? (
            <ProductGrid products={todaysDeals} />
          ) : (
            <EmptyState
              title="No Daily Deals Available"
              description="Today's deals have already been claimed. Check back tomorrow for fresh discounts or browse our ongoing deals."
              icon="search"
              action={{
                label: 'View All Deals',
                href: '/deals',
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
