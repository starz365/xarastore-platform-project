'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { getBrands, getCategoryAttributes } from '@/lib/supabase/queries/categories';

interface CategoryFiltersProps {
  category: Category;
  subcategories: Category[];
  currentFilters: {
    minPrice?: number;
    maxPrice?: number;
    brands: string[];
    attributes: Record<string, string[]>;
  };
}

export function CategoryFilters({ category, subcategories, currentFilters }: CategoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(currentFilters.brands);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>(currentFilters.attributes);
  const [brands, setBrands] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    price: true,
    brands: true,
    categories: true,
  });

  useEffect(() => {
    loadFiltersData();
  }, [category.id]);

  const loadFiltersData = async () => {
    // Load brands for this category
    const categoryBrands = await getBrands();
    setBrands(categoryBrands);

    // Load attributes for this category
    const categoryAttributes = await getCategoryAttributes(category.id);
    setAttributes(categoryAttributes);
  };

  const updateFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset page when filters change
    params.delete('page');

    // Update price filters
    if (priceRange[0] > 0) {
      params.set('minPrice', priceRange[0].toString());
    } else {
      params.delete('minPrice');
    }
    
    if (priceRange[1] < 100000) {
      params.set('maxPrice', priceRange[1].toString());
    } else {
      params.delete('maxPrice');
    }

    // Update brand filters
    if (selectedBrands.length > 0) {
      selectedBrands.forEach(brand => params.append('brand', brand));
    } else {
      params.delete('brand');
    }

    // Update attribute filters
    Object.entries(selectedAttributes).forEach(([key, values]) => {
      if (values.length > 0) {
        values.forEach(value => params.append(`attr_${key}`, value));
      }
    });

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setPriceRange([0, 100000]);
    setSelectedBrands([]);
    setSelectedAttributes({});
    router.push(`/category/${category.slug}`);
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const toggleAttribute = (key: string, value: string) => {
    setSelectedAttributes(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      if (newValues.length === 0) {
        const { [key]: removed, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [key]: newValues };
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold">Filters</h2>
          </div>
          {(selectedBrands.length > 0 || Object.keys(selectedAttributes).length > 0 || priceRange[0] > 0 || priceRange[1] < 100000) && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-200 p-4">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full mb-2"
        >
          <h3 className="font-medium">Price Range (KES)</h3>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {expandedSections.price && (
          <div className="space-y-4">
            <div className="pt-2">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">KES {priceRange[0].toLocaleString()}</span>
                <span className="text-sm text-gray-600">KES {priceRange[1].toLocaleString()}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="h-2 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={() => toggleSection('brands')}
            className="flex items-center justify-between w-full mb-2"
          >
            <h3 className="font-medium">Brands</h3>
            {expandedSections.brands ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {expandedSections.brands && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {brands.map((brand) => (
                <label
                  key={brand.id}
                  className="flex items-center space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.id)}
                    onChange={() => toggleBrand(brand.id)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">{brand.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    ({brand.productCount || 0})
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="border-b border-gray-200 p-4">
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full mb-2"
          >
            <h3 className="font-medium">Categories</h3>
            {expandedSections.categories ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {expandedSections.categories && (
            <div className="space-y-2">
              {subcategories.map((subcategory) => (
                <a
                  key={subcategory.id}
                  href={`/category/${category.slug}/${subcategory.slug}`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-sm text-gray-700 group-hover:text-red-600 transition-colors">
                    {subcategory.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({subcategory.productCount})
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attributes */}
      {Object.keys(attributes).length > 0 && (
        <div className="space-y-4 p-4">
          {Object.entries(attributes).map(([key, values]) => (
            <div key={key} className="border-b border-gray-200 pb-4">
              <h3 className="font-medium mb-3 capitalize">{key.replace(/_/g, ' ')}</h3>
              <div className="space-y-2">
                {values.map((value) => (
                  <label
                    key={value}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(selectedAttributes[key] || []).includes(value)}
                      onChange={() => toggleAttribute(key, value)}
                      className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="primary"
          className="w-full"
          onClick={updateFilter}
        >
          Apply Filters
        </Button>
      </div>

      {/* Active Filters */}
      {(selectedBrands.length > 0 || Object.keys(selectedAttributes).length > 0) && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="font-medium mb-3">Active Filters</h3>
          <div className="flex flex-wrap gap-2">
            {selectedBrands.map((brandId) => {
              const brand = brands.find(b => b.id === brandId);
              if (!brand) return null;
              
              return (
                <div
                  key={brandId}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                >
                  <span className="mr-2">{brand.name}</span>
                  <button
                    onClick={() => toggleBrand(brandId)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            
            {Object.entries(selectedAttributes).map(([key, values]) =>
              values.map((value) => (
                <div
                  key={`${key}-${value}`}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                >
                  <span className="mr-2 capitalize">
                    {key.replace(/_/g, ' ')}: {value}
                  </span>
                  <button
                    onClick={() => toggleAttribute(key, value)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
