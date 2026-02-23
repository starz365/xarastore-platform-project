import { useQuery } from '@tanstack/react-query';
import { Product } from '@/types';

export function useDeals(options?: {
  limit?: number;
  category?: string;
  sortBy?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['deals', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.category) params.set('category', options.category);
      if (options?.sortBy) params.set('sort', options.sortBy);

      const response = await fetch(`/api/deals?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch deals');
      return response.json() as Promise<Product[]>;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useFlashDeals() {
  return useQuery({
    queryKey: ['deals', 'flash'],
    queryFn: async () => {
      const response = await fetch('/api/deals/flash');
      if (!response.ok) throw new Error('Failed to fetch flash deals');
      return response.json() as Promise<Product[]>;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute for flash deals
  });
}

export function useTodaysDeals() {
  return useQuery({
    queryKey: ['deals', 'today'],
    queryFn: async () => {
      const response = await fetch('/api/deals/today');
      if (!response.ok) throw new Error('Failed to fetch today\'s deals');
      return response.json() as Promise<Product[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}
