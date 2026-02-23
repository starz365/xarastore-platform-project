import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';
import { Shield, Truck, RefreshCw, Check } from 'lucide-react';
import { getProductBySlug } from '@/lib/supabase/queries/products';
import { ProductImageGallery } from '@/components/product/ProductImageGallery';
import { ProductVariants } from '@/components/product/ProductVariants';
import { ProductReviews } from '@/components/product/ProductReviews';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { Rating } from '@/components/ui/Rating';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AddToCartButton } from '@/components/product/AddToCartButton';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product Not Found | Xarastore',
      description: 'Product not found',
    };
  }

  return {
    title: `${product.name} | ${product.brand.name} | Xarastore`,
    description: product.description.substring(0, 160),
    openGraph: {
      images: product.images,
      price: {
        amount: product.price.toString(),
        currency: 'KES',
      },
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="container-responsive py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <ol className="flex items-center space-x-2">
            <li>
              <a href="/" className="hover:text-brand-red transition-colors">
                Home
              </a>
            </li>
            <li>/</li>
            <li>
              <a
                href={`/category/${product.category.slug}`}
                className="hover:text-brand-red transition-colors"
              >
                {product.category.name}
              </a>
            </li>
            <li>/</li>
            <li>
              <a
                href={`/brands/${product.brand.slug}`}
                className="hover:text-brand-red transition-colors"
              >
                {product.brand.name}
              </a>
            </li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div>
            <ProductImageGallery images={product.images} />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Brand & Category */}
            <div className="flex items-center space-x-4">
              <a
                href={`/brands/${product.brand.slug}`}
                className="text-sm font-medium text-gray-600 hover:text-brand-red transition-colors"
              >
                {product.brand.name}
              </a>
              <span className="text-gray-300">•</span>
              <a
                href={`/category/${product.category.slug}`}
                className="text-sm text-gray-500 hover:text-brand-red transition-colors"
              >
                {product.category.name}
              </a>
            </div>

            {/* Product Name */}
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {product.name}
            </h1>

            {/* Rating & Reviews */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Rating value={product.rating} size="lg" />
                <span className="text-gray-600 font-medium">{product.rating.toFixed(1)}</span>
              </div>
              <a
                href="#reviews"
                className="text-brand-red hover:text-brand-red-dark transition-colors"
              >
                {product.reviewCount} reviews
              </a>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500">{product.sku}</span>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <PriceDisplay
                price={product.price}
                originalPrice={product.originalPrice}
                currency="KES"
                size="xl"
              />
              {discountPercentage > 0 && (
                <div className="inline-flex items-center px-3 py-1 bg-brand-red/10 text-brand-red rounded-full text-sm font-medium">
                  Save {discountPercentage}%
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center space-x-2">
              {product.stock > 10 ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">In stock</span>
                  <span className="text-gray-500">• Ready to ship</span>
                </>
              ) : product.stock > 0 ? (
                <>
                  <Check className="w-5 h-5 text-orange-600" />
                  <span className="text-orange-600 font-medium">
                    Only {product.stock} left
                  </span>
                  <span className="text-gray-500">• Order soon</span>
                </>
              ) : (
                <>
                  <span className="text-red-600 font-medium">Out of stock</span>
                </>
              )}
            </div>

            {/* Variants */}
            {product.variants.length > 1 && (
              <ProductVariants
                variants={product.variants}
                productId={product.id}
              />
            )}

            {/* Add to Cart */}
            <Suspense fallback={<Skeleton className="h-12" />}>
              <AddToCartButton
                productId={product.id}
                variant={product.variants[0]}
                stock={product.stock}
              />
            </Suspense>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div className="flex flex-col items-center text-center space-y-2">
                <Truck className="w-6 h-6 text-brand-red" />
                <span className="text-sm font-medium">Free Delivery</span>
                <span className="text-xs text-gray-500">Over KES 2,000</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <Shield className="w-6 h-6 text-brand-red" />
                <span className="text-sm font-medium">1 Year Warranty</span>
                <span className="text-xs text-gray-500">Guaranteed</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-brand-red" />
                <span className="text-sm font-medium">Easy Returns</span>
                <span className="text-xs text-gray-500">30 Day Policy</span>
              </div>
            </div>

            {/* Buy Now Button */}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={product.stock === 0}
            >
              Buy Now
            </Button>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {['Description', 'Specifications', 'Reviews', 'Q&A'].map((tab) => (
                <button
                  key={tab}
                  className="py-4 px-1 border-b-2 border-transparent hover:text-brand-red transition-colors font-medium"
                >
                  {tab}
                  {tab === 'Reviews' && (
                    <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      {product.reviewCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Description */}
          <div className="py-8">
            <div className="prose max-w-none">
              <h3 className="text-xl font-bold mb-4">Product Description</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </div>

          {/* Specifications */}
          {Object.keys(product.specifications).length > 0 && (
            <div className="py-8">
              <h3 className="text-xl font-bold mb-6">Specifications</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between py-3 border-b border-gray-100"
                  >
                    <span className="text-gray-600">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div id="reviews" className="py-8">
            <Suspense fallback={<ReviewsSkeleton />}>
              <ProductReviews productId={product.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}
