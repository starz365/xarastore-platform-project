'use client';

import { useState } from 'react';
import { Check, ShoppingCart, Tag, ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/hooks/useCart';
import { toast } from '@/components/shared/Toast';

interface BundleItem {
  product: Product;
  quantity: number;
  required: boolean;
  discount?: number; // Percentage discount
}

interface ProductBundleProps {
  bundleId: string;
  name: string;
  description: string;
  items: BundleItem[];
  totalPrice: number;
  originalTotalPrice?: number;
  savings: number;
  savingsPercentage: number;
  limit?: number;
  expiresAt?: Date;
  className?: string;
}

export function ProductBundle({
  bundleId,
  name,
  description,
  items,
  totalPrice,
  originalTotalPrice,
  savings,
  savingsPercentage,
  limit,
  expiresAt,
  className,
}: ProductBundleProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(items.filter(item => item.required).map(item => item.product.id))
  );
  const [addingToCart, setAddingToCart] = useState(false);
  const { addItem } = useCart();

  const handleItemToggle = (productId: string, required: boolean) => {
    if (required) return; // Can't deselect required items

    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  const calculateCurrentTotal = () => {
    return items
      .filter(item => selectedItems.has(item.product.id))
      .reduce((total, item) => {
        const itemPrice = item.product.price * item.quantity;
        const discount = item.discount ? (itemPrice * item.discount) / 100 : 0;
        return total + (itemPrice - discount);
      }, 0);
  };

  const calculateCurrentSavings = () => {
    const originalTotal = items
      .filter(item => selectedItems.has(item.product.id))
      .reduce((total, item) => total + (item.product.originalPrice || item.product.price) * item.quantity, 0);
    
    return originalTotal - calculateCurrentTotal();
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);

    try {
      const selectedBundleItems = items.filter(item => selectedItems.has(item.product.id));
      
      // Add each item to cart
      for (const bundleItem of selectedBundleItems) {
        const defaultVariant = bundleItem.product.variants?.[0] || {
          id: 'default',
          price: bundleItem.product.price,
          originalPrice: bundleItem.product.originalPrice,
          sku: bundleItem.product.sku,
          stock: bundleItem.product.stock,
        };

        await addItem(
          bundleItem.product.id,
          defaultVariant,
          bundleItem.quantity
        );
      }

      toast.success('Bundle added to cart!', {
        description: `You saved ${formatCurrency(calculateCurrentSavings())}`,
      });
    } catch (error) {
      console.error('Failed to add bundle to cart:', error);
      toast.error('Failed to add bundle to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const getExpiryText = () => {
    if (!expiresAt) return null;

    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Offer ends in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Offer ends in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'Offer ending soon';
    }
  };

  const currentTotal = calculateCurrentTotal();
  const currentSavings = calculateCurrentSavings();
  const currentSavingsPercentage = originalTotalPrice 
    ? Math.round((currentSavings / originalTotalPrice) * 100)
    : savingsPercentage;

  return (
    <div className={cn('border border-gray-200 rounded-xl overflow-hidden', className)}>
      {/* Bundle Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="w-5 h-5" />
              <span className="font-medium">Special Bundle</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">{name}</h3>
            <p className="opacity-90">{description}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{formatCurrency(currentTotal)}</div>
            {originalTotalPrice && (
              <div className="text-red-200 line-through">
                {formatCurrency(originalTotalPrice)}
              </div>
            )}
            <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              Save {currentSavingsPercentage}%
            </div>
          </div>
        </div>

        {limit && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm opacity-90">
              Only {limit} bundles available
            </div>
            {getExpiryText() && (
              <div className="text-sm font-medium bg-white/10 px-3 py-1 rounded-full">
                {getExpiryText()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bundle Items */}
      <div className="p-6">
        <h4 className="text-lg font-semibold mb-4">Bundle Includes:</h4>
        <div className="space-y-4">
          {items.map((bundleItem, index) => {
            const isSelected = selectedItems.has(bundleItem.product.id);
            const itemTotal = bundleItem.product.price * bundleItem.quantity;
            const itemDiscount = bundleItem.discount ? (itemTotal * bundleItem.discount) / 100 : 0;
            const itemFinalPrice = itemTotal - itemDiscount;

            return (
              <div
                key={bundleItem.product.id}
                className={cn(
                  'flex items-start space-x-4 p-4 border rounded-lg transition-colors',
                  isSelected
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-start space-x-4 flex-1">
                  {/* Selection Toggle */}
                  <div className="pt-1">
                    {bundleItem.required ? (
                      <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-red-600" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleItemToggle(bundleItem.product.id, bundleItem.required)}
                        className={cn(
                          'w-5 h-5 border rounded flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-red-600 border-red-600'
                            : 'border-gray-300 hover:border-red-400'
                        )}
                        aria-label={isSelected ? `Deselect ${bundleItem.product.name}` : `Select ${bundleItem.product.name}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={bundleItem.product.images[0] || '/placeholder.jpg'}
                      alt={bundleItem.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-gray-900">
                          {bundleItem.product.name}
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">
                          {bundleItem.product.brand.name} • Qty: {bundleItem.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600">
                          {formatCurrency(itemFinalPrice)}
                        </div>
                        {bundleItem.discount && (
                          <div className="text-sm text-gray-400 line-through">
                            {formatCurrency(itemTotal)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discount Badge */}
                    {bundleItem.discount && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          <Tag className="w-3 h-3 mr-1" />
                          {bundleItem.discount}% off
                        </span>
                      </div>
                    )}

                    {/* Stock Status */}
                    <div className="mt-2 text-sm">
                      {bundleItem.product.stock > 0 ? (
                        <span className="text-green-600">In stock</span>
                      ) : (
                        <span className="text-red-600">Out of stock</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Product Link */}
                <a
                  href={`/product/${bundleItem.product.slug}`}
                  className="flex items-center text-sm text-red-600 hover:text-red-700"
                >
                  View
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Bundle Summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-gray-900 mb-3">Bundle Summary</h5>
              <div className="space-y-2">
                {items
                  .filter(item => selectedItems.has(item.product.id))
                  .map(bundleItem => (
                    <div key={bundleItem.product.id} className="flex justify-between text-sm">
                      <span>
                        {bundleItem.product.name} × {bundleItem.quantity}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(bundleItem.product.price * bundleItem.quantity)}
                      </span>
                    </div>
                  ))}
                
                {currentSavings > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-green-600 font-medium">Bundle Savings</span>
                    <span className="text-green-600 font-bold">
                      -{formatCurrency(currentSavings)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Subtotal</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(currentTotal)}
                  </span>
                </div>
                
                {currentSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>You Save</span>
                    <span className="text-green-600 font-bold">
                      {formatCurrency(currentSavings)} ({currentSavingsPercentage}%)
                    </span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={addingToCart || items.some(item => 
                    selectedItems.has(item.product.id) && item.product.stock === 0
                  )}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {addingToCart ? 'Adding to Cart...' : 'Add Bundle to Cart'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Individual items will be added to your cart
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bundle Benefits */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-900">Best Value</p>
              <p className="text-sm text-blue-700">Save more than buying separately</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-900">Quality Guaranteed</p>
              <p className="text-sm text-green-700">All items from verified brands</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-purple-900">Fast Shipping</p>
              <p className="text-sm text-purple-700">All items ship together</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
