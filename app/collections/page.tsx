
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, Clock, TrendingUp, Zap, Filter } from 'lucide-react';
import { 
  getFeaturedCollections, 
  getAllCollections,
  getCollectionTypesWithCounts,
  getTrendingCollections 
} from '@/lib/supabase/queries/collections';
import { EmptyState } from '@/components/product/EmptyState';
import { CollectionTypesGrid } from '@/components/collections/CollectionTypesGrid';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/currency';

export const metadata = {
  title: 'Collections - Curated Product Selections | Xarastore',
  description: 'Browse our curated collections of products. Discover themed selections for every occasion and need.',
};

export default async function CollectionsPage() {
  const [
    featuredCollections,
    allCollections,
    collectionTypes,
    trendingCollections
  ] = await Promise.all([
    getFeaturedCollections(6),
    getAllCollections({ pageSize: 9 }),
    getCollectionTypesWithCounts(),
    getTrendingCollections(4)
  ]);

  // Calculate total products across all collections
  const totalProductsInCollections = allCollections.collections.reduce(
    (sum, collection) => sum + collection.productCount, 
    0
  );

  // Calculate average collection size
  const averageCollectionSize = allCollections.collections.length > 0 
    ? totalProductsInCollections / allCollections.collections.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-20">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-3 mb-6">
              <Sparkles className="w-8 h-8" />
              <span className="text-lg font-semibold bg-white/20 px-4 py-1.5 rounded-full">
                CURATED COLLECTIONS
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Discover Curated Collections
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Handpicked product selections for every style, occasion, and need.
              Our experts curate the best products just for you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-1">{allCollections.total}</div>
                <div className="text-sm opacity-90">Active Collections</div>
              </div>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-1">{totalProductsInCollections.toLocaleString()}</div>
                <div className="text-sm opacity-90">Total Products</div>
              </div>
              <div className="flex flex-col">
                <div className="text-3xl font-bold mb-1">{Math.round(averageCollectionSize)}</div>
                <div className="text-sm opacity-90">Avg. Collection Size</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Collections */}
      <section className="py-12">
        <div className="container-responsive">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">⭐ Featured Collections</h2>
              <p className="text-gray-600 mt-2">Our most popular curated selections</p>
            </div>
            {featuredCollections.length > 0 && (
              <Button asChild variant="link">
                <Link href="#all-collections">
                  View All Collections
                </Link>
              </Button>
            )}
          </div>

          {featuredCollections.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-4">
                    <Image
                      src={collection.image}
                      alt={collection.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold">{collection.name}</h3>
                        <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs">
                          {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
                        </span>
                      </div>
                      <p className="text-white/90 mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {collection.productCount} product{collection.productCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                          Shop Now →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Featured Collections Available"
              description="Featured collections will be added soon. Check back for curated product selections."
              icon="sparkles"
              action={{
                label: 'Browse All Collections',
                href: '#all-collections',
              }}
            />
          )}
        </div>
      </section>

      {/* Collection Types */}
      <section className="py-12 bg-white">
        <div className="container-responsive">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Browse by Type</h2>
              <p className="text-gray-600 mt-2">
                Discover collections organized by category and theme
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {collectionTypes.filter(t => t.count > 0).length} type{collectionTypes.filter(t => t.count > 0).length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <Suspense fallback={
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          }>
            <CollectionTypesGrid />
          </Suspense>
        </div>
      </section>

      {/* Trending Collections */}
      {trendingCollections.length > 0 && (
        <section className="py-12 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="container-responsive">
            <div className="flex items-center space-x-3 mb-8">
              <TrendingUp className="w-8 h-8 text-red-600" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">🔥 Trending Now</h2>
                <p className="text-gray-600">Collections getting the most attention</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {trendingCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
                    <div className="relative h-48">
                      <Image
                        src={collection.image}
                        alt={collection.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold group-hover:text-red-600 transition-colors line-clamp-1">
                          {collection.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-red-600">
                          {collection.productCount} products
                        </span>
                        <span className="text-xs text-gray-500">
                          Trending
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Collections */}
      <section id="all-collections" className="py-12">
        <div className="container-responsive">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">All Collections</h2>
              <p className="text-gray-600">Browse our complete library of curated collections</p>
            </div>
            {allCollections.total > 0 && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Page {allCollections.page} of {allCollections.totalPages}
                </span>
                {allCollections.page > 1 && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/collections?page=${allCollections.page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                )}
                {allCollections.page < allCollections.totalPages && (
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/collections?page=${allCollections.page + 1}`}>
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {allCollections.collections.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {allCollections.collections.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="group block"
                  >
                    <div className="relative overflow-hidden rounded-xl aspect-[3/2] mb-4">
                      <Image
                        src={collection.image}
                        alt={collection.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-lg">{collection.name}</h3>
                          {collection.isFeatured && (
                            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                              FEATURED
                            </span>
                          )}
                        </div>
                        <p className="text-white/80 text-sm line-clamp-1">
                          {collection.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold group-hover:text-red-600 transition-colors">
                          {collection.name}
                        </h4>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-500">
                            {collection.productCount} product{collection.productCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {collection.type}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-red-600">
                        View Collection
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {allCollections.totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    {allCollections.page > 1 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/collections?page=${allCollections.page - 1}`}>
                          Previous
                        </Link>
                      </Button>
                    )}

                    {Array.from({ length: Math.min(5, allCollections.totalPages) }).map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={allCollections.page === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          asChild
                        >
                          <Link href={`/collections?page=${pageNum}`}>
                            {pageNum}
                          </Link>
                        </Button>
                      );
                    })}

                    {allCollections.totalPages > 5 && (
                      <>
                        <span className="px-2">...</span>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/collections?page=${allCollections.totalPages}`}>
                            {allCollections.totalPages}
                          </Link>
                        </Button>
                      </>
                    )}

                    {allCollections.page < allCollections.totalPages && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/collections?page=${allCollections.page + 1}`}>
                          Next
                        </Link>
                      </Button>
                    )}
                  </nav>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No Collections Found"
              description="New collections are being curated. Please check back soon."
              icon="search"
              action={{
                label: 'Browse Products',
                href: '/shop',
              }}
            />
          )}
        </div>
      </section>

      {/* Collection Benefits */}
      <section className="py-12 bg-gray-50">
        <div className="container-responsive">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Shop Collections?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Expertly Curated</h3>
              <p className="text-gray-600">
                Our experts handpick products that work perfectly together based on real customer data and trends.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Time Saving</h3>
              <p className="text-gray-600">
                Discover complete looks and sets without endless browsing. Perfect for busy shoppers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Seasonal Updates</h3>
              <p className="text-gray-600">
                Collections are regularly updated with seasonal products and trending items.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collection Statistics */}
      <section className="py-12 bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Collection Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold mb-2">{allCollections.total}</div>
              <div className="text-sm opacity-90">Active Collections</div>
            </div>
            <div className="text-center p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold mb-2">{totalProductsInCollections.toLocaleString()}</div>
              <div className="text-sm opacity-90">Total Products</div>
            </div>
            <div className="text-center p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold mb-2">
                {collectionTypes.filter(t => t.count > 0).length}
              </div>
              <div className="text-sm opacity-90">Collection Types</div>
            </div>
            <div className="text-center p-6 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold mb-2">
                {Math.round(averageCollectionSize)}
              </div>
              <div className="text-sm opacity-90">Avg. Products/Collection</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
