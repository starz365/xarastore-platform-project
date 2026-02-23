'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter, X } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { getCategories, getBrands } from '@/lib/supabase/queries/products';

interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: [number, number];
  minRating: number;
  availability: 'all' | 'in-stock' | 'out-of-stock';
}

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
    priceRange: [0, 100000],
    minRating: 0,
    availability: 'all',
  });
  const [categories, setCategories] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    updateURL();
  }, [filters]);

  const loadFilters = async () => {
    try {
      const [categoryData, brandData] = await Promise.all([
        getCategories(),
        getBrands(),
      ]);

      setCategories(categoryData.map(cat => ({
        id: cat.id,
        name: cat.name,
        count: cat.productCount,
      })));

      setBrands(brandData.map(brand => ({
        id: brand.id,
        name: brand.name,
        count: brand.productCount,
      })));
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateURL = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Update category filter
    if (filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','));
    } else {
      params.delete('categories');
    }

    // Update brand filter
    if (filters.brands.length > 0) {
      params.set('brands', filters.brands.join(','));
    } else {
      params.delete('brands');
    }

    // Update price range
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) {
      params.set('min_price', filters.priceRange[0].toString());
      params.set('max_price', filters.priceRange[1].toString());
    } else {
      params.delete('min_price');
      params.delete('max_price');
    }

    // Update rating
    if (filters.minRating > 0) {
      params.set('min_rating', filters.minRating.toString());
    } else {
      params.delete('min_rating');
    }

    // Update availability
    if (filters.availability !== 'all') {
      params.set('availability', filters.availability);
    } else {
      params.delete('availability');
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    router.push(`/shop?${params.toString()}`);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const handleBrandToggle = (brandId: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandId)
        ? prev.brands.filter(id => id !== brandId)
        : [...prev.brands, brandId],
    }));
  };

  const handlePriceChange = (values: number[]) => {
    setFilters(prev => ({
      ...prev,
      priceRange: values as [number, number],
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFilters(prev => ({
      ...prev,
      minRating: prev.minRating === rating ? 0 : rating,
    }));
  };

  const handleAvailabilityChange = (availability: 'all' | 'in-stock' | 'out-of-stock') => {
    setFilters(prev => ({
      ...prev,
      availability,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: [0, 100000],
      minRating: 0,
      availability: 'all',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <Checkbox
                  checked={filters.categories.includes(category.id)}
                  onCheckedChange={() => handleCategoryToggle(category.id)}
                />
                <span className="text-sm text-gray-700 group-hover:text-red-600 transition-colors">
                  {category.name}
                </span>
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {category.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Brands</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <Checkbox
                  checked={filters.brands.includes(brand.id)}
                  onCheckedChange={() => handleBrandToggle(brand.id)}
                />
                <span className="text-sm text-gray-700 group-hover:text-red-600 transition-colors">
                  {brand.name}
                </span>
              </label>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {brand.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
        <div className="px-2">
          <Slider
            min={0}
            max={100000}
            step={1000}
            value={filters.priceRange}
            onValueChange={handlePriceChange}
            className="my-6"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>KES {filters.priceRange[0].toLocaleString()}</span>
            <span>KES {filters.priceRange[1].toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Minimum Rating</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => handleRatingChange(rating)}
              className={`flex items-center space-x-2 w-full text-left p-2 rounded transition-colors ${
                filters.minRating === rating
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 ${
                      i < rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>
              <span className="text-sm">
                {rating} star{filters.minRating === rating ? ' & up' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Availability</h3>
        <div className="space-y-2">
          {[
            { value: 'all', label: 'All Products' },
            { value: 'in-stock', label: 'In Stock Only' },
            { value: 'out-of-stock', label: 'Out of Stock' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleAvailabilityChange(option.value as any)}
              className={`flex items-center space-x-3 w-full text-left p-2 rounded transition-colors ${
                filters.availability === option.value
                  ? 'bg-red-50 text-red-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border ${
                filters.availability === option.value
                  ? 'border-red-600 bg-red-600'
                  : 'border-gray-300'
              }`} />
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters */}
      {(filters.categories.length > 0 || 
        filters.brands.length > 0 || 
        filters.priceRange[0] > 0 || 
        filters.priceRange[1] < 100000 || 
        filters.minRating > 0 || 
        filters.availability !== 'all') && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Active Filters</h3>
          <div className="flex flex-wrap gap-2">
            {filters.categories.map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              return category ? (
                <div
                  key={categoryId}
                  className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full"
                >
                  {category.name}
                  <button
                    onClick={() => handleCategoryToggle(categoryId)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
            {filters.brands.map(brandId => {
              const brand = brands.find(b => b.id === brandId);
              return brand ? (
                <div
                  key={brandId}
                  className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full"
                >
                  {brand.name}
                  <button
                    onClick={() => handleBrandToggle(brandId)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : null;
            })}
            {(filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) && (
              <div className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                KES {filters.priceRange[0].toLocaleString()} - KES {filters.priceRange[1].toLocaleString()}
                <button
                  onClick={() => handlePriceChange([0, 100000])}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.minRating > 0 && (
              <div className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                {filters.minRating}+ stars
                <button
                  onClick={() => handleRatingChange(0)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {filters.availability !== 'all' && (
              <div className="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                {filters.availability === 'in-stock' ? 'In Stock' : 'Out of Stock'}
                <button
                  onClick={() => handleAvailabilityChange('all')}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="mt-3 text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
