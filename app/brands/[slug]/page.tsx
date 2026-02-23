import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Shield, CheckCircle, TrendingUp, Package, Clock } from 'lucide-react';
import { getBrandBySlug, getBrandProducts } from '@/lib/supabase/queries/brands';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductGridSkeleton';
import { EmptyState } from '@/components/product/EmptyState';
import { Button } from '@/components/ui/Button';

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return {
      title: 'Brand Not Found | Xarastore',
      description: 'Brand not found',
    };
  }

  return {
    title: `${brand.name} - Shop ${brand.name} Products | Xarastore`,
    description: brand.description || `Shop ${brand.name} products on Xarastore. Quality guaranteed with free delivery.`,
    openGraph: {
      images: brand.logo ? [brand.logo] : [],
    },
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  const searchParamsObj = await searchParams;
  const page = parseInt(searchParamsObj.page as string) || 1;

  if (!brand) {
    notFound();
  }

  const { products, total } = await getBrandProducts(brand.id, page, 24);
  const totalPages = Math.ceil(total / 24);

  const brandStats = [
    { label: 'Products', value: brand.productCount.toLocaleString(), icon: Package },
    { label: 'Avg Rating', value: '4.8/5', icon: Star },
    { label: 'Trust Score', value: '98%', icon: Shield },
    { label: 'On Xarastore', value: '2+ years', icon: Clock },
  ];

  const categories = [
    { name: 'Best Sellers', slug: 'best-sellers', count: 45 },
    { name: 'New Arrivals', slug: 'new-arrivals', count: 23 },
    { name: 'On Sale', slug: 'on-sale', count: 18 },
    { name: 'Premium', slug: 'premium', count: 32 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Brand Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-responsive py-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Brand Logo & Info */}
            <div className="flex items-center space-x-6">
              <div className="relative w-24 h-24 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <Image
                  src={brand.logo || '/brand-placeholder.png'}
                  alt={brand.name}
                  fill
                  className="object-contain p-4"
                  sizes="96px"
                />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {brand.name}
                </h1>
                <p className="text-gray-600 max-w-2xl">
                  {brand.description || 'Premium quality products with guaranteed satisfaction.'}
                </p>
              </div>
            </div>

            {/* Brand Stats */}
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {brandStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600">{stat.label}</span>
                      </div>
                      <div className="text-xl font-bold">{stat.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Benefits */}
      <div className="bg-gradient-to-r from-red-50 to-white border-y border-red-100">
        <div className="container-responsive py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Authentic Products</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Official Warranty</span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-purple-600" />
              <span>Free Delivery Over KES 2,000</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span>Best Price Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-responsive">
          <div className="flex overflow-x-auto py-4 space-x-6">
            <Link
              href={`/brands/${slug}`}
              className="flex-shrink-0 px-4 py-2 font-medium text-red-600 border-b-2 border-red-600"
            >
              All Products
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/brands/${slug}/${category.slug}`}
                className="flex-shrink-0 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                {category.name}
                <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded-full">
                  {category.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container-responsive py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              {brand.name} Products
            </h2>
            <p className="text-gray-600 mt-2">
              {total} products available
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm">
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest First</option>
              <option>Best Rating</option>
            </select>
          </div>
        </div>

        {products.length > 0 ? (
          <>
            <Suspense fallback={<ProductGridSkeleton count={12} />}>
              <ProductGrid products={products} />
            </Suspense>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-12">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  href={`/brands/${slug}?page=${page - 1}`}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'primary' : 'secondary'}
                        size="sm"
                        href={`/brands/${slug}?page=${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="text-gray-500">...</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        href={`/brands/${slug}?page=${totalPages}`}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  href={`/brands/${slug}?page=${page + 1}`}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No Products Available"
            description={`${brand.name} products are currently out of stock. Check back soon for new arrivals.`}
            icon="search"
            action={{
              label: 'Browse Other Brands',
              href: '/brands',
            }}
          />
        )}
      </div>

      {/* About Brand */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="container-responsive">
          <h2 className="text-2xl font-bold mb-6">About {brand.name}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                {brand.description || `${brand.name} is committed to delivering premium quality products with exceptional customer service. All products undergo strict quality checks and come with manufacturer warranties.`}
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Official authorized retailer</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Genuine products with warranty</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Fast delivery across Kenya</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>Dedicated customer support</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold mb-4">Brand Policies</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Warranty</h4>
                  <p className="text-sm text-gray-600">1-year manufacturer warranty on all products</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Returns</h4>
                  <p className="text-sm text-gray-600">30-day return policy for defective items</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Support</h4>
                  <p className="text-sm text-gray-600">Dedicated brand support available 24/7</p>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Shipping</h4>
                  <p className="text-sm text-gray-600">Free shipping on orders over KES 2,000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
