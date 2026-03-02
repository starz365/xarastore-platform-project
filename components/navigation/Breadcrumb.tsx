'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  homeHref?: string;
  showHomeIcon?: boolean;
  className?: string;
  separator?: React.ReactNode;
  maxItems?: number;
  collapseAfter?: boolean;
}

export function Breadcrumb({
  items,
  homeHref = '/',
  showHomeIcon = true,
  className,
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  maxItems = 4,
  collapseAfter = true,
}: BreadcrumbProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Generate breadcrumb items from pathname if not provided
  const generateItemsFromPath = React.useMemo(() => {
    if (items) return items;

    if (!pathname || pathname === '/') {
      return [{ label: 'Home', href: '/' }];
    }

    const paths = pathname.split('/').filter(Boolean);
    const generatedItems: BreadcrumbItem[] = [];

    // Build cumulative path
    let cumulativePath = '';
    generatedItems.push({ label: 'Home', href: '/' });

    paths.forEach((path, index) => {
      cumulativePath += `/${path}`;
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      generatedItems.push({
        label,
        href: cumulativePath,
      });
    });

    return generatedItems;
  }, [pathname, items]);

  const breadcrumbItems = generateItemsFromPath;

  // Handle collapsing if there are too many items
  const visibleItems = React.useMemo(() => {
    if (!collapseAfter || breadcrumbItems.length <= maxItems) {
      return breadcrumbItems;
    }

    const first = breadcrumbItems[0];
    const last = breadcrumbItems[breadcrumbItems.length - 1];
    const middle = breadcrumbItems.slice(1, -1);
    const visibleMiddle = middle.slice(-(maxItems - 2));

    return [first, { label: '...', href: '#' }, ...visibleMiddle, last];
  }, [breadcrumbItems, maxItems, collapseAfter]);

  // Don't render if no items
  if (breadcrumbItems.length === 0) return null;

  // Show skeleton during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </nav>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-2 text-sm', className)}
    >
      <ol className="flex items-center space-x-2 flex-wrap">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1;
          const isCollapsed = item.label === '...';

          return (
            <React.Fragment key={item.href + index}>
              <li className="flex items-center">
                {index === 0 && showHomeIcon && !isCollapsed ? (
                  <Link
                    href={item.href}
                    className="flex items-center text-gray-500 hover:text-red-600 transition-colors"
                    aria-label="Home"
                  >
                    {item.icon || <Home className="w-4 h-4" />}
                  </Link>
                ) : isCollapsed ? (
                  <span className="text-gray-400 px-1">...</span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'hover:text-red-600 transition-colors',
                      isLast
                        ? 'text-gray-900 font-medium pointer-events-none'
                        : 'text-gray-500'
                    )}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li className="flex items-center text-gray-400" aria-hidden="true">
                  {separator}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.label,
              item: `${process.env.NEXT_PUBLIC_APP_URL || ''}${item.href}`,
            })),
          }),
        }}
      />
    </nav>
  );
}

// Helper component for dynamic breadcrumbs with loading state
interface DynamicBreadcrumbProps {
  items?: BreadcrumbItem[];
  isLoading?: boolean;
  error?: Error | null;
  fallback?: React.ReactNode;
}

export function DynamicBreadcrumb({
  items,
  isLoading,
  error,
  fallback,
}: DynamicBreadcrumbProps) {
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  if (error || !items) {
    return fallback ? <>{fallback}</> : null;
  }

  return <Breadcrumb items={items} />;
}

// Predefined breadcrumb configurations for common pages
export const breadcrumbPresets = {
  home: () => [{ label: 'Home', href: '/' }],

  shop: () => [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
  ],

  product: (productName: string, productSlug: string) => [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: productName, href: `/products/${productSlug}` },
  ],

  category: (categoryName: string, categorySlug: string) => [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: categoryName, href: `/categories/${categorySlug}` },
  ],

  collection: (collectionName: string, collectionSlug: string) => [
    { label: 'Home', href: '/' },
    { label: 'Collections', href: '/collections' },
    { label: collectionName, href: `/collections/${collectionSlug}` },
  ],

  account: (page: string) => [
    { label: 'Home', href: '/' },
    { label: 'My Account', href: '/account' },
    { label: page, href: '#' },
  ],

  checkout: () => [
    { label: 'Home', href: '/' },
    { label: 'Cart', href: '/cart' },
    { label: 'Checkout', href: '/checkout' },
  ],

  search: (query: string) => [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' },
    { label: `"${query}"`, href: '#' },
  ],
};

// Higher-order component for breadcrumb-enabled pages
export function withBreadcrumb<P extends object>(
  Component: React.ComponentType<P>,
  getBreadcrumbItems: (props: P) => BreadcrumbItem[]
) {
  return function WithBreadcrumb(props: P) {
    const items = getBreadcrumbItems(props);

    return (
      <>
        <div className="container-responsive py-4">
          <Breadcrumb items={items} />
        </div>
        <Component {...props} />
      </>
    );
  };
}

// Hook for using breadcrumbs in client components
export function useBreadcrumb(items?: BreadcrumbItem[]) {
  const pathname = usePathname();

  const generateBreadcrumb = React.useCallback((): BreadcrumbItem[] => {
    if (items) return items;

    if (!pathname || pathname === '/') {
      return [{ label: 'Home', href: '/' }];
    }

    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    let cumulativePath = '';
    paths.forEach((path) => {
      cumulativePath += `/${path}`;
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label,
        href: cumulativePath,
      });
    });

    return breadcrumbs;
  }, [pathname, items]);

  return generateBreadcrumb();
}

// Compact breadcrumb variant for mobile
export function CompactBreadcrumb({ items, homeHref = '/' }: BreadcrumbProps) {
  const breadcrumbs = useBreadcrumb(items);

  if (breadcrumbs.length <= 1) return null;

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const parentPage = breadcrumbs[breadcrumbs.length - 2];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      <Link
        href={parentPage?.href || homeHref}
        className="flex items-center text-gray-500 hover:text-red-600 transition-colors"
      >
        <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
        <span>Back to {parentPage?.label || 'Home'}</span>
      </Link>
      <span className="text-gray-300" aria-hidden="true">|</span>
      <span className="text-gray-900 font-medium">{currentPage.label}</span>
    </nav>
  );
}
