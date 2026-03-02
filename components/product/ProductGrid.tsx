'use client';

import { Fragment, useState } from 'react';
import Image from 'next/image';
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

const GRID_COLS_CLASSES: Record<NonNullable<ProductGridProps['gridCols']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

// Helper function to safely format currency
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return amount.toLocaleString('en-KE');
};

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

  if (loading) {
    return <ProductGridSkeleton count={8} />;
  }

  if (!products || products.length === 0) {
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
                onChange={(value: string) => onSortChange(value)}
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
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Grid view"
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${
                viewMode === 'list'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="List view"
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </button>
          </div>

          {/* Filter Toggle (Mobile) */}
          {showFilters && onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className="sm:hidden flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              type="button"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span>Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Grid / List */}
      <div
        className={
          viewMode === 'grid'
            ? `grid ${GRID_COLS_CLASSES[gridCols]} gap-6`
            : 'space-y-4'
        }
      >
        {products.map((product, index) => (
          <Fragment key={product.id ?? `product-${index}`}>
            {viewMode === 'grid' ? (
              <ProductCard
                product={product}
                showTimer={showTimer}
                priority={index < (gridCols || 4)}
                onClick={() => onProductClick?.(product)}
              />
            ) : (
              <ProductListItem
                product={product}
                onClick={() => onProductClick?.(product)}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="text-center pt-8">
          <button
            onClick={onLoadMore}
            className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            type="button"
          >
            Load More Products
          </button>
        </div>
      )}

      {/* Pagination */}
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

// ─── List Item ────────────────────────────────────────────────────────────────

function ProductListItem({
  product,
  onClick,
}: {
  product: Product;
  onClick?: () => void;
}) {
  // Safely calculate discount percentage
  const discountPercentage = 
    product.originalPrice && 
    product.originalPrice > product.price && 
    product.originalPrice > 0
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : 0;

  // Safely access nested properties
  const imageSrc = product.images?.[0] || '/placeholder.jpg';
  const brandName = product.brand?.name || '';
  const categoryName = product.category?.name || '';

  // Safely format numbers with proper validation
  const formatPrice = (price: number | undefined | null): string => {
    if (price === undefined || price === null || isNaN(price)) {
      return '0';
    }
    return price.toLocaleString('en-KE');
  };

  const formatRating = (rating: number | undefined | null): string => {
    if (rating === undefined || rating === null || isNaN(rating)) {
      return '0.0';
    }
    return rating.toFixed(1);
  };

  const formattedPrice = formatPrice(product.price);
  const formattedOriginalPrice = formatPrice(product.originalPrice);
  const formattedRating = formatRating(product.rating);
  const reviewCount = product.reviewCount || 0;
  const stock = typeof product.stock === 'number' ? product.stock : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Add to cart logic here
  };

  // Check if original price should be shown
  const showOriginalPrice = product.originalPrice && 
                           product.originalPrice > product.price && 
                           !isNaN(product.originalPrice) && 
                           !isNaN(product.price);

  return (
    <div
      onClick={onClick}
      className="flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Image */}
      <div className="w-32 md:w-48 flex-shrink-0 relative bg-gray-100" style={{ minHeight: '120px' }}>
        <Image
          src={imageSrc}
          alt={product.name || 'Product image'}
          fill
          sizes="(max-width: 768px) 128px, 192px"
          className="object-cover"
          loading="lazy"
        />
        {discountPercentage > 0 && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded z-10">
            -{discountPercentage}%
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between h-full">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {brandName && (
                <span className="text-sm text-gray-500">{brandName}</span>
              )}
              {brandName && categoryName && (
                <span className="text-gray-300">•</span>
              )}
              {categoryName && (
                <span className="text-sm text-gray-500">{categoryName}</span>
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {product.name || 'Unnamed Product'}
            </h3>

            {product.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-yellow-400" aria-hidden="true">★</span>
                <span className="text-sm font-medium">
                  {formattedRating}
                </span>
                <span className="text-sm text-gray-500">
                  ({reviewCount})
                </span>
              </div>

              <div className="text-sm">
                {stock > 10 ? (
                  <span className="text-green-600">In stock</span>
                ) : stock > 0 ? (
                  <span className="text-orange-600">
                    Only {stock} left
                  </span>
                ) : (
                  <span className="text-red-600">Out of stock</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 md:mt-0 md:ml-6 text-right">
            <div className="space-y-2">
              <div className="text-lg font-bold text-red-600">
                KES {formattedPrice}
              </div>
              {showOriginalPrice && (
                <div className="text-sm text-gray-400 line-through">
                  KES {formattedOriginalPrice}
                </div>
              )}
            </div>

            <button
              disabled={stock === 0}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              onClick={handleAddToCart}
              type="button"
            >
              {stock === 0 ? 'Out of stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
