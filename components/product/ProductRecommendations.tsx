'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Star, Zap, RefreshCw } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { supabase } from '@/lib/supabase/client';

interface ProductRecommendationsProps {
  productId: string;
  productCategory: string;
  productTags?: string[];
  maxItems?: number;
  recommendationType?: 'similar' | 'frequently_bought' | 'trending' | 'personalized';
  userId?: string;
  className?: string;
}

export function ProductRecommendations({
  productId,
  productCategory,
  productTags = [],
  maxItems = 8,
  recommendationType = 'similar',
  userId,
  className,
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState(recommendationType);

  useEffect(() => {
    fetchRecommendations();
  }, [productId, activeType, userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .neq('id', productId)
        .gt('stock', 0)
        .limit(maxItems);

      switch (activeType) {
        case 'similar':
          // Similar products in same category
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('name', productCategory)
            .single();

          if (category) {
            query = query.eq('category_id', category.id);
          }
          query = query.order('rating', { ascending: false });
          break;

        case 'frequently_bought':
          // Frequently bought together (simulated)
          query = query.order('created_at', { ascending: false });
          // In production, you'd query order data
          break;

        case 'trending':
          // Trending products
          query = query.order('view_count', { ascending: false });
          break;

        case 'personalized':
          // Personalized recommendations
          if (userId) {
            // In production, use ML recommendations
            query = query.order('created_at', { ascending: false });
          } else {
            // Fallback to trending
            query = query.order('view_count', { ascending: false });
          }
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformed = (data || []).map(item => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        originalPrice: item.original_price ? parseFloat(item.original_price) : undefined,
        sku: item.sku,
        brand: {
          id: item.brand.id,
          slug: item.brand.slug,
          name: item.brand.name,
          logo: item.brand.logo,
          productCount: item.brand.product_count,
        },
        category: {
          id: item.category.id,
          slug: item.category.slug,
          name: item.category.name,
          productCount: item.category.product_count,
        },
        images: item.images || [],
        variants: item.variants?.map((v: any) => ({
          id: v.id,
          name: v.name,
          price: parseFloat(v.price),
          originalPrice: v.original_price ? parseFloat(v.original_price) : undefined,
          sku: v.sku,
          stock: v.stock,
          attributes: v.attributes || {},
        })) || [],
        specifications: item.specifications || {},
        rating: parseFloat(item.rating) || 0,
        reviewCount: item.review_count || 0,
        stock: item.stock,
        isFeatured: item.is_featured,
        isDeal: item.is_deal,
        dealEndsAt: item.deal_ends_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setRecommendations(transformed);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const recommendationTypes = [
    {
      id: 'similar',
      label: 'Similar Products',
      icon: RefreshCw,
      description: 'Products in the same category',
    },
    {
      id: 'frequently_bought',
      label: 'Frequently Bought Together',
      icon: Zap,
      description: 'Customers also bought',
    },
    {
      id: 'trending',
      label: 'Trending Now',
      icon: TrendingUp,
      description: 'Popular products',
    },
    {
      id: 'personalized',
      label: 'Recommended For You',
      icon: Star,
      description: 'Based on your interests',
    },
  ];

  const getRecommendationTitle = () => {
    const type = recommendationTypes.find(t => t.id === activeType);
    return type?.label || 'Recommended Products';
  };

  const getRecommendationDescription = () => {
    const type = recommendationTypes.find(t => t.id === activeType);
    return type?.description || 'Products you might like';
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getRecommendationTitle()}
            </h2>
            <p className="text-gray-600 mt-1">
              {getRecommendationDescription()}
            </p>
          </div>

          {/* Type Selector */}
          <div className="flex flex-wrap gap-2">
            {recommendationTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeType === type.id
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {recommendations.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showTimer={product.isDeal}
          />
        ))}
      </div>

      {/* Special Offers for Frequently Bought */}
      {activeType === 'frequently_bought' && recommendations.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2">Bundle & Save</h3>
              <p className="opacity-90">
                Buy these items together and save up to 25%
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-3xl font-bold">KES 45,999</div>
                <div className="text-red-200 line-through">KES 59,999</div>
              </div>
              <button className="px-6 py-3 bg-white text-red-600 font-bold rounded-lg hover:bg-gray-100 transition-colors">
                Add Bundle to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View More */}
      {recommendations.length >= maxItems && (
        <div className="text-center mt-8">
          <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            View More Recommendations
          </button>
        </div>
      )}
    </div>
  );
}

// AI-powered recommendation engine (simplified)
class RecommendationEngine {
  private static instance: RecommendationEngine;

  static getInstance() {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  async getPersonalizedRecommendations(
    userId: string,
    productId: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      // In production, this would:
      // 1. Query user's browsing history
      // 2. Analyze purchase patterns
      // 3. Use collaborative filtering
      // 4. Consider item-item similarity

      // Simulated AI recommendations
      const { data: similar } = await supabase
        .rpc('get_similar_products', {
          product_id: productId,
          limit_count: limit,
        });

      const { data: popular } = await supabase
        .from('products')
        .select('id')
        .order('view_count', { ascending: false })
        .limit(limit);

      // Combine and deduplicate
      const allIds = [
        ...(similar || []).map((p: any) => p.id),
        ...(popular || []).map((p: any) => p.id),
      ];

      const uniqueIds = Array.from(new Set(allIds));
      
      return uniqueIds.slice(0, limit);
    } catch (error) {
      console.error('Recommendation engine error:', error);
      return [];
    }
  }

  async updateUserPreferences(userId: string, productId: string, action: 'view' | 'purchase' | 'wishlist') {
    try {
      // In production, update user's preference matrix
      // This feeds into the ML model
      
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        product_id: productId,
        action,
        weight: action === 'purchase' ? 3 : action === 'wishlist' ? 2 : 1,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  }
}

export const recommendationEngine = RecommendationEngine.getInstance();
