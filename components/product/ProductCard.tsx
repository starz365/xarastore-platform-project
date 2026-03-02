'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Eye, Clock, AlertTriangle } from 'lucide-react';
import { Product } from '@/types/product';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { AddToCartButton } from './AddToCartButton';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { toast } from '@/components/shared/Toast';
import { cn } from '@/lib/utils/cn';

interface ProductCardProps {
  product: Product;
  showTimer?: boolean;
  priority?: boolean;
  className?: string;
  onQuickView?: () => void;
}

export const ProductCard = memo(function ProductCard({ 
  product, 
  showTimer = false, 
  priority = false,
  className = '',
  onQuickView
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { trackEvent } = useAnalytics();

  // Defensive checks for required data
  const safeProduct = {
    id: product?.id || '',
    slug: product?.slug || '',
    name: product?.name || 'Product Name Unavailable',
    description: product?.description || '',
    price: typeof product?.price === 'number' && !isNaN(product.price) ? product.price : 0,
    originalPrice: typeof product?.originalPrice === 'number' && !isNaN(product.originalPrice) ? product.originalPrice : null,
    sku: product?.sku || '',
    brand: product?.brand || { id: '', slug: '', name: 'Unknown Brand', logo: '', productCount: 0 },
    category: product?.category || { id: '', slug: '', name: 'Uncategorized', productCount: 0 },
    images: Array.isArray(product?.images) ? product.images : [],
    variants: Array.isArray(product?.variants) ? product.variants : [],
    specifications: product?.specifications || {},
    rating: typeof product?.rating === 'number' && !isNaN(product.rating) ? product.rating : 0,
    reviewCount: typeof product?.reviewCount === 'number' && !isNaN(product.reviewCount) ? product.reviewCount : 0,
    stock: typeof product?.stock === 'number' && !isNaN(product.stock) ? product.stock : 0,
    isFeatured: !!product?.isFeatured,
    isDeal: !!product?.isDeal,
    dealEndsAt: product?.dealEndsAt || null,
    allowPreorder: !!product?.allowPreorder,
    estimatedRestockDate: product?.estimatedRestockDate || null,
    createdAt: product?.createdAt || new Date().toISOString(),
    updatedAt: product?.updatedAt || new Date().toISOString(),
  };

  const isOutOfStock = safeProduct.stock === 0;
  const isLowStock = safeProduct.stock > 0 && safeProduct.stock <= 5;
  const discountPercentage = safeProduct.originalPrice && safeProduct.price
    ? Math.round(((safeProduct.originalPrice - safeProduct.price) / safeProduct.originalPrice) * 100)
    : 0;

  const isWishlisted = isInWishlist(safeProduct.id);

  const handleWishlistToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (isWishlisted) {
        await removeFromWishlist(safeProduct.id);
        toast.success('Removed from wishlist');
        trackEvent({
          category: 'wishlist',
          action: 'remove',
          label: safeProduct.id,
        });
      } else {
        await addToWishlist(safeProduct.id);
        toast.success('Added to wishlist');
        trackEvent({
          category: 'wishlist',
          action: 'add',
          label: safeProduct.id,
          value: safeProduct.price,
        });
      }
    } catch (error) {
      toast.error('Failed to update wishlist', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  }, [isWishlisted, safeProduct.id, safeProduct.price, addToWishlist, removeFromWishlist, trackEvent]);

  const handleQuickView = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onQuickView) {
      onQuickView();
    } else {
      window.location.href = `/product/${safeProduct.slug}`;
    }
    
    trackEvent({
      category: 'product',
      action: 'quick_view',
      label: safeProduct.id,
    });
  }, [safeProduct.slug, safeProduct.id, onQuickView, trackEvent]);

  const handleViewSimilar = useCallback(() => {
    if (safeProduct.category?.slug) {
      window.location.href = `/category/${safeProduct.category.slug}?exclude=${safeProduct.id}`;
    } else {
      window.location.href = '/shop';
    }
  }, [safeProduct.category?.slug, safeProduct.id]);

  const getStockStatusText = () => {
    if (isOutOfStock) return 'Out of Stock';
    if (isLowStock) return `Only ${safeProduct.stock} left`;
    return 'In Stock';
  };

  const getStockStatusColor = () => {
    if (isOutOfStock) return 'text-red-600';
    if (isLowStock) return 'text-orange-600';
    return 'text-green-600';
  };

  const defaultVariant = safeProduct.variants && safeProduct.variants.length > 0 
    ? safeProduct.variants[0] 
    : {
        id: 'default',
        name: 'Default',
        price: safeProduct.price,
        originalPrice: safeProduct.originalPrice,
        sku: safeProduct.sku,
        stock: safeProduct.stock,
        attributes: {},
      };

  return (
    <article 
      className={cn(
        'group relative bg-white rounded-xl border border-gray-200 hover:border-brand-red hover:shadow-card-hover transition-all duration-200 overflow-hidden',
        className
      )}
      aria-label={`Product: ${safeProduct.name}`}
    >
      {/* Wishlist button */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-colors',
            isWishlisted ? 'fill-brand-red text-brand-red' : 'text-gray-400'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Discount badge */}
      {!isOutOfStock && discountPercentage > 0 && (
        <Badge 
          className="absolute top-3 left-3 z-10 bg-brand-red text-white"
          aria-label={`${discountPercentage}% discount`}
        >
          -{discountPercentage}%
        </Badge>
      )}

      {/* Out of Stock badge */}
      {isOutOfStock && (
        <Badge 
          className="absolute top-3 left-3 z-10 bg-gray-800 text-white"
          aria-label="Out of stock"
        >
          Out of Stock
        </Badge>
      )}

      {/* Product image */}
      <Link 
        href={`/product/${safeProduct.slug}`} 
        className="block relative"
        aria-label={`View ${safeProduct.name} details`}
      >
        <div className="relative aspect-square bg-gray-100">
          {!isImageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-brand-red rounded-full animate-spin" />
            </div>
          )}
          
          {safeProduct.images && safeProduct.images.length > 0 && !imageError ? (
            <Image
              src={safeProduct.images[0]}
              alt={safeProduct.name}
              fill
              className={cn(
                'object-cover transition-all duration-300',
                isOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105',
                isImageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setIsImageLoaded(true);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
              <span className="px-3 py-1 bg-gray-900/75 text-white text-sm font-medium rounded-full backdrop-blur-sm">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Product info */}
      <div className="p-4">
        {/* Brand */}
        {safeProduct.brand?.slug ? (
          <Link
            href={`/brands/${safeProduct.brand.slug}`}
            className="text-sm text-gray-500 hover:text-brand-red transition-colors focus:outline-none focus:underline"
            aria-label={`View all products from ${safeProduct.brand.name}`}
          >
            {safeProduct.brand.name}
          </Link>
        ) : (
          <span className="text-sm text-gray-500">{safeProduct.brand.name}</span>
        )}

        {/* Name */}
        <Link 
          href={`/product/${safeProduct.slug}`}
          className="block focus:outline-none focus:underline"
          aria-label={safeProduct.name}
        >
          <h3 className="font-medium text-gray-900 mt-1 line-clamp-2 hover:text-brand-red transition-colors">
            {safeProduct.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center space-x-2 mt-2">
          <Rating value={safeProduct.rating} size="sm" />
          <span className="text-sm text-gray-500">
            ({safeProduct.reviewCount.toLocaleString()})
          </span>
        </div>

        {/* Price */}
        <div className="mt-3">
          <PriceDisplay
            price={safeProduct.price}
            originalPrice={safeProduct.originalPrice}
            currency="KES"
            size={isOutOfStock ? 'md' : 'lg'}
            className={isOutOfStock ? 'opacity-60' : ''}
          />
        </div>

        {/* Stock status with warning for low stock */}
        <div className="mt-2 flex items-center space-x-2">
          {isLowStock && !isOutOfStock && (
            <AlertTriangle className="w-4 h-4 text-orange-600" aria-hidden="true" />
          )}
          <span className={cn('text-sm', getStockStatusColor())}>
            {getStockStatusText()}
          </span>
        </div>

        {/* Timer for deals */}
        {showTimer && !isOutOfStock && discountPercentage > 0 && safeProduct.dealEndsAt && (
          <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <time dateTime={safeProduct.dealEndsAt}>
              Ends {new Date(safeProduct.dealEndsAt).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </time>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4">
          <AddToCartButton
            product={safeProduct}
            variant={defaultVariant}
            stock={safeProduct.stock}
            onViewSimilar={handleViewSimilar}
            onAddToCartSuccess={() => {
              trackEvent({
                category: 'ecommerce',
                action: 'add_to_cart',
                label: safeProduct.id,
                value: safeProduct.price,
              });
            }}
          />
        </div>

        {/* Quick view button */}
        <button
          onClick={handleQuickView}
          className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-brand-red text-white text-center py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-red"
          aria-label={`Quick view ${safeProduct.name}`}
        >
          <Eye className="w-4 h-4 inline-block mr-2" aria-hidden="true" />
          Quick View
        </button>
      </div>
    </article>
  );
});

ProductCard.displayName = 'ProductCard';
