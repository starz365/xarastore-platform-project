'use client';

import { useState, useCallback, memo } from 'react';
import { ShoppingCart, Check, Plus, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/hooks/useCart';
import { useAuth } from '@/lib/hooks/useAuth';
import { Product, ProductVariant } from '@/types';
import { toast } from '@/components/shared/Toast';
import { OutOfStockActions } from './OutOfStockActions';
import { cn } from '@/lib/utils/cn';

interface AddToCartButtonProps {
  product: Product;
  variant: ProductVariant;
  stock: number;
  className?: string;
  onViewSimilar?: () => void;
  onAddToCartSuccess?: () => void;
  showQuantitySelector?: boolean;
}

export const AddToCartButton = memo(function AddToCartButton({ 
  product, 
  variant, 
  stock,
  className = '',
  onViewSimilar,
  onAddToCartSuccess,
  showQuantitySelector = true
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem, items, isInCart } = useCart();
  const { user } = useAuth();

  // Defensive checks
  const safeProduct = {
    id: product?.id || '',
    name: product?.name || 'Product',
    slug: product?.slug || '',
  };

  const safeVariant = {
    id: variant?.id || 'default',
    name: variant?.name || 'Default',
    price: typeof variant?.price === 'number' && !isNaN(variant.price) ? variant.price : 0,
    originalPrice: typeof variant?.originalPrice === 'number' && !isNaN(variant.originalPrice) ? variant.originalPrice : null,
    sku: variant?.sku || '',
    stock: typeof variant?.stock === 'number' && !isNaN(variant.stock) ? variant.stock : 0,
    attributes: variant?.attributes || {},
  };

  const safeStock = typeof stock === 'number' && !isNaN(stock) ? stock : 0;
  const isOutOfStock = safeStock === 0;
  const isItemInCart = isInCart(safeProduct.id, safeVariant.id);
  const maxQuantity = Math.min(safeStock, 10); // Cap at 10 for UX

  const handleAddToCart = useCallback(async () => {
    if (isAdding || isOutOfStock) return;

    setIsAdding(true);
    try {
      await addItem(safeProduct.id, safeVariant, quantity);
      
      setIsAdded(true);
      onAddToCartSuccess?.();

      toast.success('Added to cart!', {
        description: `${quantity} × ${safeVariant.name || safeProduct.name} added to your cart.`,
        duration: 3000,
      });

      // Track analytics
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'event',
            data: {
              category: 'ecommerce',
              action: 'add_to_cart',
              label: safeProduct.id,
              value: quantity * safeVariant.price,
              user_id: user?.id,
              product_id: safeProduct.id,
              variant_id: safeVariant.id,
              quantity,
              price: safeVariant.price,
            },
          }),
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }

      // Reset added state after delay
      setTimeout(() => {
        setIsAdded(false);
        setQuantity(1);
      }, 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart', {
        description: error instanceof Error ? error.message : 'Please try again or contact support.',
      });
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, isOutOfStock, safeProduct.id, safeProduct.name, safeVariant, quantity, addItem, onAddToCartSuccess, user?.id]);

  const handleBuyNow = useCallback(async () => {
    if (isOutOfStock) return;

    try {
      await handleAddToCart();
      window.location.href = '/checkout';
    } catch (error) {
      console.error('Buy now failed:', error);
    }
  }, [handleAddToCart, isOutOfStock]);

  const incrementQuantity = useCallback(() => {
    setQuantity(prev => {
      const next = prev + 1;
      if (next > maxQuantity) {
        toast.warning('Maximum quantity reached', {
          description: `You can add up to ${maxQuantity} items.`,
        });
        return prev;
      }
      return next;
    });
  }, [maxQuantity]);

  const decrementQuantity = useCallback(() => {
    setQuantity(prev => prev > 1 ? prev - 1 : 1);
  }, []);

  const handleViewSimilar = useCallback(() => {
    if (onViewSimilar) {
      onViewSimilar();
    } else if (product.category?.slug) {
      window.location.href = `/category/${product.category.slug}?exclude=${product.id}`;
    } else {
      window.location.href = '/shop';
    }
  }, [onViewSimilar, product.category?.slug, product.id]);

  // If product is out of stock, render out-of-stock actions
  if (isOutOfStock) {
    return (
      <OutOfStockActions
        product={product}
        onViewSimilar={handleViewSimilar}
        allowPreorder={product.allowPreorder || false}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stock Warning */}
      {safeStock <= 5 && safeStock > 0 && (
        <div 
          className="flex items-center space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-orange-700">
            Only {safeStock} left in stock - order soon!
          </p>
        </div>
      )}

      {/* Quantity Selector */}
      {showQuantitySelector && (
        <div className="flex items-center justify-between">
          <label 
            htmlFor={`quantity-${safeVariant.id}`} 
            className="text-sm font-medium text-gray-700"
          >
            Quantity
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span 
              id={`quantity-${safeVariant.id}`}
              className="px-4 py-2 font-medium min-w-[60px] text-center border-x border-gray-300"
              aria-live="polite"
              aria-label={`Quantity ${quantity}`}
            >
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              disabled={quantity >= maxQuantity}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-r-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <span className="text-sm text-gray-500" aria-label={`${safeStock} available`}>
            {safeStock} available
          </span>
        </div>
      )}

      {/* Add to Cart Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleAddToCart}
        disabled={isAdding || isOutOfStock || isAdded}
        className="w-full relative"
        aria-label={
          isAdded ? 'Added to cart' : 
          isItemInCart ? 'Already in cart' : 
          'Add to cart'
        }
      >
        {isAdding ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
            Adding...
          </>
        ) : isAdded || isItemInCart ? (
          <>
            <Check className="w-5 h-5 mr-2" aria-hidden="true" />
            {isAdded ? 'Added!' : 'Already in Cart'}
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 mr-2" aria-hidden="true" />
            Add to Cart
          </>
        )}
      </Button>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={handleBuyNow}
          disabled={isOutOfStock}
          aria-label="Buy now"
        >
          Buy Now
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => {
            // Add to wishlist - handled by ProductCard
            const event = new CustomEvent('wishlist-toggle', { 
              detail: { productId: safeProduct.id } 
            });
            window.dispatchEvent(event);
          }}
          aria-label="Save for later"
        >
          Save for Later
        </Button>
      </div>
    </div>
  );
});

AddToCartButton.displayName = 'AddToCartButton';
