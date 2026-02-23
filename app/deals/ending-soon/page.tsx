import { Suspense } from 'react';
import { Clock, AlertTriangle, Hourglass } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { DealTimer } from '@/components/deals/DealTimer';
import { getEndingSoonDeals } from '@/lib/supabase/queries/deals';

export const metadata = {
  title: 'Deals Ending Soon | Xarastore',
  description: 'Last chance to grab these amazing deals before they expire. Limited time offers ending soon!',
};

export default async function EndingSoonDealsPage() {
  const endingSoonDeals = await getEndingSoonDeals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-semibold">LAST CHANCE</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ⏰ Deals Ending Soon
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Don't miss out! These exclusive offers are about to expire. Act fast before they're gone forever.
            </p>
          </div>
        </div>
      </div>

      {/* Ending Soon Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Limited Time Offers</h2>
              <p className="text-gray-600 mt-2">
                {endingSoonDeals.length > 0 
                  ? `${endingSoonDeals.length} deal${endingSoonDeals.length !== 1 ? 's' : ''} expiring soon`
                  : 'No deals ending soon'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 text-red-600">
              <Hourglass className="w-5 h-5" />
              <span className="text-sm font-medium">Time is running out!</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {endingSoonDeals.length > 0 ? (
            <>
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Act Quickly!</p>
                    <ul className="text-sm text-red-800 mt-1 space-y-1">
                      <li>• These deals expire within the next 72 hours</li>
                      <li>• Prices will return to normal after expiration</li>
                      <li>• Limited stock available on ending soon deals</li>
                      <li>• No extensions or renewals on expiring deals</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid gap-6">
                {endingSoonDeals.map((deal) => (
                  <div key={deal.id} className="relative">
                    <div className="absolute top-4 left-4 z-10">
                      <DealTimer 
                        targetTime={new Date(deal.dealEndsAt || Date.now())}
                        className="text-sm"
                      />
                    </div>
                    <ProductGrid products={[deal]} showTimer={false} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No Deals Ending Soon"
              description="All current deals are still available. Check back regularly for new limited-time offers."
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
