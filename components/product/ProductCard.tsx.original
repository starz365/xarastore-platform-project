'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Eye, Clock } from 'lucide-react';
import { Product } from '@/types/product';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useCart } from '@/lib/hooks/useCart';

interface ProductCardProps {
  product: Product;
  showTimer?: boolean;
}

export function ProductCard({ product, showTimer = false }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    if (isAdding) return;
    
    setIsAdding(true);
    try {
      // Get default variant
      const defaultVariant = product.variants?.[0] || {
        id: 'default',
        price: product.price,
        originalPrice: product.originalPrice,
        sku: product.sku,
        stock: product.stock,
      };

      addItem(product.id, defaultVariant, 1);
      
      // Show success feedback
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 hover:border-brand-red hover:shadow-card-hover transition-all duration-200 overflow-hidden">
      {/* Wishlist button */}
      <button
        onClick={() => setIsWishlisted(!isWishlisted)}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`w-5 h-5 ${
            isWishlisted ? 'fill-brand-red text-brand-red' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Discount badge */}
      {discountPercentage > 0 && (
        <Badge className="absolute top-3 left-3 z-10 bg-brand-red text-white">
          -{discountPercentage}%
        </Badge>
      )}

      {/* Product image */}
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square bg-gray-100">
          <Image
            src={product.images?.[0] || '/placeholder.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
        </div>
      </Link>

      {/* Product info */}
      <div className="p-4">
        {/* Brand */}
        <Link
          href={`/brands/${product.brand.slug}`}
          className="text-sm text-gray-500 hover:text-brand-red transition-colors"
        >
          {product.brand.name}
        </Link>

        {/* Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-gray-900 mt-1 line-clamp-2 hover:text-brand-red transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center space-x-2 mt-2">
          <Rating value={product.rating} />
          <span className="text-sm text-gray-500">
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

        {/* Stock status */}
        <div className="mt-2">
          {product.stock > 10 ? (
            <span className="text-sm text-green-600">In stock</span>
          ) : product.stock > 0 ? (
            <span className="text-sm text-orange-600">Only {product.stock} left</span>
          ) : (
            <span className="text-sm text-red-600">Out of stock</span>
          )}
        </div>

        {/* Timer for deals */}
        {showTimer && discountPercentage > 0 && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Ends in 02:15:30</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex items-center space-x-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || isAdding}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="flex-shrink-0"
          >
            <Link href={`/product/${product.slug}`}>
              <Eye className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
