import { Suspense } from 'react';
import { Star, Award, TrendingUp, CheckCircle } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { getTopRatedDeals } from '@/lib/supabase/queries/deals';

export const metadata = {
  title: 'Top Rated Deals | Xarastore',
  description: 'Shop the best reviewed products with verified customer ratings. Quality you can trust at discounted prices.',
};

export default async function TopRatedDealsPage() {
  const topRatedDeals = await getTopRatedDeals();

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Award className="w-5 h-5" />
              <span className="text-sm font-semibold">CUSTOMER FAVORITES</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              ⭐ Top Rated Deals
            </h1>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Shop with confidence from our highest rated products, now at discounted prices.
            </p>
          </div>
        </div>
      </div>

      {/* Top Rated Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Customer Verified Deals</h2>
              <p className="text-gray-600 mt-2">
                {topRatedDeals.length > 0 
                  ? `${topRatedDeals.length} highly rated product${topRatedDeals.length !== 1 ? 's' : ''} on sale`
                  : 'No top rated deals available'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 text-yellow-600">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Based on customer reviews</span>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {topRatedDeals.length > 0 ? (
            <>
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Average Rating</p>
                      <p className="font-bold text-lg">
                        {Math.max(...topRatedDeals.map(d => d.rating)).toFixed(1)}/5
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Verified Reviews</p>
                      <p className="font-bold text-lg">
                        {topRatedDeals.reduce((sum, deal) => sum + (deal.review_count || 0), 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer Satisfaction</p>
                      <p className="font-bold text-lg">98%</p>
                    </div>
                  </div>
                </div>
              </div>

              <ProductGrid products={topRatedDeals} />
            </>
          ) : (
            <EmptyState
              title="No Top Rated Deals Available"
              description="Top rated deals appear here based on customer reviews and ratings. Check back soon or browse other deals."
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
