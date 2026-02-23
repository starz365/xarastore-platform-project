import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Filter, Sparkles } from 'lucide-react';
import { getCollectionsByType } from '@/lib/supabase/queries/collections';
import { CollectionTypesGrid } from '@/components/collections/CollectionTypesGrid';
import { EmptyState } from '@/components/product/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface TypePageProps {
  params: Promise<{ type: string }>;
}

const validTypes = [
  'seasonal',
  'themed',
  'editorial',
  'trending',
  'featured',
  'new_arrivals',
  'best_sellers',
  'limited_time',
] as const;

export async function generateMetadata({ params }: TypePageProps) {
  const { type } = await params;
  const typeLabel = type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return {
    title: `${typeLabel} Collections | Xarastore`,
    description: `Browse our curated ${typeLabel.toLowerCase()} collections of products. Discover themed selections for every occasion.`,
  };
}

export default async function CollectionTypePage({ params }: TypePageProps) {
  const { type } = await params;
  
  // Validate type parameter
  if (!validTypes.includes(type as any)) {
    notFound();
  }

  const collections = await getCollectionsByType(type as any);

  const typeLabels: Record<string, string> = {
    seasonal: 'Seasonal',
    themed: 'Themed',
    editorial: 'Editorial',
    trending: 'Trending',
    featured: 'Featured',
    new_arrivals: 'New Arrivals',
    best_sellers: 'Best Sellers',
    limited_time: 'Limited Time',
  };

  const typeDescriptions: Record<string, string> = {
    seasonal: 'Discover collections curated for the current season, holidays, and special occasions throughout the year.',
    themed: 'Explore products organized around specific themes, styles, or interests.',
    editorial: 'Handpicked selections curated by our style experts and editors.',
    trending: 'See what\'s popular right now with our trending collections.',
    featured: 'Our highlighted collections showcasing the best of Xarastore.',
    new_arrivals: 'The latest products and arrivals organized into curated collections.',
    best_sellers: 'Customer favorites and top-selling products organized by category.',
    limited_time: 'Special collections available for a limited time only.',
  };

  const typeIcon: Record<string, string> = {
    seasonal: '🍂',
    themed: '🎨',
    editorial: '✍️',
    trending: '🔥',
    featured: '⭐',
    new_arrivals: '🆕',
    best_sellers: '🏆',
    limited_time: '⏰',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-4 mb-6">
              <Link
                href="/collections"
                className="inline-flex items-center text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Collections
              </Link>
            </div>
            
            <div className="flex items-center space-x-4 mb-6">
              <div className="text-4xl">{typeIcon[type] || '📦'}</div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">
                  {typeLabels[type]} Collections
                </h1>
                <p className="text-xl opacity-90">
                  {typeDescriptions[type]}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-white/20 rounded-lg">
                <span className="font-medium">{collections.length} collection{collections.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>Expertly Curated</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <section className="py-12">
        <div className="container-responsive">
          {collections.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block"
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-4">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-2xl font-bold mb-2">{collection.name}</h3>
                      <p className="text-white/90 mb-3 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {collection.productCount} products
                        </span>
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                          View Collection →
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={`No ${typeLabels[type]} Collections`}
              description={`We're currently curating ${typeLabels[type].toLowerCase()} collections. Check back soon or browse other collection types.`}
              icon="search"
              action={{
                label: 'Browse All Collections',
                href: '/collections',
              }}
            />
          )}
        </div>
      </section>

      {/* Other Collection Types */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container-responsive">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Browse Other Collection Types</h2>
              <p className="text-gray-600 mt-2">
                Discover more curated collections
              </p>
            </div>
            <Button asChild variant="link">
              <Link href="/collections">
                View All Types
              </Link>
            </Button>
          </div>
          
          <Suspense fallback={
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          }>
            <CollectionTypesGrid />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
