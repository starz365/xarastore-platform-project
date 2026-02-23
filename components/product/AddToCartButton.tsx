'use client';

import { useState } from 'react';
import { ShoppingCart, Check, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/hooks/useCart';
import { ProductVariant } from '@/types';
import { toast } from '@/components/shared/Toast';

interface AddToCartButtonProps {
  productId: string;
  variant: ProductVariant;
  stock: number;
}

export function AddToCartButton({ productId, variant, stock }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem, items } = useCart();

  const isInCart = items.some(
    (item) => item.productId === productId && item.variant.id === variant.id
  );

  const handleAddToCart = async () => {
    if (isAdding || stock === 0) return;

    setIsAdding(true);
    try {
      await addItem(productId, variant, quantity);
      
      setIsAdded(true);
      toast.success('Added to cart!', {
        description: `${quantity} × ${variant.name || 'item'} added to your cart.`,
      });

      // Reset after 2 seconds
      setTimeout(() => {
        setIsAdded(false);
        setQuantity(1);
      }, 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={decrementQuantity}
            disabled={quantity <= 1}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 font-medium min-w-[60px] text-center">
            {quantity}
          </span>
          <button
            onClick={incrementQuantity}
            disabled={quantity >= stock}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">{stock}</span> available in stock
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleAddToCart}
        disabled={isAdding || stock === 0 || isAdded}
        className="w-full"
      >
        {isAdding ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Adding...
          </>
        ) : isAdded || isInCart ? (
          <>
            <Check className="w-5 h-5 mr-2" />
            {isAdded ? 'Added!' : 'Already in Cart'}
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 mr-2" />
            {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </>
        )}
      </Button>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          disabled={stock === 0}
        >
          Buy Now
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
        >
          Save for Later
        </Button>
      </div>
    </div>
  );
}
