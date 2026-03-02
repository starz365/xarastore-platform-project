'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Sparkles, Clock, ChevronRight, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { formatNumber } from '@/lib/utils/format';
import type { Collection } from '@/types/collections';

interface CollectionCardProps {
  collection: Collection;
  priority?: boolean;
  featured?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  showTrendingBadge?: boolean;
  className?: string;
  onHover?: (isHovered: boolean) => void;
}

export function CollectionCard({
  collection,
  priority = false,
  featured = false,
  variant = 'default',
  showTrendingBadge = false,
  className,
  onHover,
}: CollectionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleHover = (hovered: boolean) => {
    setIsHovered(hovered);
    onHover?.(hovered);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Default fallback image
  const imageSrc = imageError || !collection.image
    ? '/images/collection-placeholder.jpg'
    : collection.image;

  // Determine badge color based on collection type
  const getBadgeVariant = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      seasonal: 'default',
      themed: 'secondary',
      editorial: 'outline',
      trending: 'destructive',
      featured: 'default',
      new_arrivals: 'secondary',
      best_sellers: 'destructive',
      limited_time: 'outline',
    };
    return variants[type?.toLowerCase()] || 'default';
  };

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    hover: { y: -8, transition: { duration: 0.3 } },
  };

  const imageVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1, transition: { duration: 0.4 } },
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    hover: { opacity: 1, transition: { duration: 0.3 } },
  };

  if (variant === 'compact') {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        onHoverStart={() => handleHover(true)}
        onHoverEnd={() => handleHover(false)}
        className={cn('h-full', className)}
      >
        <Link href={`/collections/${collection.slug}`} className="block h-full">
          <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 group">
            <div className="relative h-40 overflow-hidden">
              <motion.div
                variants={imageVariants}
                className="relative w-full h-full"
              >
                <Image
                  src={imageSrc}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  priority={priority}
                  onError={handleImageError}
                />
              </motion.div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-2">
                {featured && (
                  <Badge variant="default" className="bg-yellow-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {showTrendingBadge && (
                  <Badge variant="destructive" className="animate-pulse">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Trending
                  </Badge>
                )}
              </div>

              {/* Type badge */}
              {collection.type && (
                <Badge
                  variant={getBadgeVariant(collection.type)}
                  className="absolute top-2 right-2 capitalize"
                >
                  {collection.type}
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
                {collection.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {collection.description || 'No description available'}
              </p>
            </CardContent>

            <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <Package className="w-4 h-4 mr-1" />
                {formatNumber(collection.productCount || 0)} products
              </div>
              <motion.div
                variants={{
                  initial: { x: 0 },
                  hover: { x: 5 },
                }}
                className="text-red-600"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.div>
            </CardFooter>
          </Card>
        </Link>
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        onHoverStart={() => handleHover(true)}
        onHoverEnd={() => handleHover(false)}
        className={cn('h-full', className)}
      >
        <Link href={`/collections/${collection.slug}`} className="block h-full">
          <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-300 group">
            <div className="relative h-64 overflow-hidden">
              <motion.div
                variants={imageVariants}
                className="relative w-full h-full"
              >
                <Image
                  src={imageSrc}
                  alt={collection.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={priority}
                  onError={handleImageError}
                />
              </motion.div>

              {/* Animated overlay */}
              <motion.div
                variants={overlayVariants}
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
              />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform transition-transform duration-300">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="border-white text-white">
                    {collection.type || 'Collection'}
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // Add to wishlist functionality
                    }}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Add to wishlist"
                  >
                    <Heart className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-2xl font-bold mb-2">{collection.name}</h3>
                <p className="text-white/90 mb-4 line-clamp-2">
                  {collection.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">
                        {formatNumber(collection.productCount || 0)} products
                      </span>
                    </div>
                  </div>

                  <motion.div
                    variants={{
                      initial: { x: 0 },
                      hover: { x: 5 },
                    }}
                  >
                    <Button size="sm" variant="secondary" className="bg-white text-gray-900 hover:bg-gray-100">
                      View Collection
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      onHoverStart={() => handleHover(true)}
      onHoverEnd={() => handleHover(false)}
      className={cn('h-full', className)}
    >
      <Link href={`/collections/${collection.slug}`} className="block h-full">
        <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 group">
          <div className="relative h-48 overflow-hidden">
            <motion.div
              variants={imageVariants}
              className="relative w-full h-full"
            >
              <Image
                src={imageSrc}
                alt={collection.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={priority}
                onError={handleImageError}
              />
            </motion.div>

            {/* Gradient overlay */}
            <motion.div
              variants={overlayVariants}
              className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
            />

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-2">
              {featured && (
                <Badge variant="default" className="bg-yellow-500 text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              {showTrendingBadge && (
                <Badge variant="destructive" className="animate-pulse">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trending
                </Badge>
              )}
            </div>

            {/* Type badge */}
            {collection.type && (
              <Badge
                variant={getBadgeVariant(collection.type)}
                className="absolute top-2 right-2 capitalize"
              >
                {collection.type}
              </Badge>
            )}

            {/* Product count overlay */}
            <div className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
              <Package className="w-3 h-3 inline mr-1" />
              {formatNumber(collection.productCount || 0)} products
            </div>
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1">
              {collection.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {collection.description || 'No description available'}
            </p>
          </CardContent>

          <CardFooter className="px-4 pb-4 pt-0">
            <Button
              variant="ghost"
              className="w-full group-hover:bg-red-50 group-hover:text-red-600 transition-colors"
            >
              View Collection
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
