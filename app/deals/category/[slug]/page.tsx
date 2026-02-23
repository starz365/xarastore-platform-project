import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Tag, Filter, TrendingUp } from 'lucide-react';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { getCategoryBySlug, getCategoryDeals } from '@/lib/supabase/queries/categories';

interface CategoryDealsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryDealsPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: 'Category Not Found | Xarastore',
      description: 'Category not found',
    };
  }

  return {
    title: `${category.name} Deals | Xarastore`,
    description: `Best deals and discounts on ${category.name}. Shop now and save big!`,
  };
}

export default async function CategoryDealsPage({ params }: CategoryDealsPageProps) {
  const { slug } = await params;
  const [category, deals] = await Promise.all([
    getCategoryBySlug(slug),
    getCategoryDeals(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Tag className="w-5 h-5" />
              <span className="text-sm font-semibold">CATEGORY DEALS</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {category.name} Deals
            </h1>
            <p className="text-xl opacity-90 mb-8">
              {category.description || `Discover the best deals and discounts on ${category.name}. Save big on quality products.`}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>{category.product_count || 0} products</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Best discounts in {category.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Deals Grid */}
      <div className="container-responsive py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">All {category.name} Deals</h2>
              <p className="text-gray-600 mt-2">
                {deals.length > 0 
                  ? `${deals.length} deal${deals.length !== 1 ? 's' : ''} available in ${category.name}`
                  : `No deals currently available in ${category.name}`
                }
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          {deals.length > 0 ? (
            <ProductGrid products={deals} />
          ) : (
            <EmptyState
              title={`No ${category.name} Deals Available`}
              description={`Check back soon for amazing deals in ${category.name}. You can also browse other categories.`}
              icon="search"
              action={{
                label: 'Browse All Categories',
                href: '/deals',
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
