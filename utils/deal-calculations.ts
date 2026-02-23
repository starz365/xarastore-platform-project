import { Product } from '@/types';

export function calculateDiscountPercentage(product: Product): number {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }
  
  const discount = ((product.originalPrice - product.price) / product.originalPrice) * 100;
  return Math.round(discount);
}

export function calculateSavingsAmount(product: Product): number {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }
  
  return product.originalPrice - product.price;
}

export function isDealActive(product: Product): boolean {
  if (!product.isDeal) return false;
  
  if (!product.dealEndsAt) return true;
  
  const now = new Date();
  const endsAt = new Date(product.dealEndsAt);
  return endsAt > now;
}

export function getTimeRemaining(endTime: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const now = new Date();
  const end = new Date(endTime);
  const difference = end.getTime() - now.getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    expired: false,
  };
}

export function formatTimeRemaining(endTime: string): string {
  const time = getTimeRemaining(endTime);
  
  if (time.expired) return 'Expired';
  
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h`;
  }
  
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`;
  }
  
  if (time.minutes > 0) {
    return `${time.minutes}m ${time.seconds}s`;
  }
  
  return `${time.seconds}s`;
}

export function sortDeals(
  deals: Product[],
  sortBy: 'newest' | 'price-low' | 'price-high' | 'rating' | 'discount'
): Product[] {
  const sorted = [...deals];
  
  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'discount':
      return sorted.sort((a, b) => {
        const discountA = calculateDiscountPercentage(a);
        const discountB = calculateDiscountPercentage(b);
        return discountB - discountA;
      });
    case 'newest':
    default:
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export function filterDeals(
  deals: Product[],
  filters: {
    minPrice?: number;
    maxPrice?: number;
    categories?: string[];
    minRating?: number;
  }
): Product[] {
  return deals.filter((deal) => {
    // Price filter
    if (filters.minPrice !== undefined && deal.price < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && deal.price > filters.maxPrice) {
      return false;
    }
    
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(deal.category.slug)) {
        return false;
      }
    }
    
    // Rating filter
    if (filters.minRating !== undefined && deal.rating < filters.minRating) {
      return false;
    }
    
    return true;
  });
}
