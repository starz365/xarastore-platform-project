'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { analytics } from '@/services/analytics/tracker';

interface ShopClientProps {
  initialProducts: Product[];
  total: number;
  page: number;
  totalPages: number;
  searchQuery: string;
  filters: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy: string;
    minRating?: number;
    availability: string;
  };
  pageSize?: number;
}

export function ShopClient({
  initialProducts,
  total,
  page: initialPage,
  totalPages,
  searchQuery,
  filters,
  pageSize = 12,
}: ShopClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(initialPage);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Track page view
  useEffect(() => {
    analytics.trackPageView(`/shop?${searchParams.toString()}`);
  }, [searchParams]);

  // Load view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('xarastore-shop-view-mode') as 'grid' | 'list';
    if (savedViewMode) setViewMode(savedViewMode);
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('xarastore-shop-view-mode', mode);
  };

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortBy);
    params.set('page', '1'); // reset to first page
    router.push(`/shop?${params.toString()}`);
  };

  // Manual pagination handler
  const goToPage = async (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;

    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', pageNumber.toString());

      const res = await fetch(`/api/shop/products?${params.toString()}`);
      const data = await res.json();

      if (data.products) {
        setProducts(data.products);
        setPage(pageNumber);
      }
    } catch (err) {
      console.error('Failed to fetch page:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your filters or search terms to find what you're looking for."
        icon="search"
        action={{
          label: 'Clear Filters',
          href: '/shop',
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{products.length}</span> products
        </div>

        <div className="flex items-center space-x-4">
          {/* Sort */}
          <Select
            value={filters.sortBy}
            onChange={handleSortChange}
            options={[
              { value: 'price_asc', label: 'Price: Low to High' },
              { value: 'price_desc', label: 'Price: High to Low' },
              { value: 'rating_desc', label: 'Top Rated' },
            ]}
            className="w-48"
            size="sm"
          />

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4zM10 6h4v4h-4zM16 6h4v4h-4zM4 12h4v4H4zM10 12h4v4h-4zM16 12h4v4h-4zM4 18h4v4H4zM10 18h4v4h-4zM16 18h4v4h-4z"/>
              </svg>
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {loading ? (
          <ProductGridSkeleton count={pageSize} />
        ) : (
          products.map((product) => (
            <div key={product.id} className={viewMode === 'list' ? 'bg-white rounded-lg border border-gray-200 p-4' : ''}>
              <ProductCard product={product} layout={viewMode === 'list' ? 'horizontal' : 'vertical'} />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="pt-8 border-t border-gray-200">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}
