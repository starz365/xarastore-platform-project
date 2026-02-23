'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';

interface CollectionFiltersProps {
  types: Array<{
    name: string;
    count: number;
    description: string;
    icon: string;
  }>;
  stats: {
    totalCollections: number;
    featuredCount: number;
    totalProducts: number;
    recentlyUpdated: number;
  };
  currentType?: string;
}

export function CollectionFilters({ 
  types, 
  stats, 
  currentType 
}: CollectionFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeFilter = (typeName: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (typeName === currentType) {
      params.delete('type');
    } else {
      params.set('type', typeName);
    }
    
    params.set('page', '1');
    router.push(`/collections?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push('/collections');
  };

  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortBy);
    router.push(`/collections?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </h3>
          {(currentType) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-red-600"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Collection Types */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Collection Types</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleTypeFilter('')}
              className={`flex items-center justify-between w-full p-2 rounded transition-colors ${
                !currentType
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center">
                <span className="mr-3">📚</span>
                <span>All Collections</span>
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {stats.totalCollections}
              </span>
            </button>
            
            {types.map((type) => (
              <button
                key={type.name}
                onClick={() => handleTypeFilter(type.name)}
                className={`flex items-center justify-between w-full p-2 rounded transition-colors ${
                  currentType === type.name
                    ? 'bg-red-50 text-red-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center">
                  <span className="mr-3">{type.icon}</span>
                  <span className="text-left">
                    <span className="block">{type.name}</span>
                    <span className="text-xs text-gray-500">{type.description}</span>
                  </span>
                </span>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {type.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Quick Filters</h4>
          <div className="space-y-2">
            <button
              onClick={() => handleTypeFilter('featured')}
              className={`flex items-center justify-between w-full p-2 rounded transition-colors ${
                currentType === 'featured'
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center">
                <span className="mr-3">⭐</span>
                <span>Featured Only</span>
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {stats.featuredCount}
              </span>
            </button>
            
            <button
              onClick={() => handleTypeFilter('trending')}
              className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center">
                <span className="mr-3">🔥</span>
                <span>Trending</span>
              </span>
            </button>
            
            <button
              onClick={() => handleTypeFilter('recent')}
              className="flex items-center justify-between w-full p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center">
                <span className="mr-3">🆕</span>
                <span>Recently Updated</span>
              </span>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {stats.recentlyUpdated}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Sort By</h4>
        <div className="space-y-2">
          {[
            { value: 'featured', label: 'Featured First' },
            { value: 'newest', label: 'Newest First' },
            { value: 'popular', label: 'Most Popular' },
            { value: 'product-count', label: 'Most Products' },
            { value: 'alphabetical', label: 'A to Z' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={`flex items-center w-full p-2 rounded transition-colors ${
                searchParams.get('sort') === option.value
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {(currentType) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">Active Filter</h4>
          <div className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-2 rounded-full">
            {currentType === 'featured' ? 'Featured Collections' : 
             currentType === 'trending' ? 'Trending Collections' :
             currentType === 'recent' ? 'Recently Updated' : 
             `Type: ${currentType}`}
            <button
              onClick={clearFilters}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
