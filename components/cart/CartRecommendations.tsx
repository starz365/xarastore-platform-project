'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Skeleton } from '@/components/ui/Skeleton';

export function CartRecommendations() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true);
      // In production, this would fetch based on cart items
      const response = await fetch('/api/products/recommendations?context=cart');
      const data = await response.json();
      setRecommendations(data.products || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (recommendations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-red-600" />
        <h3 className="font-semibold text-gray-900">Frequently bought together</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {recommendations.slice(0, 4).map((product) => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                {product.images[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <h4 className="font-medium text-sm line-clamp-2 mb-2">
                {product.name}
              </h4>
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-600">
                  KES {product.price.toLocaleString()}
                </span>
                <button className="text-sm font-medium text-red-600 hover:text-red-700">
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
