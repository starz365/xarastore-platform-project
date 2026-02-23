'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2, Heart } from 'lucide-react';
import { CartItem as CartItemType } from '@/types';
import { useCart } from '@/lib/hooks/useCart';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (isUpdating || newQuantity < 1 || newQuantity > item.variant.stock) return;

    setIsUpdating(true);
    try {
      await updateQuantity(item.id, newQuantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      await removeItem(item.id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const incrementQuantity = () => {
    handleQuantityChange(item.quantity + 1);
  };

  const decrementQuantity = () => {
    if (item.quantity > 1) {
      handleQuantityChange(item.quantity - 1);
    } else {
      handleRemove();
    }
  };

  const totalPrice = item.variant.price * item.quantity;
  const originalTotal = item.variant.originalPrice ? item.variant.originalPrice * item.quantity : null;

  return (
    <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg bg-white">
      {/* Product Image */}
      <div className="flex-shrink-0">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
          {item.variant.image ? (
            <Image
              src={item.variant.image}
              alt={item.variant.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 line-clamp-2">
              {item.variant.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              SKU: {item.variant.sku}
            </p>
            {item.variant.attributes && Object.keys(item.variant.attributes).length > 0 && (
              <div className="mt-2 space-x-2">
                {Object.entries(item.variant.attributes).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-right ml-4">
            <div className="font-bold text-lg text-gray-900">
              {formatCurrency(totalPrice)}
            </div>
            {originalTotal && (
              <div className="text-sm text-gray-400 line-through">
                {formatCurrency(originalTotal)}
              </div>
            )}
            <div className="text-sm text-gray-600 mt-1">
              {formatCurrency(item.variant.price)} each
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="mt-2">
          {item.variant.stock > 10 ? (
            <span className="text-sm text-green-600">✓ In stock</span>
          ) : item.variant.stock > 0 ? (
            <span className="text-sm text-orange-600">
              Only {item.variant.stock} left
            </span>
          ) : (
            <span className="text-sm text-red-600">Out of stock</span>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={decrementQuantity}
                disabled={isUpdating || item.quantity <= 1}
                className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                {item.quantity === 1 ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
              </button>
              <span className="px-4 py-1 font-medium min-w-[40px] text-center">
                {isUpdating ? '...' : item.quantity}
              </span>
              <button
                onClick={incrementQuantity}
                disabled={isUpdating || item.quantity >= item.variant.stock}
                className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            <Heart className="w-4 h-4 mr-2" />
            Save for later
          </Button>
        </div>
      </div>
    </div>
  );
}
