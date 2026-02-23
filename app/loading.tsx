import { Suspense } from 'react';
import { getRouteInfo, getRouteLoadingData } from '@/lib/utils/loading';
import { LoadingHeader } from '@/components/loading/LoadingHeader';
import { LoadingHero } from '@/components/loading/LoadingHero';
import { LoadingGrid } from '@/components/loading/LoadingGrid';
import { LoadingProductDetail } from '@/components/loading/LoadingProductDetail';
import { LoadingCheckout } from '@/components/loading/LoadingCheckout';
import { LoadingAccount } from '@/components/loading/LoadingAccount';
import { LoadingFooter } from '@/components/loading/LoadingFooter';
import { LoadingProgress } from '@/components/loading/LoadingProgress';

export default async function Loading() {
  const routeInfo = await getRouteInfo();
  const loadingData = await getRouteLoadingData(routeInfo);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingProgress routeInfo={routeInfo} />
      
      <LoadingHeader />
      
      <main className="flex-1">
        {routeInfo.isHomePage && <LoadingHero />}
        
        <Suspense fallback={<LoadingFallback routeInfo={routeInfo} />}>
          <LoadingContent 
            routeInfo={routeInfo} 
            loadingData={loadingData}
          />
        </Suspense>
      </main>
      
      <LoadingFooter />
    </div>
  );
}

async function LoadingContent({ 
  routeInfo, 
  loadingData 
}: { 
  routeInfo: any;
  loadingData: any;
}) {
  // Staged loading based on route type
  switch (routeInfo.type) {
    case 'home':
      return (
        <div className="container-responsive space-y-12 py-12">
          <LoadingHeroSection />
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
            <LoadingGrid count={8} />
          </div>
          <div className="animate-pulse animation-delay-300">
            <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
            <LoadingGrid count={8} />
          </div>
          <LoadingCategories />
        </div>
      );
    
    case 'product':
      return (
        <div className="container-responsive py-8">
          <LoadingProductDetail />
        </div>
      );
    
    case 'category':
      return (
        <div className="container-responsive py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-96 bg-gray-200 rounded mb-8" />
            <div className="flex space-x-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded" />
              ))}
            </div>
            <LoadingGrid count={12} />
          </div>
        </div>
      );
    
    case 'cart':
      return (
        <div className="container-responsive py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-64 bg-gray-200 rounded mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded" />
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      );
    
    case 'checkout':
      return (
        <div className="container-responsive py-8">
          <LoadingCheckout />
        </div>
      );
    
    case 'account':
      return (
        <div className="container-responsive py-8">
          <LoadingAccount />
        </div>
      );
    
    case 'search':
      return (
        <div className="container-responsive py-8">
          <div className="animate-pulse">
            <div className="h-12 w-full bg-gray-200 rounded mb-8" />
            <div className="flex space-x-4 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 w-32 bg-gray-200 rounded" />
              ))}
            </div>
            <LoadingGrid count={12} />
          </div>
        </div>
      );
    
    case 'deals':
      return (
        <div className="animate-pulse">
          <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 mb-12" />
          <div className="container-responsive py-8">
            <div className="flex items-center space-x-3 mb-8">
              <div className="h-10 w-10 bg-gray-200 rounded" />
              <div>
                <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>
            <LoadingGrid count={8} showTimer />
          </div>
        </div>
      );
    
    default:
      return (
        <div className="container-responsive py-12">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-96 bg-gray-200 rounded mb-8" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      );
  }
}

function LoadingFallback({ routeInfo }: { routeInfo: any }) {
  return (
    <div className="container-responsive py-12 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-4" />
      <p className="text-gray-600">{routeInfo.loadingMessage}</p>
      <p className="text-sm text-gray-500 mt-2">
        {routeInfo.loadingHint}
      </p>
    </div>
  );
}

function LoadingHeroSection() {
  return (
    <div className="animate-pulse">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="h-12 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-full" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="flex space-x-4">
            <div className="h-12 w-32 bg-gray-200 rounded" />
            <div className="h-12 w-32 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-64 md:h-96 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}

function LoadingCategories() {
  return (
    <div className="animate-pulse animation-delay-600">
      <div className="h-8 w-48 bg-gray-200 rounded mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-square bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
