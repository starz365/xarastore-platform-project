import { Suspense } from 'react';
import { Search as SearchIcon, Filter, Grid, List } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { SearchFilters } from '@/components/search/SearchFilters';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { searchProducts } from '@/lib/supabase/queries/products';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  
  return {
    title: query ? `Search Results for "${query}" | Xarastore` : 'Search | Xarastore',
    description: query ? `Find the best products matching "${query}" on Xarastore.` : 'Search for products on Xarastore.',
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const sort = typeof params.sort === 'string' ? params.sort : 'relevance';
  
  // Extract filters from search params
  const minPrice = typeof params.min_price === 'string' ? parseInt(params.min_price) : undefined;
  const maxPrice = typeof params.max_price === 'string' ? parseInt(params.max_price) : undefined;
  const minRating = typeof params.min_rating === 'string' ? parseInt(params.min_rating) : undefined;
  const categories = typeof params.categories === 'string' ? params.categories.split(',') : [];
  const brands = typeof params.brands === 'string' ? params.brands.split(',') : [];
  const availability = typeof params.availability === 'string' ? params.availability as 'all' | 'in-stock' | 'out-of-stock' : 'all';
  
  const filters = {
    minPrice,
    maxPrice,
    minRating,
    categoryIds: categories,
    brandIds: brands,
    sortBy: sort,
  };

  const { products, total } = await searchProducts(query, filters, page, 24);

  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case 'relevance': return 'Relevance';
      case 'newest': return 'Newest';
      case 'price-low': return 'Price: Low to High';
      case 'price-high': return 'Price: High to Low';
      case 'rating': return 'Top Rated';
      case 'popular': return 'Most Popular';
      default: return 'Relevance';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-8">
        <div className="container-responsive">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center space-x-3 mb-6">
              <SearchIcon className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Search Results</h1>
            </div>
            
            {/* Search Stats */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg">
                    {query ? (
                      <>
                        Showing results for <span className="font-bold">"{query}"</span>
                      </>
                    ) : (
                      'Browse all products'
                    )}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {total.toLocaleString()} product{total !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="text-sm">
                  Sorted by: <span className="font-semibold">{getSortLabel(sort)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    Refine Search
                  </h2>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Clear All
                  </Button>
                </div>
                <Suspense fallback={<FilterSkeleton />}>
                  <SearchFilters />
                </Suspense>
              </div>

              {/* Search Tips */}
              <div className="mt-6 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl p-6">
                <h3 className="font-bold mb-4">Search Tips</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use specific product names or model numbers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Try different spellings or abbreviations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Filter by category to narrow results</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Check deal items for special offers</span>
                  </li>
                </ul>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="hidden md:flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Grid className="w-4 h-4 mr-2" />
                      Grid
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-red-600"
                    >
                      <List className="w-4 h-4 mr-2" />
                      List
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Showing {((page - 1) * 24) + 1}-{Math.min(page * 24, total)} of {total.toLocaleString()} products
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <select
                    defaultValue={sort}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest Arrivals</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {products.length > 0 ? (
              <>
                <Suspense fallback={<ProductGridSkeleton />}>
                  <ProductGrid products={products} />
                </Suspense>

                {/* Pagination */}
                {total > 24 && (
                  <div className="mt-12 flex justify-center">
                    <nav className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                      >
                        Previous
                      </Button>
                      
                      {Array.from({ length: Math.min(5, Math.ceil(total / 24)) }).map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'primary' : 'outline'}
                            size="sm"
                            href={`/search?q=${encodeURIComponent(query)}&page=${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {Math.ceil(total / 24) > 5 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant="outline"
                            size="sm"
                            href={`/search?q=${encodeURIComponent(query)}&page=${Math.ceil(total / 24)}`}
                          >
                            {Math.ceil(total / 24)}
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page * 24 >= total}
                        href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchIcon className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No products found
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {query ? (
                    `We couldn't find any products matching "${query}". Try different keywords or browse categories.`
                  ) : (
                    'Please enter a search term to find products.'
                  )}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="primary">
                    <a href="/shop">Browse All Products</a>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href="/deals">View Deals</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Related Searches */}
            {query && (
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Related Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    `${query} pro`,
                    `${query} 2024`,
                    `${query} price`,
                    `best ${query}`,
                    `${query} discount`,
                  ].map((related, index) => (
                    <a
                      key={index}
                      href={`/search?q=${encodeURIComponent(related)}`}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-full hover:border-red-600 hover:text-red-600 transition-colors"
                    >
                      {related}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function FilterSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-8"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}

