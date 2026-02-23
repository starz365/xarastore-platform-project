'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Zap, TrendingUp, Eye } from 'lucide-react';
import { Product } from '@/types';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DealTimer } from './DealTimer';
import { cn } from '@/lib/utils/cn';
import { useCart } from '@/lib/hooks/useCart';
import { toast } from '@/components/shared/Toast';

interface DealCardProps {
  product: Product;
  variant?: 'default' | 'featured' | 'compact';
  showTimer?: boolean;
  showProgress?: boolean;
  className?: string;
}

export function DealCard({
  product,
  variant = 'default',
  showTimer = true,
  showProgress = false,
  className,
}: DealCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const handleAddToCart = async () => {
    if (isAdding) return;
    
    setIsAdding(true);
    try {
      const defaultVariant = product.variants?.[0] || {
        id: 'default',
        price: product.price,
        originalPrice: product.originalPrice,
        sku: product.sku,
        stock: product.stock,
        name: 'Default',
        attributes: {},
      };

      addItem(product.id, defaultVariant, 1);
      
      toast.success('Added to cart!', {
        description: `${product.name} added to your cart.`,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart', {
        description: 'Please try again.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuickView = () => {
    // In production, this would open a quick view modal
    console.log('Quick view:', product.id);
  };

  if (variant === 'compact') {
    return (
      <Link href={`/product/${product.slug}`} className="block group">
        <div className={cn(
          'flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all',
          className
        )}>
          <div className="relative w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
            <Image
              src={product.images?.[0] || '/placeholder.jpg'}
              alt={product.name}
              fill
              className="object-cover"
              sizes="64px"
            />
            {discountPercentage > 0 && (
              <Badge className="absolute top-1 left-1 text-xs px-1.5 py-0.5">
                -{discountPercentage}%
              </Badge>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate group-hover:text-red-600">
              {product.name}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <PriceDisplay
                price={product.price}
                originalPrice={product.originalPrice}
                currency="KES"
                size="sm"
              />
              {showTimer && product.dealEndsAt && (
                <DealTimer
                  endTime={product.dealEndsAt}
                  variant="inline"
                  showIcon={false}
                  className="text-xs"
                />
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={cn(
      'group relative bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-200 overflow-hidden',
      variant === 'featured' && 'ring-2 ring-red-500/20',
      className
    )}>
      {/* Deal Badge */}
      {discountPercentage > 0 && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-red-600 text-white text-sm px-3 py-1.5">
            <Zap className="w-3 h-3 mr-1" />
            {discountPercentage}% OFF
          </Badge>
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={() => setIsWishlisted(!isWishlisted)}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={cn(
            'w-5 h-5',
            isWishlisted ? 'fill-red-600 text-red-600' : 'text-gray-400'
          )}
        />
      </button>

      {/* Product Image */}
      <Link href={`/product/${product.slug}`} className="block">
        <div className={cn(
          'relative bg-gray-100 overflow-hidden',
          variant === 'featured' ? 'aspect-[4/3]' : 'aspect-square'
        )}>
          <Image
            src={product.images?.[0] || '/placeholder.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes={variant === 'featured' ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            priority={variant === 'featured'}
          />
          
          {/* Quick View Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        {/* Brand */}
        <Link
          href={`/brands/${product.brand.slug}`}
          className="text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          {product.brand.name}
        </Link>

        {/* Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2 group-hover:text-red-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center space-x-2 mt-2">
          <Rating value={product.rating} size="sm" />
          <span className="text-xs text-gray-500">
            ({product.reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="mt-3">
          <PriceDisplay
            price={product.price}
            originalPrice={product.originalPrice}
            currency="KES"
          />
        </div>

        {/* Stock & Progress */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              'font-medium',
              product.stock > 10 ? 'text-green-600' : 'text-red-600'
            )}>
              {product.stock > 10 ? 'In stock' : `${product.stock} left`}
            </span>
            {showProgress && product.stock > 0 && (
              <span className="text-gray-500">
                {Math.round((product.stock / 100) * 100)}% sold
              </span>
            )}
          </div>
          
          {showProgress && product.stock > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-red-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (product.stock / 100) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Deal Timer */}
        {showTimer && product.dealEndsAt && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <DealTimer
              endTime={product.dealEndsAt}
              variant="compact"
              className="justify-center"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            className="px-3"
            onClick={handleQuickView}
            aria-label="Quick view"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>

        {/* Trending Badge */}
        {product.rating >= 4.5 && product.reviewCount > 50 && (
          <div className="mt-3 flex items-center justify-center">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
