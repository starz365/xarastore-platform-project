'use client';

import { useRouter } from 'next/navigation';

interface ShopFiltersProps {
  filterOptions: {
    categories: Array<{
      id: string;
      slug: string;
      name: string;
      count: number;
      isActive: boolean;
    }>;
    brands: Array<{
      id: string;
      slug: string;
      name: string;
      count: number;
      isActive: boolean;
    }>;
    priceRanges: Array<{
      min: number;
      max: number | null;
      label: string;
    }>;
    ratings: Array<{
      value: number;
      label: string;
      count: number;
    }>;
    availability: Array<{
      value: string;
      label: string;
      count: number;
    }>;
  };
  searchQuery: string;
  minPrice?: number;
  maxPrice?: number;
  categorySlug: string;
  brandSlug: string;
  minRating?: number;
  availability: string;
}

export function ShopFilters({
  filterOptions,
  searchQuery,
  minPrice,
  maxPrice,
  categorySlug,
  brandSlug,
  minRating,
  availability,
}: ShopFiltersProps) {
  const router = useRouter();

  const toggleFiltersSidebar = () => {
    const sidebar = document.getElementById('filters-sidebar');
    sidebar?.classList.toggle('hidden');
  };

  const hasActiveFilters = searchQuery || categorySlug || brandSlug || minPrice || maxPrice || minRating || availability !== 'all';

  return (
    <div className="sticky top-6 space-y-6">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg"
          onClick={toggleFiltersSidebar}
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
                  className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${category.isActive ? 'bg-red-50 text-red-600' : ''
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
                  className={`flex items-center justify-between p-2 rounded hover:bg-gray-50 ${brand.isActive ? 'bg-red-50 text-red-600' : ''
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
        {hasActiveFilters && (
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
  );
}
