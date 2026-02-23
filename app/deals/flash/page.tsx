import { Suspense } from 'react';
import { Zap, Clock, AlertCircle } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { DealTimer } from '@/components/deals/DealTimer';
import { getFlashDeals } from '@/lib/supabase/queries/deals';

export const metadata = {
  title: 'Flash Sales | Xarastore',
  description: 'Limited time flash sales with huge discounts. Act fast before they sell out!',
};

export default async function FlashDealsPage() {
  const flashDeals = await getFlashDeals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Zap className="w-5 h-5" />
              <span className="text-sm font-semibold">FLASH SALE ACTIVE</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ⚡ Flash Sales
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Limited quantities, massive discounts. These deals won't last long!
            </p>
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Ends in:</span>
              </div>
              <DealTimer targetTime={new Date(Date.now() + 6 * 60 * 60 * 1000)} />
            </div>
          </div>
        </div>
      </div>

      {/* Flash Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Active Flash Sales</h2>
              <p className="text-gray-600 mt-2">
                {flashDeals.length > 0 
                  ? `${flashDeals.length} flash deal${flashDeals.length !== 1 ? 's' : ''} available`
                  : 'No flash sales currently active'
                }
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {flashDeals.length > 0 ? (
            <>
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">Flash Sale Tips</p>
                    <ul className="text-sm text-orange-800 mt-1 space-y-1">
                      <li>• Limited quantities available</li>
                      <li>• Prices are only available during the sale period</li>
                      <li>• Add to cart quickly to secure your item</li>
                      <li>• No price matching or rain checks on flash sales</li>
                    </ul>
                  </div>
                </div>
              </div>

              <ProductGrid products={flashDeals} showTimer />
            </>
          ) : (
            <EmptyState
              title="No Flash Sales Active"
              description="Flash sales appear here for limited periods. Check back regularly or enable notifications to never miss a deal."
              icon="search"
              action={{
                label: 'Browse All Deals',
                href: '/deals',
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
