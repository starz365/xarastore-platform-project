'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { ProductVariant } from '@/types';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/currency';

interface ProductVariantsProps {
  variants: ProductVariant[];
  productId: string;
  selectedVariant?: ProductVariant;
  onVariantSelect?: (variant: ProductVariant) => void;
  showPrice?: boolean;
  showStock?: boolean;
  layout?: 'grid' | 'list' | 'swatch';
}

export function ProductVariants({
  variants,
  productId,
  selectedVariant: externalSelectedVariant,
  onVariantSelect,
  showPrice = true,
  showStock = true,
  layout = 'grid',
}: ProductVariantsProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    externalSelectedVariant || variants[0] || null
  );

  const [groupedVariants, setGroupedVariants] = useState<Record<string, Array<{
    value: string;
    variants: ProductVariant[];
    inStock: boolean;
  }>>>({});

  useEffect(() => {
    if (variants.length === 0) return;

    // Group variants by attribute
    const groups: Record<string, Array<{
      value: string;
      variants: ProductVariant[];
      inStock: boolean;
    }>> = {};

    variants.forEach(variant => {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (!groups[key]) {
          groups[key] = [];
        }

        const existingGroup = groups[key].find(g => g.value === value);
        if (existingGroup) {
          existingGroup.variants.push(variant);
          existingGroup.inStock = existingGroup.inStock || variant.stock > 0;
        } else {
          groups[key].push({
            value: String(value),
            variants: [variant],
            inStock: variant.stock > 0,
          });
        }
      });
    });

    setGroupedVariants(groups);
  }, [variants]);

  useEffect(() => {
    if (externalSelectedVariant) {
      setSelectedVariant(externalSelectedVariant);
    }
  }, [externalSelectedVariant]);

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    onVariantSelect?.(variant);
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant.stock > 0;
  };

  const getMatchingVariants = (selectedAttributes: Record<string, string>) => {
    return variants.filter(variant => {
      return Object.entries(selectedAttributes).every(([key, value]) => {
        return variant.attributes[key] === value;
      });
    });
  };

  const handleAttributeSelect = (attribute: string, value: string) => {
    const currentAttributes = selectedVariant?.attributes || {};
    const newAttributes = { ...currentAttributes, [attribute]: value };
    
    const matchingVariants = getMatchingVariants(newAttributes);
    
    if (matchingVariants.length > 0) {
      const firstAvailableVariant = matchingVariants.find(v => v.stock > 0) || matchingVariants[0];
      handleVariantSelect(firstAvailableVariant);
    }
  };

  if (variants.length === 0) {
    return null;
  }

  if (variants.length === 1) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Options</h3>
          <p className="text-sm text-gray-600">Only one option available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{selectedVariant.name}</h4>
              <div className="mt-1 flex items-center space-x-4">
                {showPrice && (
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(selectedVariant.price)}
                  </div>
                )}
                {selectedVariant.originalPrice && showPrice && (
                  <div className="text-sm text-gray-400 line-through">
                    {formatCurrency(selectedVariant.originalPrice)}
                  </div>
                )}
                {showStock && (
                  <div className="text-sm">
                    {selectedVariant.stock > 10 ? (
                      <span className="text-green-600">In stock</span>
                    ) : selectedVariant.stock > 0 ? (
                      <span className="text-orange-600">Only {selectedVariant.stock} left</span>
                    ) : (
                      <span className="text-red-600">Out of stock</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              SKU: {selectedVariant.sku}
            </div>
          </div>
        </div>
      )}

      {/* Variant Attributes */}
      {Object.entries(groupedVariants).map(([attribute, values]) => (
        <div key={attribute}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 capitalize">
              {attribute.replace(/_/g, ' ')}
            </h3>
            {selectedVariant && (
              <span className="text-sm text-gray-500">
                Selected: {selectedVariant.attributes[attribute]}
              </span>
            )}
          </div>

          <div className={cn(
            'grid gap-2',
            layout === 'grid' && 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
            layout === 'list' && 'grid-cols-1',
            layout === 'swatch' && 'grid-cols-6 sm:grid-cols-8'
          )}>
            {values.map(({ value, inStock }) => {
              const isSelected = selectedVariant?.attributes[attribute] === value;
              const isColor = attribute.toLowerCase().includes('color');
              
              return (
                <button
                  key={value}
                  onClick={() => handleAttributeSelect(attribute, value)}
                  disabled={!inStock}
                  className={cn(
                    'relative flex items-center justify-center rounded-lg border text-sm font-medium transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                    isSelected
                      ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400',
                    !inStock && 'opacity-50 cursor-not-allowed',
                    layout === 'swatch' ? 'aspect-square' : 'px-4 py-3'
                  )}
                  aria-label={`Select ${value} ${attribute}`}
                  title={!inStock ? 'Out of stock' : value}
                >
                  {/* Color Swatch */}
                  {isColor && (
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border',
                        !inStock && 'grayscale'
                      )}
                      style={{ backgroundColor: value }}
                    />
                  )}
                  
                  {/* Text Option */}
                  {!isColor && (
                    <span className={cn(
                      isSelected ? 'text-red-700' : 'text-gray-900',
                      !inStock && 'text-gray-400'
                    )}>
                      {value}
                    </span>
                  )}
                  
                  {/* Selected Check */}
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <Check className="w-3 h-3 text-red-600" />
                    </div>
                  )}
                  
                  {/* Out of Stock Indicator */}
                  {!inStock && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-px bg-gray-400 rotate-45"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* All Variants Grid */}
      {layout === 'grid' && variants.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">All Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {variants.map((variant) => {
              const isSelected = selectedVariant?.id === variant.id;
              const isAvailable = isVariantAvailable(variant);
              
              return (
                <button
                  key={variant.id}
                  onClick={() => handleVariantSelect(variant)}
                  disabled={!isAvailable}
                  className={cn(
                    'p-4 border rounded-lg text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                    isSelected
                      ? 'border-red-600 ring-2 ring-red-600/20 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400',
                    !isAvailable && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{variant.name}</h4>
                      <p className="text-sm text-gray-500">SKU: {variant.sku}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Attributes */}
                    {Object.entries(variant.attributes).map(([key, value]) => (
                      <div key={key} className="flex items-center text-sm">
                        <span className="text-gray-600 capitalize mr-2">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                    
                    {/* Price */}
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-red-600">
                        {formatCurrency(variant.price)}
                      </span>
                      {variant.originalPrice && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatCurrency(variant.originalPrice)}
                        </span>
                      )}
                    </div>
                    
                    {/* Stock */}
                    <div className="text-sm">
                      {variant.stock > 10 ? (
                        <span className="text-green-600">In stock ({variant.stock})</span>
                      ) : variant.stock > 0 ? (
                        <span className="text-orange-600">Only {variant.stock} left</span>
                      ) : (
                        <span className="text-red-600">Out of stock</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
