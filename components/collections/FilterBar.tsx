'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { useState, useEffect, useCallback } from 'react';

interface FilterBarProps {
  currentType: string;
  currentSort: string;
  types: Array<{ type: string; count: number }>;
  className?: string;
}

export function FilterBar({ currentType, currentSort, types, className }: FilterBarProps) {
  const router = useRouter();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState(currentSort);

  useEffect(() => {
    setSelectedSort(currentSort);
  }, [currentSort]);

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSelectedSort(newSort);
    
    const url = new URL(window.location.href);
    if (newSort === 'newest') {
      url.searchParams.delete('sort');
    } else {
      url.searchParams.set('sort', newSort);
    }
    router.push(url.toString());
  }, [router]);

  const clearFilters = useCallback(() => {
    router.push('/collections');
    setIsMobileFilterOpen(false);
  }, [router]);

  const removeTypeFilter = useCallback(() => {
    router.push('/collections');
  }, [router]);

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'products', label: 'Most Products' },
  ];

  const hasActiveFilters = currentType !== '' || currentSort !== 'newest';

  // Type filter button component
  const TypeFilterLink = ({ typeValue, label, count }: { typeValue: string; label: string; count?: number }) => {
    const href = typeValue === '' ? '/collections' : `/collections?type=${encodeURIComponent(typeValue)}`;
    
    return (
      <Link href={href} prefetch={false}>
        <Button
          variant={currentType === typeValue ? 'primary' : 'outline'}
          size="sm"
          className={cn(
            'whitespace-nowrap',
            currentType === typeValue && 'bg-red-600 text-white hover:bg-red-700'
          )}
        >
          {label}
          {count !== undefined && (
            <span className={cn(
              'ml-1 text-xs',
              currentType === typeValue ? 'text-white/80' : 'text-gray-500'
            )}>
              ({count})
            </span>
          )}
        </Button>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Filter Bar */}
      <div className={cn('hidden md:block py-8', className)}>
        <div className="container-responsive">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <div className="flex flex-wrap gap-2">
                <TypeFilterLink typeValue="" label="All" />
                
                {types.map((type) => (
                  <TypeFilterLink
                    key={type.type}
                    typeValue={type.type}
                    label={type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                    count={type.count}
                  />
                ))}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                value={selectedSort}
                onChange={handleSortChange}
                aria-label="Sort collections by"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center space-x-2 mt-4 text-sm">
              <span className="text-gray-500">Active filters:</span>
              {currentType && (
                <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs">
                  Type: {currentType}
                  <button
                    onClick={removeTypeFilter}
                    className="ml-1 hover:text-red-900"
                    aria-label="Remove type filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {currentSort !== 'newest' && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  Sort: {sortOptions.find(o => o.value === currentSort)?.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Bar */}
      <div className="md:hidden py-4">
        <div className="container-responsive">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center">
                  {(currentType ? 1 : 0) + (currentSort !== 'newest' ? 1 : 0)}
                </span>
              )}
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Sort:</span>
              <select
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                value={selectedSort}
                onChange={handleSortChange}
                aria-label="Sort collections by"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Filter Panel */}
          {isMobileFilterOpen && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Filter by Type</h3>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <TypeFilterLink typeValue="" label="All" />
                
                {types.map((type) => (
                  <TypeFilterLink
                    key={type.type}
                    typeValue={type.type}
                    label={type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                    count={type.count}
                  />
                ))}
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full text-red-600 border border-red-200 hover:bg-red-50"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          )}

          {/* Mobile Active Filters Summary */}
          {hasActiveFilters && !isMobileFilterOpen && (
            <div className="flex flex-wrap gap-2 mt-2">
              {currentType && (
                <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs">
                  Type: {currentType}
                  <button
                    onClick={removeTypeFilter}
                    className="ml-1 hover:text-red-900"
                    aria-label="Remove type filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {currentSort !== 'newest' && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  Sort: {sortOptions.find(o => o.value === currentSort)?.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FilterBar;
