'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductGridSkeleton';
import { EmptyState } from './EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  showTimer?: boolean;
  onProductClick?: (product: Product) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sortOptions?: Array<{
    value: string;
    label: string;
  }>;
  onSortChange?: (value: string) => void;
  currentSort?: string;
  showFilters?: boolean;
  onFilterToggle?: () => void;
}

export function ProductGrid({
  products,
  loading = false,
  showTimer = false,
  onProductClick,
  onLoadMore,
  hasMore = false,
  gridCols = 4,
  pagination,
  sortOptions,
  onSortChange,
  currentSort,
  showFilters = true,
  onFilterToggle,
}: ProductGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const gridColsClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  };

  if (loading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (products.length === 0) {
    return <EmptyState />;
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
          {sortOptions && onSortChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Select
                value={currentSort}
                onChange={onSortChange}
                options={sortOptions}
                className="w-48"
                size="sm"
              />
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>

          {/* Filter Toggle (Mobile) */}
          {showFilters && onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className="sm:hidden flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Grid/List */}
      <div className={viewMode === 'grid' ? `grid ${gridColsClasses[gridCols]} gap-6` : 'space-y-4'}>
        {products.map((product) => (
          viewMode === 'grid' ? (
            <ProductCard
              key={product.id}
              product={product}
              showTimer={showTimer}
              onClick={() => onProductClick?.(product)}
            />
          ) : (
            <ProductListItem
              key={product.id}
              product={product}
              onClick={() => onProductClick?.(product)}
            />
          )
        ))}
      </div>

      {/* Load More / Pagination */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-8">
          <button
            onClick={onLoadMore}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Load More Products
          </button>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="pt-8 border-t border-gray-200">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}

function ProductListItem({ product, onClick }: { product: Product; onClick?: () => void }) {
  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className="flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Image */}
      <div className="w-32 md:w-48 flex-shrink-0">
        <div className="relative h-full">
          <img
            src={product.images[0] || '/placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
              -{discountPercentage}%
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between h-full">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-500">{product.brand.name}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{product.category.name}</span>
            </div>
            
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {product.name}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {product.description}
            </p>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-yellow-400">★</span>
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({product.reviewCount})</span>
              </div>
              
              <div className="text-sm text-gray-500">
                {product.stock > 10 ? (
                  <span className="text-green-600">In stock</span>
                ) : product.stock > 0 ? (
                  <span className="text-orange-600">Only {product.stock} left</span>
                ) : (
                  <span className="text-red-600">Out of stock</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-0 md:ml-6 text-right">
            <div className="space-y-2">
              <div className="text-lg font-bold text-red-600">
                KES {product.price.toLocaleString('en-KE')}
              </div>
              {product.originalPrice && (
                <div className="text-sm text-gray-400 line-through">
                  KES {product.originalPrice.toLocaleString('en-KE')}
                </div>
              )}
            </div>
            
            <button className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
