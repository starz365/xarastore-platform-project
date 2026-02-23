'use client';

import { useState, useEffect } from 'react';
import { X, Check, Minus, ChevronDown, ChevronUp, Filter, Download } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';

interface ComparisonProduct extends Product {
  inStock: boolean;
  isWishlisted?: boolean;
}

interface ProductComparisonProps {
  productIds: string[];
  maxProducts?: number;
  className?: string;
}

export function ProductComparison({
  productIds,
  maxProducts = 4,
  className,
}: ProductComparisonProps) {
  const [products, setProducts] = useState<ComparisonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  useEffect(() => {
    fetchComparisonProducts();
  }, [productIds]);

  const fetchComparisonProducts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .in('id', productIds.slice(0, maxProducts));

      if (error) throw error;

      const transformed = (data || []).map(item => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
        sku: item.sku,
        brand: {
          id: item.brand.id,
          slug: item.brand.slug,
          name: item.brand.name,
          logo: item.brand.logo,
          productCount: item.brand.product_count,
        },
        category: {
          id: item.category.id,
          slug: item.category.slug,
          name: item.category.name,
          productCount: item.category.product_count,
        },
        images: item.images || [],
        variants: item.variants?.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: parseFloat(v.price),
          originalPrice: v.original_price ? parseFloat(v.original_price) : undefined,
          sku: v.sku,
          stock: v.stock,
          attributes: v.attributes || {},
        })) || [],
        specifications: item.specifications || {},
        rating: parseFloat(item.rating) || 0,
        reviewCount: item.review_count || 0,
        stock: item.stock,
        isFeatured: item.is_featured,
        isDeal: item.is_deal,
        dealEndsAt: item.deal_ends_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        inStock: item.stock > 0,
        isWishlisted: false,
      }));

      setProducts(transformed);

      // Initialize selected specs with all available specs
      const allSpecs = new Set<string>();
      transformed.forEach(product => {
        Object.keys(product.specifications).forEach(spec => {
          allSpecs.add(spec);
        });
      });
      setSelectedSpecs(allSpecs);
    } catch (error) {
      console.error('Error fetching comparison products:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
  };

  const addProduct = async () => {
    // In production, show a product selector modal
    // For now, we'll simulate adding a product
    if (products.length >= maxProducts) {
      alert(`Maximum ${maxProducts} products allowed for comparison`);
      return;
    }

    // Find a product not already in comparison
    const { data: availableProducts } = await supabase
      .from('products')
      .select('id, name')
      .not('id', 'in', `(${products.map(p => `'${p.id}'`).join(',')})`)
      .limit(1);

    if (availableProducts && availableProducts.length > 0) {
      alert(`Would add product: ${availableProducts[0].name}`);
      // In production, fetch and add the full product
    }
  };

  const toggleSpec = (spec: string) => {
    const newSelected = new Set(selectedSpecs);
    if (newSelected.has(spec)) {
      newSelected.delete(spec);
    } else {
      newSelected.add(spec);
    }
    setSelectedSpecs(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const exportComparison = () => {
    const data = {
      products: products.map(p => ({
        name: p.name,
        price: p.price,
        brand: p.brand.name,
        rating: p.rating,
        specifications: p.specifications,
      })),
      comparisonDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-comparison-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSpecificationsByCategory = () => {
    const categories: Record<string, string[]> = {};

    products.forEach(product => {
      Object.keys(product.specifications).forEach(spec => {
        const category = spec.split('_')[0];
        if (!categories[category]) {
          categories[category] = [];
        }
        if (!categories[category].includes(spec)) {
          categories[category].push(spec);
        }
      });
    });

    return Object.entries(categories).map(([category, specs]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      specs: specs.filter(spec => selectedSpecs.has(spec)),
    })).filter(cat => cat.specs.length > 0);
  };

  const getWinnerProductId = (spec: string, values: string[]): string | null => {
    if (values.every(v => v === values[0])) return null;

    // Try to determine winner based on numeric values
    const numericValues = values.map(v => {
      const match = v.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    });

    if (numericValues.every(v => v !== null)) {
      const max = Math.max(...numericValues as number[]);
      const maxIndex = numericValues.indexOf(max);
      return products[maxIndex]?.id || null;
    }

    return null;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Filter className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Products to Compare
        </h3>
        <p className="text-gray-600 mb-6">
          Add products to start comparing
        </p>
        <Button variant="primary" onClick={addProduct}>
          Add Product
        </Button>
      </div>
    );
  }

  const specCategories = getSpecificationsByCategory();

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Comparison</h2>
          <p className="text-gray-600 mt-1">
            Compare {products.length} product{products.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={exportComparison}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="primary"
            onClick={addProduct}
            disabled={products.length >= maxProducts}
          >
            Add Product +
          </Button>
        </div>
      </div>

      {/* Products Header */}
      <div className="overflow-x-auto">
        <div className="grid" style={{ gridTemplateColumns: `200px repeat(${products.length}, minmax(250px, 1fr))` }}>
          {/* Left Column - Labels */}
          <div className="sticky left-0 z-10 bg-white border-r border-gray-200">
            <div className="h-16 border-b border-gray-200"></div>
            
            {/* Price */}
            <div className="h-12 border-b border-gray-200 px-4 flex items-center font-medium text-gray-700">
              Price
            </div>
            
            {/* Rating */}
            <div className="h-12 border-b border-gray-200 px-4 flex items-center font-medium text-gray-700">
              Rating
            </div>
            
            {/* Availability */}
            <div className="h-12 border-b border-gray-200 px-4 flex items-center font-medium text-gray-700">
              Availability
            </div>
            
            {/* Specifications Categories */}
            {specCategories.map(({ category, specs }) => (
              <div key={category} className="border-b border-gray-200">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full h-12 px-4 flex items-center justify-between font-medium text-gray-900 hover:bg-gray-50"
                >
                  <span>{category}</span>
                  {expandedCategories.has(category) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="bg-gray-50">
                    {specs.map(spec => (
                      <div
                        key={spec}
                        className="h-10 px-4 flex items-center text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleSpec(spec)}
                      >
                        <div className="w-4 h-4 mr-2 border border-gray-300 rounded flex items-center justify-center">
                          {selectedSpecs.has(spec) && (
                            <Check className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                        {spec.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Product Columns */}
          {products.map((product, index) => (
            <div key={product.id} className="border-r border-gray-200 last:border-r-0">
              {/* Product Header */}
              <div className="relative h-16 border-b border-gray-200 p-4">
                <button
                  onClick={() => removeProduct(product.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  aria-label="Remove product"
                >
                  <X className="w-3 h-3" />
                </button>
                
                <div className="pt-2">
                  <img
                    src={product.images[0] || '/placeholder.jpg'}
                    alt={product.name}
                    className="w-16 h-16 object-contain mx-auto mb-2"
                  />
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 text-center">
                    {product.name}
                  </h3>
                </div>
              </div>

              {/* Price */}
              <div className="h-12 border-b border-gray-200 px-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bold text-red-600">
                    {formatCurrency(product.price)}
                  </div>
                  {product.originalPrice && (
                    <div className="text-sm text-gray-400 line-through">
                      {formatCurrency(product.originalPrice)}
                    </div>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="h-12 border-b border-gray-200 px-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span className="font-bold">{product.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    ({product.reviewCount} reviews)
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="h-12 border-b border-gray-200 px-4 flex items-center justify-center">
                {product.inStock ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    In Stock
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Specifications */}
              {specCategories.map(({ category, specs }) => (
                <div key={category} className="border-b border-gray-200">
                  {expandedCategories.has(category) && specs.map(spec => {
                    const value = product.specifications[spec] || '—';
                    const allValues = products.map(p => p.specifications[spec] || '—');
                    const winnerId = getWinnerProductId(spec, allValues);
                    
                    return (
                      <div
                        key={spec}
                        className="h-10 px-4 flex items-center justify-center text-sm text-gray-700"
                      >
                        <div className="text-center">
                          <div className={winnerId === product.id ? 'font-bold text-green-600' : ''}>
                            {value}
                          </div>
                          {winnerId === product.id && (
                            <div className="text-xs text-green-600 font-medium">Best</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Summary */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Price Comparison</h4>
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={product.id} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{product.name}</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(product.price)}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between font-bold">
                <span>Best Value</span>
                <span className="text-green-600">
                  {products.reduce((min, p) => p.price < min.price ? p : min).name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Feature Comparison</h4>
          <div className="space-y-3">
            {specCategories.slice(0, 3).flatMap(({ specs }) =>
              specs.slice(0, 2).map(spec => {
                const values = products.map(p => p.specifications[spec] || '—');
                const uniqueValues = Array.from(new Set(values.filter(v => v !== '—')));
                
                return (
                  <div key={spec} className="text-sm">
                    <div className="font-medium text-gray-700 mb-1">
                      {spec.replace(/_/g, ' ')}
                    </div>
                    <div className="text-gray-600">
                      {uniqueValues.length === 1 ? 'All same' : 'Varies'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Recommendation</h4>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">Best Overall</div>
              <div className="font-bold text-green-600">
                {products.reduce((best, p) => 
                  (p.rating * 0.4 + (p.inStock ? 0.3 : 0) + (p.price < best.price ? 0.3 : 0)) >
                  (best.rating * 0.4 + (best.inStock ? 0.3 : 0) + (best.price < p.price ? 0.3 : 0))
                    ? p : best
                ).name}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Best Budget</div>
              <div className="font-bold text-blue-600">
                {products.reduce((min, p) => p.price < min.price ? p : min).name}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Highest Rated</div>
              <div className="font-bold text-purple-600">
                {products.reduce((max, p) => p.rating > max.rating ? p : max).name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-600">
          Select specifications to compare using the filter panel
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={() => setShowAllSpecs(!showAllSpecs)}>
            {showAllSpecs ? 'Show Less' : 'Show All Specs'}
          </Button>
          <Button variant="primary" onClick={exportComparison}>
            <Download className="w-4 h-4 mr-2" />
            Export Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
