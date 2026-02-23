import { Suspense } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase/server';
import { ShopClient } from './ShopClient';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { getCategories, getBrands, getProductCounts, getActiveFilters } from '@/lib/supabase/queries/shop';

export const metadata: Metadata = {
  title: 'Shop All Products | Xarastore',
  description: 'Browse our complete collection of products. Discover amazing deals on electronics, fashion, home goods, and more.',
  openGraph: {
    title: 'Shop | Xarastore - it\'s a deal',
    description: 'Discover thousands of products at unbeatable prices',
  },
};

interface ShopPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    min_price?: string;
    max_price?: string;
    sort?: string;
    page?: string;
    rating?: string;
    availability?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const searchQuery = params.q || '';
  const categorySlug = params.category || '';
  const brandSlug = params.brand || '';
  const minPrice = params.min_price ? parseInt(params.min_price) : undefined;
  const maxPrice = params.max_price ? parseInt(params.max_price) : undefined;
  const sortBy = params.sort || 'featured';
  const page = parseInt(params.page || '1');
  const minRating = params.rating ? parseInt(params.rating) : undefined;
  const availability = params.availability || 'all';

  try {
    // Fetch all initial data in parallel
    const [
      categoriesData,
      brandsData,
      productCounts,
      activeFiltersData,
      featuredProducts,
    ] = await Promise.allSettled([
      getCategories(),
      getBrands(),
      getProductCounts(),
      getActiveFilters(categorySlug, brandSlug),
      fetchFeaturedProducts(),
    ]);

    const categories = categoriesData.status === 'fulfilled' ? categoriesData.value : [];
    const brands = brandsData.status === 'fulfilled' ? brandsData.value : [];
    const counts = productCounts.status === 'fulfilled' ? productCounts.value : { total: 0, categories: {}, brands: {} };
    const activeFilters = activeFiltersData.status === 'fulfilled' ? activeFiltersData.value : { category: null, brand: null };
    const featured = featuredProducts.status === 'fulfilled' ? featuredProducts.value : [];

    // Build filter options from active data
    const filterOptions = {
      categories: categories.map(cat => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        count: counts.categories[cat.id] || 0,
        isActive: cat.slug === categorySlug,
      })),
      brands: brands.map(brand => ({
        id: brand.id,
        slug: brand.slug,
        name: brand.name,
        count: counts.brands[brand.id] || 0,
        isActive: brand.slug === brandSlug,
      })),
      priceRanges: generatePriceRanges(counts.total),
      ratings: [
        { value: 4, label: '4+ Stars', count: 0 },
        { value: 3, label: '3+ Stars', count: 0 },
      ],
      availability: [
        { value: 'all', label: 'All Products', count: counts.total },
        { value: 'in_stock', label: 'In Stock', count: 0 },
        { value: 'out_of_stock', label: 'Out of Stock', count: 0 },
      ],
    };

    // Fetch paginated products with filters
    const { products, total, totalPages } = await fetchProducts({
      searchQuery,
      categorySlug,
      brandSlug,
      minPrice,
      maxPrice,
      sortBy,
      page,
      minRating,
      availability,
    });

    // Generate breadcrumbs
    const breadcrumbs = generateBreadcrumbs(activeFilters.category, activeFilters.brand, searchQuery);

    // Get sort options
    const sortOptions = getSortOptions(sortBy);

    // Check if this is first load with no data
    const isFirstLoad = counts.total === 0 && products.length === 0 && !searchQuery;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
          <div className="container-responsive py-8 md:py-12">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {searchQuery 
                  ? `Search Results for "${searchQuery}"` 
                  : categorySlug && activeFilters.category
                    ? activeFilters.category.name
                    : 'Shop All Products'
                }
              </h1>
              <p className="text-lg opacity-90">
                {searchQuery 
                  ? `Found ${total} matching products`
                  : categorySlug && activeFilters.category
                    ? activeFilters.category.description || `Browse ${total} products in ${activeFilters.category.name}`
                    : `Discover ${total} products across ${categories.length} categories`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="bg-white border-b border-gray-200">
            <div className="container-responsive py-3">
              <nav className="text-sm text-gray-600">
                <ol className="flex items-center space-x-2 overflow-x-auto">
                  <li>
                    <a href="/" className="hover:text-red-600 transition-colors">
                      Home
                    </a>
                  </li>
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.href} className="flex items-center">
                      <span className="mx-2">/</span>
                      <a
                        href={crumb.href}
                        className={`hover:text-red-600 transition-colors ${
                          index === breadcrumbs.length - 1 ? 'font-semibold text-gray-900' : ''
                        }`}
                      >
                        {crumb.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container-responsive py-6 md:py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                {/* Mobile Filter Toggle */}
                <div className="lg:hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg"
                    onClick={() => {
                      const sidebar = document.getElementById('filters-sidebar');
                      sidebar?.classList.toggle('hidden');
                    }}
                  >
                    <span className="font-semibold">Filters & Categories</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>

                {/* Filters */}
                <div id="filters-sidebar" className="lg:block space-y-6">
                  {/* Search */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Search Products</h3>
                    <form method="get" action="/shop" className="space-y-3">
                      <input
                        type="text"
                        name="q"
                        defaultValue={searchQuery}
                        placeholder="Search products..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Search
                      </button>
                    </form>
                  </div>

                  {/* Categories */}
                  {filterOptions.categories.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filterOptions.categories.map((category) => (
                          <a
                            key={category.id}
                            href={`/shop?category=${category.slug}`}
                            className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${
                              category.isActive ? 'bg-red-50 text-red-600' : ''
                            }`}
                          >
                            <span>{category.name}</span>
                            <span className="text-sm text-gray-500">{category.count}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {filterOptions.brands.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">Brands</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filterOptions.brands.map((brand) => (
                          <a
                            key={brand.id}
                            href={`/shop?brand=${brand.slug}`}
                            className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${
                              brand.isActive ? 'bg-red-50 text-red-600' : ''
                            }`}
                          >
                            <span>{brand.name}</span>
                            <span className="text-sm text-gray-500">{brand.count}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Range */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Min</label>
                          <input
                            type="number"
                            name="min_price"
                            defaultValue={minPrice}
                            placeholder="KES 0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Max</label>
                          <input
                            type="number"
                            name="max_price"
                            defaultValue={maxPrice}
                            placeholder="KES 100,000"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        form="filters-form"
                        className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Apply Price Filter
                      </button>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery || categorySlug || brandSlug || minPrice || maxPrice || minRating || availability !== 'all') && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <a
                        href="/shop"
                        className="block w-full py-2 text-center text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Clear All Filters
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{((page - 1) * 24) + 1}</span>-
                    <span className="font-semibold">{Math.min(page * 24, total)}</span> of{' '}
                    <span className="font-semibold">{total.toLocaleString()}</span> products
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Sort */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Sort by:</label>
                      <select
                        name="sort"
                        defaultValue={sortBy}
                        onChange={(e) => {
                          const url = new URL(window.location.href);
                          url.searchParams.set('sort', e.target.value);
                          url.searchParams.delete('page');
                          window.location.href = url.toString();
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        aria-label="Grid view"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        aria-label="List view"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilters.category || activeFilters.brand || searchQuery || minPrice || maxPrice || minRating || availability !== 'all' ? (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {activeFilters.category && (
                      <div className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm">
                        Category: {activeFilters.category.name}
                        <a href={`/shop?${removeFilterFromQuery('category')}`} className="ml-2 hover:text-red-900">
                          ×
                        </a>
                      </div>
                    )}
                    {activeFilters.brand && (
                      <div className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm">
                        Brand: {activeFilters.brand.name}
                        <a href={`/shop?${removeFilterFromQuery('brand')}`} className="ml-2 hover:text-red-900">
                          ×
                        </a>
                      </div>
                    )}
                    {searchQuery && (
                      <div className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm">
                        Search: {searchQuery}
                        <a href={`/shop?${removeFilterFromQuery('q')}`} className="ml-2 hover:text-red-900">
                          ×
                        </a>
                      </div>
                    )}
                    {(minPrice || maxPrice) && (
                      <div className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-800 rounded-full text-sm">
                        Price: {minPrice ? `KES ${minPrice.toLocaleString()}` : 'Min'} - {maxPrice ? `KES ${maxPrice.toLocaleString()}` : 'Max'}
                        <a href={`/shop?${removeFilterFromQuery(['min_price', 'max_price'])}`} className="ml-2 hover:text-red-900">
                          ×
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Products Grid */}
              {isFirstLoad ? (
                <EmptyState
                  title="Welcome to Xarastore Shop!"
                  description="Our product catalog is currently being set up. Products will appear here once they are added by our administrators."
                  icon="cart"
                  action={{
                    label: "Browse Categories",
                    href: "/categories"
                  }}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products found"
                  description="Try adjusting your filters or search terms to find what you're looking for."
                  icon="search"
                  action={{
                    label: "Clear Filters",
                    href: "/shop"
                  }}
                />
              ) : (
                <>
                  <Suspense fallback={<ProductGridSkeleton />}>
                    <ShopClient
                      initialProducts={products}
                      total={total}
                      page={page}
                      totalPages={totalPages}
                      searchQuery={searchQuery}
                      filters={{
                        category: categorySlug,
                        brand: brandSlug,
                        minPrice,
                        maxPrice,
                        sortBy,
                        minRating,
                        availability,
                      }}
                    />
                  </Suspense>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <nav className="flex items-center space-x-2">
                        <a
                          href={`/shop?${buildPageQuery(page - 1)}`}
                          className={`px-3 py-2 border rounded-lg ${
                            page === 1
                              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-disabled={page === 1}
                        >
                          Previous
                        </a>
                        
                        {generatePaginationItems(page, totalPages).map((item, index) => (
                          <a
                            key={index}
                            href={item === '...' ? '#' : `/shop?${buildPageQuery(item as number)}`}
                            className={`px-3 py-2 border rounded-lg ${
                              item === page
                                ? 'border-red-600 bg-red-600 text-white'
                                : item === '...'
                                ? 'border-transparent'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {item}
                          </a>
                        ))}
                        
                        <a
                          href={`/shop?${buildPageQuery(page + 1)}`}
                          className={`px-3 py-2 border rounded-lg ${
                            page === totalPages
                              ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                          aria-disabled={page === totalPages}
                        >
                          Next
                        </a>
                      </nav>
                    </div>
                  )}
                </>
              )}

              {/* Featured Products */}
              {featured.length > 0 && products.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
                  <Suspense fallback={<ProductGridSkeleton count={4} />}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {/* Featured products grid - would render ProductCard components */}
                    </div>
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden form for filter submissions */}
        <form id="filters-form" method="get" action="/shop" className="hidden">
          {searchQuery && <input type="hidden" name="q" value={searchQuery} />}
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
          {minPrice && <input type="hidden" name="min_price" value={minPrice} />}
          {maxPrice && <input type="hidden" name="max_price" value={maxPrice} />}
          {minRating && <input type="hidden" name="rating" value={minRating} />}
          {availability !== 'all' && <input type="hidden" name="availability" value={availability} />}
        </form>
      </div>
    );
  } catch (error) {
    console.error('Shop page error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to load products</h1>
          <p className="text-gray-600 mb-6">Please try again or contact support if the problem persists.</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }
}

// Helper functions
async function fetchFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_featured', true)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) throw error;
  return data || [];
}

async function fetchProducts(filters: {
  searchQuery: string;
  categorySlug: string;
  brandSlug: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: string;
  page: number;
  minRating?: number;
  availability: string;
}) {
  const pageSize = 24;
  const offset = (filters.page - 1) * pageSize;

  let query = supabase
    .from('products')
    .select('*, brand:brands(*), category:categories(*)', { count: 'exact' });

  // Apply filters
  if (filters.searchQuery) {
    query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
  }

  if (filters.categorySlug) {
    query = query.eq('categories.slug', filters.categorySlug);
  }

  if (filters.brandSlug) {
    query = query.eq('brands.slug', filters.brandSlug);
  }

  if (filters.minPrice) {
    query = query.gte('price', filters.minPrice);
  }

  if (filters.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.availability === 'in_stock') {
    query = query.gt('stock', 0);
  } else if (filters.availability === 'out_of_stock') {
    query = query.eq('stock', 0);
  }

  // Apply sorting
  switch (filters.sortBy) {
    case 'price_low':
      query = query.order('price', { ascending: true });
      break;
    case 'price_high':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating', { ascending: false });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('name', { ascending: false });
      break;
    default:
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  }

  // Pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    products: data || [],
    total,
    totalPages,
  };
}

function generatePriceRanges(totalProducts: number) {
  if (totalProducts === 0) return [];
  
  return [
    { min: 0, max: 1000, label: 'Under KES 1,000' },
    { min: 1000, max: 5000, label: 'KES 1,000 - 5,000' },
    { min: 5000, max: 10000, label: 'KES 5,000 - 10,000' },
    { min: 10000, max: 50000, label: 'KES 10,000 - 50,000' },
    { min: 50000, max: null, label: 'Over KES 50,000' },
  ];
}

function generateBreadcrumbs(category: any, brand: any, searchQuery: string) {
  const breadcrumbs = [];

  if (searchQuery) {
    breadcrumbs.push({
      label: `Search: "${searchQuery}"`,
      href: `/shop?q=${encodeURIComponent(searchQuery)}`,
    });
  } else {
    if (category) {
      breadcrumbs.push({
        label: category.name,
        href: `/shop?category=${category.slug}`,
      });
    }
    if (brand) {
      breadcrumbs.push({
        label: brand.name,
        href: `/shop?brand=${brand.slug}`,
      });
    }
  }

  return breadcrumbs;
}

function getSortOptions(currentSort: string) {
  return [
    { value: 'featured', label: 'Featured' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'name_asc', label: 'Name: A to Z' },
    { value: 'name_desc', label: 'Name: Z to A' },
  ];
}

function generatePaginationItems(currentPage: number, totalPages: number) {
  const items = [];
  const maxVisible = 5;
  
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
  } else {
    items.push(1);
    
    if (currentPage > 3) {
      items.push('...');
    }
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    
    if (currentPage < totalPages - 2) {
      items.push('...');
    }
    
    items.push(totalPages);
  }
  
  return items;
}

function buildPageQuery(page: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('page', page.toString());
  return url.searchParams.toString();
}

function removeFilterFromQuery(filterNames: string | string[]) {
  const url = new URL(window.location.href);
  const names = Array.isArray(filterNames) ? filterNames : [filterNames];
  
  names.forEach(name => {
    url.searchParams.delete(name);
  });
  url.searchParams.delete('page');
  
  return url.searchParams.toString();
}
