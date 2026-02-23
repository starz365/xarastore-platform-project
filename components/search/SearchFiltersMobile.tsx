'use client';

import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

interface SearchFiltersMobileProps {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

export function SearchFiltersMobile({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
}: SearchFiltersMobileProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const priceRanges = [
    { label: 'Under KES 1,000', min: 0, max: 1000 },
    { label: 'KES 1,000 - 5,000', min: 1000, max: 5000 },
    { label: 'KES 5,000 - 10,000', min: 5000, max: 10000 },
    { label: 'KES 10,000 - 20,000', min: 10000, max: 20000 },
    { label: 'Over KES 20,000', min: 20000, max: undefined },
  ];

  const brands = [
    { id: 'samsung', name: 'Samsung', count: 124 },
    { id: 'apple', name: 'Apple', count: 89 },
    { id: 'xiaomi', name: 'Xiaomi', count: 76 },
    { id: 'huawei', name: 'Huawei', count: 54 },
    { id: 'tecno', name: 'Tecno', count: 42 },
  ];

  const categories = [
    { id: 'smartphones', name: 'Smartphones', count: 256 },
    { id: 'laptops', name: 'Laptops', count: 189 },
    { id: 'tablets', name: 'Tablets', count: 124 },
    { id: 'headphones', name: 'Headphones', count: 98 },
    { id: 'wearables', name: 'Wearables', count: 76 },
  ];

  const ratings = [
    { value: 4, label: '4 Stars & Up' },
    { value: 3, label: '3 Stars & Up' },
    { value: 2, label: '2 Stars & Up' },
    { value: 1, label: '1 Star & Up' },
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handlePriceRangeSelect = (min?: number, max?: number) => {
    onFilterChange({
      minPrice: min,
      maxPrice: max,
    });
  };

  const handleBrandToggle = (brandId: string) => {
    const newBrands = filters.brands.includes(brandId)
      ? filters.brands.filter((id: string) => id !== brandId)
      : [...filters.brands, brandId];
    
    onFilterChange({ brands: newBrands });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id: string) => id !== categoryId)
      : [...filters.categories, categoryId];
    
    onFilterChange({ categories: newCategories });
  };

  const handleRatingSelect = (rating: number) => {
    onFilterChange({ minRating: rating });
  };

  const activeFilterCount = [
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.brands.length > 0,
    filters.categories.length > 0,
    filters.minRating !== undefined,
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Filters Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white z-50 shadow-2xl flex flex-col animate-slide-left">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Filter className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Clear All */}
          {activeFilterCount > 0 && (
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear all filters
              </Button>
            </div>
          )}

          {/* Price Range */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="font-semibold text-gray-900">Price Range</span>
              {expandedSections.includes('price') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes('price') && (
              <div className="mt-3 space-y-2">
                {priceRanges.map((range) => {
                  const isActive = 
                    filters.minPrice === range.min && 
                    filters.maxPrice === range.max;
                  
                  return (
                    <button
                      key={range.label}
                      onClick={() => handlePriceRangeSelect(range.min, range.max)}
                      className={`flex items-center justify-between w-full p-3 rounded-lg ${
                        isActive
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-gray-900">{range.label}</span>
                      {isActive && (
                        <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
                
                {/* Custom Price Input */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Min Price</label>
                    <input
                      type="number"
                      value={filters.minPrice || ''}
                      onChange={(e) => onFilterChange({
                        minPrice: e.target.value ? parseInt(e.target.value) : undefined,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="KES"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Max Price</label>
                    <input
                      type="number"
                      value={filters.maxPrice || ''}
                      onChange={(e) => onFilterChange({
                        maxPrice: e.target.value ? parseInt(e.target.value) : undefined,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="KES"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Brands */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('brands')}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="font-semibold text-gray-900">Brands</span>
              {expandedSections.includes('brands') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes('brands') && (
              <div className="mt-3 space-y-2">
                {brands.map((brand) => {
                  const isActive = filters.brands.includes(brand.id);
                  
                  return (
                    <button
                      key={brand.id}
                      onClick={() => handleBrandToggle(brand.id)}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                          isActive ? 'bg-red-600 border-red-600' : 'border-gray-300'
                        }`}>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-gray-900">{brand.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">({brand.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('categories')}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="font-semibold text-gray-900">Categories</span>
              {expandedSections.includes('categories') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes('categories') && (
              <div className="mt-3 space-y-2">
                {categories.map((category) => {
                  const isActive = filters.categories.includes(category.id);
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                          isActive ? 'bg-red-600 border-red-600' : 'border-gray-300'
                        }`}>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-gray-900">{category.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">({category.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ratings */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('ratings')}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="font-semibold text-gray-900">Customer Rating</span>
              {expandedSections.includes('ratings') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes('ratings') && (
              <div className="mt-3 space-y-2">
                {ratings.map((rating) => {
                  const isActive = filters.minRating === rating.value;
                  
                  return (
                    <button
                      key={rating.value}
                      onClick={() => handleRatingSelect(rating.value)}
                      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                          isActive ? 'bg-red-600 border-red-600' : 'border-gray-300'
                        }`}>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-4 h-4 ${
                                i < rating.value ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </div>
                          ))}
                          <span className="ml-2 text-gray-900">& Up</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="mb-6">
            <button
              onClick={() => toggleSection('availability')}
              className="flex items-center justify-between w-full py-3"
            >
              <span className="font-semibold text-gray-900">Availability</span>
              {expandedSections.includes('availability') ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes('availability') && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => onFilterChange({ inStock: true })}
                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 border rounded flex items-center justify-center ${
                      filters.inStock ? 'bg-red-600 border-red-600' : 'border-gray-300'
                    }`}>
                      {filters.inStock && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="text-gray-900">In Stock Only</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              Apply Filters
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                onClearFilters();
                onClose();
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
