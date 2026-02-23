import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Filter, ShoppingBag, Star, Shield, Truck } from 'lucide-react';
import { getCollectionBySlug, getSimilarCollections } from '@/lib/supabase/queries/collections';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils/currency';

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug, false);

  if (!collection) {
    return {
      title: 'Collection Not Found | Xarastore',
      description: 'Collection not found',
    };
  }

  return {
    title: `${collection.name} | ${collection.metaTitle || 'Curated Collection'} | Xarastore`,
    description: collection.metaDescription || collection.description,
    openGraph: {
      images: [collection.image],
    },
  };
}

export default async function CollectionDetailPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const searchParamsObj = await searchParams;
  const page = typeof searchParamsObj.page === 'string' ? parseInt(searchParamsObj.page) : 1;

  const collection = await getCollectionBySlug(slug, true);

  if (!collection) {
    notFound();
  }

  const similarCollections = await getSimilarCollections(collection.id, 4);

  // Calculate collection stats
  const totalPrice = collection.products.reduce((sum, product) => sum + product.price, 0);
  const averagePrice = collection.products.length > 0 ? totalPrice / collection.products.length : 0;
  const averageRating = collection.products.length > 0 
    ? collection.products.reduce((sum, product) => sum + product.rating, 0) / collection.products.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Collection Hero */}
      <div className="relative">
        {collection.bannerImage ? (
          <div className="h-64 md:h-96 relative">
            <Image
              src={collection.bannerImage}
              alt={collection.name}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-r from-red-600 to-red-800" />
        )}
        
        <div className="container-responsive relative -mt-16 md:-mt-24">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              {/* Collection Image */}
              <div className="md:w-1/3">
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <Image
                    src={collection.image}
                    alt={collection.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>

              {/* Collection Info */}
              <div className="md:w-2/3">
                <div className="flex items-center space-x-4 mb-4">
                  <Link
                    href="/collections"
                    className="inline-flex items-center text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Collections
                  </Link>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                    {collection.type.charAt(0).toUpperCase() + collection.type.slice(1)}
                  </span>
                  {collection.isFeatured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                      Featured
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">{collection.name}</h1>
                <p className="text-gray-700 text-lg mb-6">{collection.description}</p>

                {/* Collection Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {collection.productCount}
                    </div>
                    <div className="text-sm text-gray-600">Products</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {formatCurrency(averagePrice)}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Price</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Rating</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {collection.products.filter(p => p.stock > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">In Stock</div>
                  </div>
                </div>

                {/* Collection Actions */}
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" size="lg">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Shop This Collection
                  </Button>
                  <Button variant="secondary" size="lg">
                    Save Collection
                  </Button>
                  <Button variant="secondary" size="lg">
                    Share Collection
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Products */}
      <section className="py-12">
        <div className="container-responsive">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Products in This Collection</h2>
              <p className="text-gray-600 mt-2">
                {collection.productCount} carefully curated product{collection.productCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="secondary">
                <Filter className="w-5 h-5 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {collection.products.length > 0 ? (
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid products={collection.products} />
            </Suspense>
          ) : (
            <EmptyState
              title="No Products in Collection"
              description="This collection is currently being curated. Check back soon for amazing products."
              icon="search"
              action={{
                label: 'Browse All Products',
                href: '/shop',
              }}
            />
          )}
        </div>
      </section>

      {/* Collection Benefits */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container-responsive">
          <h2 className="text-2xl font-bold text-center mb-12">
            Why Shop This Collection?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Expertly Curated</h3>
              <p className="text-gray-600">
                Every product in this collection has been carefully selected by our experts.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Quality Guaranteed</h3>
              <p className="text-gray-600">
                All products meet our strict quality standards and customer satisfaction guarantee.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Enjoy fast, reliable delivery across Kenya with our trusted partners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Collections */}
      {similarCollections.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container-responsive">
            <h2 className="text-2xl font-bold mb-8">Similar Collections</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarCollections.map((similar) => (
                <Link
                  key={similar.id}
                  href={`/collections/${similar.slug}`}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-xl aspect-[3/2] mb-4">
                    <img
                      src={similar.image}
                      alt={similar.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg mb-1">{similar.name}</h3>
                      <p className="text-white/80 text-sm line-clamp-1">
                        {similar.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold group-hover:text-red-600 transition-colors">
                        {similar.name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {similar.productCount} products
                      </p>
                    </div>
                    <span className="text-sm font-medium text-red-600">
                      View
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
