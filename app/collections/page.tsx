import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Metadata } from 'next';
import { Sparkles, Clock, TrendingUp, Zap, Package, ArrowRight } from 'lucide-react';
import { 
  getFeaturedCollections, 
  getAllCollections,
  getCollectionTypesWithCounts,
  getTrendingCollections 
} from '@/lib/supabase/queries/collections';
import { EmptyState } from '@/components/product/EmptyState';
import { CollectionTypesGrid } from '@/components/collections/CollectionTypesGrid';
import { CollectionFilterBar } from '@/components/collections/CollectionFilterBar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { Container } from '@/components/layout/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { NewsletterSection } from '@/components/marketing/NewsletterSection';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { settingsManager } from '@/lib/utils/settings';
import { generateSeoMetadata } from '@/lib/utils/seo';
import { logger } from '@/lib/utils/logger';
import { formatNumber } from '@/lib/utils/format';

// Types
interface CollectionsPageProps {
  searchParams?: Promise<{
    page?: string;
    type?: string;
    sort?: string;
  }>;
}

// Metadata generation with SEO optimization
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await settingsManager.getSiteSettings();
    
    return generateSeoMetadata({
      title: 'Collections - Curated Product Selections',
      description: 'Browse our curated collections of products. Discover themed selections for every occasion and need. Shop handpicked items from our expert curators.',
      keywords: 'collections, curated products, themed collections, product bundles, gift sets, seasonal collections, trending products, xarastore collections',
      siteName: settings.site_name,
      siteUrl: process.env.NEXT_PUBLIC_APP_URL,
      imageUrl: '/og-collections.jpg',
      twitterHandle: '@xarastore',
    });
  } catch (error) {
    logger.error('Failed to generate collections metadata', { error });
    
    return generateSeoMetadata({
      title: 'Collections - Curated Product Selections | Xarastore',
      description: 'Browse our curated collections of products. Discover themed selections for every occasion and need.',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL,
    });
  }
}

// Main page component
export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  try {
    // Parse search params safely
    const params = await searchParams;
    const currentPage = params?.page ? parseInt(params.page) : 1;
    const currentType = params?.type || '';
    const currentSort = params?.sort || 'newest';
    
    // Validate page number
    const validatedPage = isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
    const pageSize = 12;

    // Fetch data in parallel with error handling
    const [
      featuredResult,
      allCollectionsResult,
      collectionTypesResult,
      trendingResult
    ] = await Promise.allSettled([
      getFeaturedCollections(6),
      getAllCollections({ 
        page: validatedPage, 
        pageSize,
        type: currentType,
        sortBy: currentSort
      }),
      getCollectionTypesWithCounts(),
      getTrendingCollections(4)
    ]);

    // Handle each result with proper error recovery
    const featured = featuredResult.status === 'fulfilled' ? featuredResult.value : [];
    const allCollections = allCollectionsResult.status === 'fulfilled' 
      ? allCollectionsResult.value 
      : { collections: [], total: 0, page: validatedPage, pageSize, totalPages: 0 };
    const types = collectionTypesResult.status === 'fulfilled' ? collectionTypesResult.value : [];
    const trending = trendingResult.status === 'fulfilled' ? trendingResult.value : [];

    // Log any failures for monitoring
    if (featuredResult.status === 'rejected') {
      logger.error('Failed to fetch featured collections', { error: featuredResult.reason });
    }
    if (allCollectionsResult.status === 'rejected') {
      logger.error('Failed to fetch all collections', { error: allCollectionsResult.reason });
    }
    if (collectionTypesResult.status === 'rejected') {
      logger.error('Failed to fetch collection types', { error: collectionTypesResult.reason });
    }
    if (trendingResult.status === 'rejected') {
      logger.error('Failed to fetch trending collections', { error: trendingResult.reason });
    }

    // Calculate statistics from real data
    const totalProductsInCollections = allCollections.collections.reduce(
      (sum, collection) => sum + (collection.productCount || 0), 
      0
    );

    const averageCollectionSize = allCollections.collections.length > 0 
      ? Math.round(totalProductsInCollections / allCollections.collections.length) 
      : 0;

    const activeTypesCount = types.length;

    // Structured data for SEO
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Product Collections',
      description: 'Browse our curated collections of products',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/collections`,
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: allCollections.collections.map((collection, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/collections/${collection.slug}`,
          name: collection.name,
          description: collection.description,
          image: collection.image,
        })),
      },
    };

    return (
      <>
        {/* Structured data script */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
          {/* Hero Section */}
          <section className="relative bg-gradient-to-r from-red-600 to-red-800 text-white overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>

            <Container className="relative py-16 md:py-24">
              <Breadcrumb
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Collections', href: '/collections' },
                ]}
                className="text-white/80 mb-8"
              />

              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-8">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-semibold">CURATED COLLECTIONS</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  Discover Curated
                  <span className="block text-yellow-300">Product Collections</span>
                </h1>

                <p className="text-xl opacity-90 mb-12 max-w-2xl mx-auto">
                  Handpicked selections for every style, occasion, and need. 
                  Our experts curate the best products just for you.
                </p>

                {/* Stats Grid - Shows real data from database */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-3xl font-bold mb-1">{allCollections.total}</div>
                    <div className="text-sm opacity-80">Active Collections</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-3xl font-bold mb-1">{formatNumber(totalProductsInCollections)}</div>
                    <div className="text-sm opacity-80">Total Products</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-3xl font-bold mb-1">{activeTypesCount}</div>
                    <div className="text-sm opacity-80">Collection Types</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                    <div className="text-3xl font-bold mb-1">{averageCollectionSize}</div>
                    <div className="text-sm opacity-80">Avg. Products/Collection</div>
                  </div>
                </div>
              </div>
            </Container>

            {/* Wave Separator */}
            <div className="absolute bottom-0 left-0 right-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120" className="w-full h-auto">
                <path fill="#ffffff" fillOpacity="1" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
              </svg>
            </div>
          </section>

          {/* Filter Bar */}
          <Container className="py-8">
            <CollectionFilterBar 
              types={types}
              currentType={currentType}
              currentSort={currentSort}
            />
          </Container>

          <Separator />

          {/* Featured Collections Section */}
          {featured.length > 0 && (
            <section className="py-16 bg-white">
              <Container>
                <SectionHeading
                  title="⭐ Featured Collections"
                  description="Our most popular curated selections, handpicked by our experts"
                  action={{
                    label: 'View All Collections',
                    href: '#all-collections',
                  }}
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
                  {featured.map((collection, index) => (
                    <ErrorBoundary key={collection.id} fallback={null}>
                      <CollectionCard
                        collection={collection}
                        priority={index < 2}
                        featured
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              </Container>
            </section>
          )}

          {/* Collection Types Section */}
          {types.length > 0 && (
            <section className="py-16 bg-gray-50">
              <Container>
                <SectionHeading
                  title="Browse by Type"
                  description="Discover collections organized by category and theme"
                />

                <Suspense fallback={<CollectionTypesSkeleton />}>
                  <ErrorBoundary fallback={<CollectionTypesError />}>
                    <CollectionTypesGrid types={types} />
                  </ErrorBoundary>
                </Suspense>
              </Container>
            </section>
          )}

          {/* Trending Collections */}
          {trending.length > 0 && (
            <section className="py-16 bg-gradient-to-r from-red-50 to-orange-50">
              <Container>
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-3 bg-red-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold">🔥 Trending Now</h2>
                    <p className="text-gray-600">Collections getting the most attention this week</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {trending.map((collection) => (
                    <ErrorBoundary key={collection.id} fallback={null}>
                      <CollectionCard
                        collection={collection}
                        variant="compact"
                        showTrendingBadge
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              </Container>
            </section>
          )}

          {/* All Collections Section */}
          <section id="all-collections" className="py-16 bg-white">
            <Container>
              <SectionHeading
                title="All Collections"
                description="Browse our complete library of curated collections"
              />

              {allCollections.collections.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                    {allCollections.collections.map((collection, index) => (
                      <ErrorBoundary key={collection.id} fallback={null}>
                        <CollectionCard
                          collection={collection}
                          priority={index < 4}
                        />
                      </ErrorBoundary>
                    ))}
                  </div>

                  {/* Pagination */}
                  {allCollections.totalPages > 1 && (
                    <div className="mt-12">
                      <Pagination
                        currentPage={allCollections.page}
                        totalPages={allCollections.totalPages}
                        baseUrl="/collections"
                        queryParams={{ 
                          ...(currentType && { type: currentType }),
                          ...(currentSort !== 'newest' && { sort: currentSort })
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  title="No Collections Found"
                  description={
                    currentType 
                      ? `No collections found of type "${currentType}". Try a different filter.`
                      : "No collections are available at the moment. Please check back soon."
                  }
                  icon="package"
                  action={{
                    label: currentType ? 'Clear Filters' : 'Browse Products',
                    href: currentType ? '/collections' : '/shop',
                  }}
                />
              )}
            </Container>
          </section>

          {/* Benefits Section */}
          <section className="py-16 bg-gray-50">
            <Container>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
                Why Shop Collections?
              </h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <BenefitCard
                  icon={<Sparkles className="w-8 h-8 text-red-600" />}
                  title="Expertly Curated"
                  description="Our experts handpick products that work perfectly together based on real customer data and trends."
                />
                <BenefitCard
                  icon={<Zap className="w-8 h-8 text-red-600" />}
                  title="Time Saving"
                  description="Discover complete looks and sets without endless browsing. Perfect for busy shoppers."
                />
                <BenefitCard
                  icon={<Clock className="w-8 h-8 text-red-600" />}
                  title="Seasonal Updates"
                  description="Collections are regularly updated with seasonal products and trending items."
                />
              </div>
            </Container>
          </section>

          {/* Newsletter Section */}
          <NewsletterSection
            title="Get Collection Updates"
            description="Subscribe to receive notifications about new collections and exclusive previews"
          />

          {/* Scroll to top button */}
          <ScrollToTop />
        </div>
      </>
    );
  } catch (error) {
    logger.error('Failed to render collections page', { error });
    
    // Fallback UI for critical errors
    return (
      <Container className="py-16">
        <EmptyState
          title="Unable to Load Collections"
          description="We're having trouble loading collections right now. Please try again later."
          icon="alert"
          action={{
            label: 'Try Again',
            href: '/collections',
          }}
        />
      </Container>
    );
  }
}

// Helper Components
function BenefitCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function CollectionTypesSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

function CollectionTypesError() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500">Unable to load collection types</p>
    </div>
  );
}

// Revalidation
export const revalidate = 300; // Revalidate every 5 minutes
export const dynamic = 'force-dynamic';
