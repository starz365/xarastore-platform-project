import { Suspense } from 'react';
import { Rocket, Calendar, TrendingUp, Package } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { getNewArrivalDeals } from '@/lib/supabase/queries/deals';

export const metadata = {
  title: 'New Arrival Deals | Xarastore',
  description: 'Discover the latest products with special introductory discounts. Be the first to get new arrivals at great prices!',
};

export default async function NewArrivalDealsPage() {
  const newArrivalDeals = await getNewArrivalDeals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Rocket className="w-5 h-5" />
              <span className="text-sm font-semibold">FRESH ARRIVALS</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              🚀 New Arrival Deals
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Be the first to get our latest products with special introductory discounts.
            </p>
          </div>
        </div>
      </div>

      {/* New Arrival Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Latest Products on Sale</h2>
              <p className="text-gray-600 mt-2">
                {newArrivalDeals.length > 0 
                  ? `${newArrivalDeals.length} new product${newArrivalDeals.length !== 1 ? 's' : ''} with deals`
                  : 'No new arrival deals available'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 text-green-600">
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-medium">Arrived this week</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {newArrivalDeals.length > 0 ? (
            <>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recently Added</p>
                      <p className="font-bold text-lg">This Week</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Introductory Prices</p>
                      <p className="font-bold text-lg">Limited Time</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Exclusive Launch</p>
                      <p className="font-bold text-lg">First Access</p>
                    </div>
                  </div>
                </div>
              </div>

              <ProductGrid products={newArrivalDeals} />
            </>
          ) : (
            <EmptyState
              title="No New Arrival Deals"
              description="New products with special introductory discounts will appear here. Check back soon for fresh arrivals."
              icon="search"
              action={{
                label: 'Browse All Products',
                href: '/shop',
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
