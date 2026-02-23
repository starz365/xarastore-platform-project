'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';

import { CurrencyProvider } from '@/components/settings/CurrencyProvider';
import { MaintenanceBanner } from '@/components/settings/MaintenanceBanner';
import { ToastProvider } from '@/components/shared/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          gcTime: 5 * 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/utils/offline').then(({ initOfflineDB }) => {
        initOfflineDB();
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
		<ToastProvider>
          <CurrencyProvider>
            <MaintenanceBanner />
            {children}
          </CurrencyProvider>
		</ToastProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
