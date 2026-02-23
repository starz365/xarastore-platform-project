import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ChevronRight, Filter, Grid, List, SortAsc } from 'lucide-react';
import { getCategoryBySlug, getProductsByCategory, getSubcategories } from '@/lib/supabase/queries/categories';
import { ProductGrid } from '@/components/product/ProductGrid';
import { CategoryFilters } from '@/components/category/CategoryFilters';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(
  { params }: CategoryPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const categorySlug = slug[slug.length - 1];
  
  const category = await getCategoryBySlug(categorySlug);
  
  if (!category) {
    return {
      title: 'Category Not Found | Xarastore',
      description: 'Category not found',
    };
  }

  return {
    title: `${category.name} | Shop ${category.name} on Xarastore`,
    description: category.description || `Shop the best ${category.name.toLowerCase()} products on Xarastore. Find great deals and quality products.`,
    keywords: `${category.name}, ${category.name} products, buy ${category.name} online, ${category.name} deals`,
    openGraph: {
      title: `${category.name} | Xarastore`,
      description: category.description || `Shop ${category.name} on Xarastore`,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const searchParamsObj = await searchParams;
  const categorySlug = slug[slug.length - 1];
  
  const [category, subcategories] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getSubcategories(categorySlug),
  ]);

  if (!category) {
    notFound();
  }

  // Extract filters from search params
  const page = parseInt(searchParamsObj.page as string) || 1;
  const sortBy = (searchParamsObj.sort as string) || 'newest';
  const minPrice = searchParamsObj.minPrice ? parseInt(searchParamsObj.minPrice as string) : undefined;
  const maxPrice = searchParamsObj.maxPrice ? parseInt(searchParamsObj.maxPrice as string) : undefined;
  const brands = searchParamsObj.brand ? (Array.isArray(searchParamsObj.brand) ? searchParamsObj.brand : [searchParamsObj.brand]) : [];
  const attributes = Object.entries(searchParamsObj)
    .filter(([key]) => key.startsWith('attr_'))
    .reduce((acc, [key, value]) => {
      acc[key.replace('attr_', '')] = Array.isArray(value) ? value : [value];
      return acc;
    }, {} as Record<string, string[]>);

  const { products, total, totalPages } = await getProductsByCategory(
    category.id,
    {
      page,
      sortBy,
      minPrice,
      maxPrice,
      brandIds: brands,
      attributes,
    }
  );

  // Generate breadcrumb items
  const breadcrumbItems = [
    { name: 'Home', href: '/' },
    ...slug.map((slugPart, index) => ({
      name: slugPart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      href: `/category/${slug.slice(0, index + 1).join('/')}`,
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Category Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-responsive py-8">
          <Breadcrumb items={breadcrumbItems} />
          
          <div className="mt-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="text-gray-600 mt-2 max-w-3xl">{category.description}</p>
            )}
            <div className="flex items-center justify-between mt-4">
              <p className="text-gray-600">
                Showing <span className="font-semibold">{products.length}</span> of{' '}
                <span className="font-semibold">{total}</span> products
              </p>
              <div className="flex items-center space-x-4">
                <Button variant="secondary" size="sm">
                  <Grid className="w-4 h-4 mr-2" />
                  Grid
                </Button>
                <Button variant="secondary" size="sm">
                  <List className="w-4 h-4 mr-2" />
                  List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CategoryFilters
                category={category}
                subcategories={subcategories}
                currentFilters={{
                  minPrice,
                  maxPrice,
                  brands,
                  attributes,
                }}
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Sort and View Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Sort by:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'newest', label: 'Newest' },
                      { value: 'price-low', label: 'Price: Low to High' },
                      { value: 'price-high', label: 'Price: High to Low' },
                      { value: 'rating', label: 'Top Rated' },
                      { value: 'popular', label: 'Most Popular' },
                    ].map((option) => (
                      <a
                        key={option.value}
                        href={`?${new URLSearchParams({
                          ...searchParamsObj,
                          sort: option.value,
                        })}`}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          sortBy === option.value
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </a>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
              </div>
            </div>

            {/* Subcategories */}
            {subcategories.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Shop by Subcategory</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {subcategories.map((subcategory) => (
                    <a
                      key={subcategory.id}
                      href={`/category/${categorySlug}/${subcategory.slug}`}
                      className="group"
                    >
                      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:shadow-md transition-all">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                          {subcategory.image ? (
                            <img
                              src={subcategory.image}
                              alt={subcategory.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <span className="text-2xl">📁</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold group-hover:text-red-600 transition-colors">
                          {subcategory.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {subcategory.productCount} products
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid products={products} />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <a
                    href={`?${new URLSearchParams({
                      ...searchParamsObj,
                      page: (page - 1).toString(),
                    })}`}
                    className={`px-4 py-2 border rounded-lg ${
                      page === 1
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={page === 1}
                  >
                    Previous
                  </a>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <a
                        key={pageNum}
                        href={`?${new URLSearchParams({
                          ...searchParamsObj,
                          page: pageNum.toString(),
                        })}`}
                        className={`px-4 py-2 border rounded-lg ${
                          page === pageNum
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </a>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <a
                        href={`?${new URLSearchParams({
                          ...searchParamsObj,
                          page: totalPages.toString(),
                        })}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        {totalPages}
                      </a>
                    </>
                  )}
                  
                  <a
                    href={`?${new URLSearchParams({
                      ...searchParamsObj,
                      page: (page + 1).toString(),
                    })}`}
                    className={`px-4 py-2 border rounded-lg ${
                      page === totalPages
                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-disabled={page === totalPages}
                  >
                    Next
                  </a>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Description */}
      {category.longDescription && (
        <div className="bg-white border-t border-gray-200 py-12">
          <div className="container-responsive">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">About {category.name}</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-700 whitespace-pre-line">
                  {category.longDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}
