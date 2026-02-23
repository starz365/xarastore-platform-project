'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Grid, List, ChevronDown, X, Package } from 'lucide-react';
import { Product } from '@/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { SearchFilters } from './SearchFilters';
import { SearchFiltersMobile } from './SearchFiltersMobile';
import { Skeleton } from '@/components/ui/Skeleton';

interface SearchResultsProps {
  initialProducts?: Product[];
  totalCount?: number;
}

export function SearchResults({ initialProducts, totalCount }: SearchResultsProps) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [total, setTotal] = useState(totalCount || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : undefined,
    maxPrice: searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined,
    brands: searchParams.get('brands') ? searchParams.get('brands')!.split(',') : [],
    categories: searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [],
    sortBy: searchParams.get('sort') || 'relevance',
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      fetchSearchResults();
    }
  }, [query, filters, searchParams]);

  const fetchSearchResults = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (filters.minPrice) params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
      if (filters.brands.length) params.set('brands', filters.brands.join(','));
      if (filters.categories.length) params.set('categories', filters.categories.join(','));
      if (filters.sortBy) params.set('sort', filters.sortBy);

      const response = await fetch(`/api/search?${params.toString()}`);
      const data = await response.json();
      
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      minPrice: undefined,
      maxPrice: undefined,
      brands: [],
      categories: [],
      sortBy: 'relevance',
    });
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'popular', label: 'Most Popular' },
  ];

  const activeFilterCount = [
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.brands.length > 0,
    filters.categories.length > 0,
    filters.sortBy !== 'relevance',
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {query ? `Search results for "${query}"` : 'Browse Products'}
          </h1>
          {query && (
            <p className="text-gray-600 mt-2">
              Found {total.toLocaleString()} product{total !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Mobile Filter Toggle */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? (
                <List className="w-4 h-4" />
              ) : (
                <Grid className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="lg:flex lg:space-x-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="hidden lg:flex items-center space-x-2">
                    <span className="text-sm text-gray-600">View:</span>
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Active Filters */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Active filters:</span>
                      <div className="flex flex-wrap gap-2">
                        {filters.minPrice && (
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            Min: KES {filters.minPrice.toLocaleString()}
                            <button
                              onClick={() => handleFilterChange({ minPrice: undefined })}
                              className="ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filters.maxPrice && (
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            Max: KES {filters.maxPrice.toLocaleString()}
                            <button
                              onClick={() => handleFilterChange({ maxPrice: undefined })}
                              className="ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {filters.brands.length > 0 && (
                          <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                            Brands: {filters.brands.length}
                            <button
                              onClick={() => handleFilterChange({ brands: [] })}
                              className="ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pl-3 pr-8 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 outline-none"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Sort by: {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : products.length > 0 ? (
              viewMode === 'grid' ? (
                <ProductGrid products={products} />
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 flex space-x-4"
                    >
                      <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          {product.brand.name} • {product.category.name}
                        </p>
                        <div className="flex items-center mt-2">
                          <span className="text-2xl font-bold text-red-600">
                            KES {product.price.toLocaleString()}
                          </span>
                          {product.originalPrice && (
                            <span className="ml-3 text-gray-400 line-through">
                              KES {product.originalPrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex items-center space-x-4">
                          <Button variant="primary" size="sm">
                            Add to Cart
                          </Button>
                          <Button variant="secondary" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <Button variant="primary" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Pagination */}
            {products.length > 0 && total > 12 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="primary" size="sm">
                    1
                  </Button>
                  <Button variant="secondary" size="sm">
                    2
                  </Button>
                  <Button variant="secondary" size="sm">
                    3
                  </Button>
                  <span className="px-3">...</span>
                  <Button variant="secondary" size="sm">
                    10
                  </Button>
                  <Button variant="secondary" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <SearchFiltersMobile
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
