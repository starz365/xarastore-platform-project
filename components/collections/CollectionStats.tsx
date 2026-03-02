'use client';

import { motion } from 'framer-motion';
import { Package, TrendingUp, Clock, Sparkles, DollarSign, Users, ShoppingBag, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
}

interface CollectionStatsProps {
  stats: StatItem[];
  title?: string;
  className?: string;
  columns?: 2 | 3 | 4;
  showTrends?: boolean;
}

const colorClasses = {
  red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function CollectionStats({
  stats,
  title,
  className,
  columns = 4,
  showTrends = true,
}: CollectionStatsProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}

      <div className={cn('grid gap-4', gridCols[columns])}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {typeof stat.value === 'number' 
                        ? stat.label.toLowerCase().includes('price') || stat.label.toLowerCase().includes('revenue')
                          ? formatCurrency(stat.value)
                          : formatNumber(stat.value)
                        : stat.value
                      }
                    </p>
                    
                    {showTrends && stat.trend !== undefined && (
                      <div className="flex items-center space-x-1">
                        <TrendingUp 
                          className={cn(
                            'w-4 h-4',
                            stat.trend > 0 ? 'text-green-500' : 'text-red-500'
                          )} 
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            stat.trend > 0 ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {stat.trend > 0 ? '+' : ''}{stat.trend}%
                        </span>
                        <span className="text-xs text-gray-500">vs last month</span>
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      colorClasses[stat.color || 'red']
                    )}
                  >
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Predefined stat configurations for common use cases
export const collectionStatPresets = {
  overview: (collections: any[]) => [
    {
      label: 'Total Collections',
      value: collections.length,
      icon: <Package className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      label: 'Total Products',
      value: collections.reduce((sum, c) => sum + (c.productCount || 0), 0),
      icon: <ShoppingBag className="w-5 h-5" />,
      color: 'green' as const,
    },
    {
      label: 'Active Types',
      value: new Set(collections.map(c => c.type).filter(Boolean)).size,
      icon: <Sparkles className="w-5 h-5" />,
      color: 'yellow' as const,
    },
    {
      label: 'Avg. Collection Size',
      value: Math.round(
        collections.reduce((sum, c) => sum + (c.productCount || 0), 0) / 
        (collections.length || 1)
      ),
      icon: <Users className="w-5 h-5" />,
      color: 'purple' as const,
    },
  ],

  performance: (collections: any[]) => [
    {
      label: 'Most Products',
      value: Math.max(...collections.map(c => c.productCount || 0)),
      icon: <Star className="w-5 h-5" />,
      color: 'red' as const,
    },
    {
      label: 'Total Views',
      value: collections.reduce((sum, c) => sum + (c.viewCount || 0), 0),
      icon: <Users className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      label: 'Conversion Rate',
      value: '12.5%',
      icon: <TrendingUp className="w-5 h-5" />,
      trend: 2.3,
      color: 'green' as const,
    },
    {
      label: 'Avg. Revenue',
      value: 12500,
      icon: <DollarSign className="w-5 h-5" />,
      trend: 5.2,
      color: 'yellow' as const,
    },
  ],

  timeline: (collections: any[]) => [
    {
      label: 'New This Month',
      value: collections.filter(c => {
        const created = new Date(c.createdAt);
        const now = new Date();
        return created.getMonth() === now.getMonth() && 
               created.getFullYear() === now.getFullYear();
      }).length,
      icon: <Clock className="w-5 h-5" />,
      color: 'green' as const,
    },
    {
      label: 'Last Month',
      value: collections.filter(c => {
        const created = new Date(c.createdAt);
        const now = new Date();
        const lastMonth = new Date(now.setMonth(now.getMonth() - 1));
        return created.getMonth() === lastMonth.getMonth() && 
               created.getFullYear() === lastMonth.getFullYear();
      }).length,
      icon: <Clock className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      label: 'Growth',
      value: '+15%',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'purple' as const,
    },
  ],
};
