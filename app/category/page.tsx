import { Suspense } from 'react';
import { getCategories } from '@/lib/supabase/queries/categories';
import { CategoryGrid } from '@/components/category/CategoryGrid';
import { CategoryGridSkeleton } from '@/components/category/CategoryGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { Search } from 'lucide-react';

export const metadata = {
  title: 'Shop by Category | Xarastore',
  description: 'Browse all product categories at Xarastore. Find electronics, fashion, home goods, beauty products, and more.',
};

export default async function CategoryPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white">
        <div className="container-responsive py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Shop by Category
            </h1>
            <p className="text-xl opacity-90">
              Discover amazing products across all categories. Find exactly what you're looking for.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-8">
        {categories.length > 0 ? (
          <Suspense fallback={<CategoryGridSkeleton />}>
            <CategoryGrid categories={categories} />
          </Suspense>
        ) : (
          <EmptyState
            title="No Categories Yet"
            description="Product categories will appear here once they're added to the store."
            icon="search"
            action={{
              label: 'Browse All Products',
              href: '/shop',
            }}
          />
        )}
      </div>
    </div>
  );
}
