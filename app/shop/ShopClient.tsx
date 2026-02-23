'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { useInView } from 'react-intersection-observer';
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
}

export function ShopClient({
  initialProducts,
  total,
  page,
  totalPages,
  searchQuery,
  filters,
}: ShopClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(page < totalPages);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  // Track page view
  useEffect(() => {
    analytics.trackPageView(`/shop?${searchParams.toString()}`);
  }, [searchParams]);

  // Infinite scroll
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMoreProducts();
    }
  }, [inView, hasMore, loading]);

  const loadMoreProducts = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', nextPage.toString());

      const response = await fetch(`/api/shop/products?${params.toString()}`);
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        setProducts(prev => [...prev, ...data.products]);
        setHasMore(nextPage < data.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortBy);
    params.delete('page');
    router.push(`/shop?${params.toString()}`);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    // Save preference to localStorage
    localStorage.setItem('xarastore-shop-view-mode', mode);
  };

  // Load view mode preference
  useEffect(() => {
    const savedViewMode = localStorage.getItem('xarastore-shop-view-mode') as 'grid' | 'list';
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your filters or search terms to find what you're looking for."
        icon="search"
        action={{
          label: "Clear Filters",
          href: "/shop"
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Products Grid/List */}
      <div className={viewMode === 'grid' 
        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6'
        : 'space-y-4'
      }>
        {products.map((product) => (
          <div key={product.id} className={viewMode === 'list' ? 'bg-white rounded-lg border border-gray-200 p-4' : ''}>
            <ProductCard
              product={product}
              layout={viewMode === 'list' ? 'horizontal' : 'vertical'}
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={ref} className="py-8">
          {loading ? (
            <ProductGridSkeleton count={6} />
          ) : (
            <div className="text-center">
              <button
                onClick={loadMoreProducts}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                disabled={loading}
              >
                Load More Products
              </button>
            </div>
          )}
        </div>
      )}

      {/* End of results */}
      {!hasMore && products.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Showing all {total.toLocaleString()} products
          </p>
        </div>
      )}
    </div>
  );
}
