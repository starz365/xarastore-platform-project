'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  TrendingDown,
  Package,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils/css';
import { useStockUpdates } from '@/lib/hooks/useStockUpdates';
import { Tooltip } from './Tooltip';

interface StockIndicatorProps {
  productId: string;
  initialStock: number;
  lowStockThreshold?: number;
  showLabel?: boolean;
  showIcon?: boolean;
  showCount?: boolean;
  className?: string;
  variant?: 'default' | 'badge' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  onStockChange?: (stock: number) => void;
}

export function StockIndicator({
  productId,
  initialStock,
  lowStockThreshold = 10,
  showLabel = true,
  showIcon = true,
  showCount = true,
  className = '',
  variant = 'default',
  size = 'md',
  onStockChange,
}: StockIndicatorProps) {
  const [currentStock, setCurrentStock] = useState(initialStock);
  const [isLowStock, setIsLowStock] = useState(initialStock < lowStockThreshold);
  const [isOutOfStock, setIsOutOfStock] = useState(initialStock === 0);
  const [previousStock, setPreviousStock] = useState(initialStock);

  const { getStock, isConnected } = useStockUpdates({
    productIds: [productId],
    onStockUpdate: (update) => {
      if (update.productId === productId) {
        setPreviousStock(currentStock);
        setCurrentStock(update.stock);
        setIsLowStock(update.stock < lowStockThreshold);
        setIsOutOfStock(update.stock === 0);
        onStockChange?.(update.stock);
      }
    },
  });

  // Sync with real-time stock data
  useEffect(() => {
    const realTimeStock = getStock(productId);
    if (realTimeStock !== undefined && realTimeStock !== currentStock) {
      setPreviousStock(currentStock);
      setCurrentStock(realTimeStock);
      setIsLowStock(realTimeStock < lowStockThreshold);
      setIsOutOfStock(realTimeStock === 0);
      onStockChange?.(realTimeStock);
    }
  }, [getStock, productId, currentStock, lowStockThreshold, onStockChange]);

  const getStockStatus = () => {
    if (isOutOfStock) return 'out';
    if (isLowStock) return 'low';
    return 'in';
  };

  const getStatusConfig = () => {
    const status = getStockStatus();
    
    switch (status) {
      case 'out':
        return {
          icon: XCircle,
          label: 'Out of Stock',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
        };
      case 'low':
        return {
          icon: AlertTriangle,
          label: 'Low Stock',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
        };
      default:
        return {
          icon: CheckCircle,
          label: 'In Stock',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          text: 'text-xs',
        };
      case 'lg':
        return {
          container: 'px-4 py-2.5 text-base',
          icon: 'w-5 h-5',
          text: 'text-base',
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'w-4 h-4',
          text: 'text-sm',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === 'badge') {
    return (
      <Tooltip content={`${config.label}${showCount ? ` - ${currentStock} units` : ''}`}>
        <span
          className={cn(
            'inline-flex items-center rounded-full font-medium',
            config.bgColor,
            config.color,
            sizeClasses.container,
            className
          )}
        >
          {showIcon && <Icon className={cn('mr-1', sizeClasses.icon)} />}
          {showLabel && config.label}
          {showCount && currentStock > 0 && !isOutOfStock && (
            <span className="ml-1 font-bold">({currentStock})</span>
          )}
          {!isConnected && (
            <Clock className={cn('ml-1', sizeClasses.icon)} />
          )}
        </span>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {showIcon && <Icon className={cn(config.iconColor, sizeClasses.icon)} />}
        {showLabel && (
          <span className={cn('font-medium', config.color, sizeClasses.text)}>
            {config.label}
          </span>
        )}
        {showCount && currentStock > 0 && !isOutOfStock && (
          <span className={cn('text-gray-600', sizeClasses.text)}>
            ({currentStock} available)
          </span>
        )}
        {!isConnected && (
          <Tooltip content="Stock updates may be delayed">
            <Clock className={cn('text-gray-400', sizeClasses.icon)} />
          </Tooltip>
        )}
        {!isOutOfStock && currentStock > 0 && currentStock <= 5 && (
          <Tooltip content={`Only ${currentStock} left! Order soon`}>
            <Zap className="text-orange-500 w-4 h-4" />
          </Tooltip>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-center space-x-3">
        {showIcon && <Icon className={cn(config.iconColor, sizeClasses.icon)} />}
        <div>
          <p className={cn('font-medium', config.color, sizeClasses.text)}>
            {config.label}
          </p>
          {showCount && currentStock > 0 && !isOutOfStock && (
            <p className="text-xs text-gray-600 mt-0.5">
              {currentStock} units available
            </p>
          )}
        </div>
      </div>
      
      {!isOutOfStock && currentStock > 0 && (
        <div className="text-right">
          {previousStock !== currentStock && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <TrendingDown className="w-3 h-3" />
              <span>Updated</span>
            </div>
          )}
          {!isConnected && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
              <Clock className="w-3 h-3" />
              <span>Offline</span>
            </div>
          )}
        </div>
      )}

      {isOutOfStock && (
        <div className="text-right">
          <span className="text-xs text-red-600">Sold out</span>
        </div>
      )}
    </div>
  );
}

// Bulk stock indicator for multiple products
interface BulkStockIndicatorProps {
  productIds: string[];
  initialStocks: Record<string, number>;
  className?: string;
}

export function BulkStockIndicator({
  productIds,
  initialStocks,
  className,
}: BulkStockIndicatorProps) {
  const { stockData, isConnected } = useStockUpdates({ productIds });

  const totalProducts = productIds.length;
  const inStock = productIds.filter(id => 
    (stockData[id] ?? initialStocks[id]) > 0
  ).length;
  const lowStock = productIds.filter(id => 
    (stockData[id] ?? initialStocks[id]) > 0 && 
    (stockData[id] ?? initialStocks[id]) < 10
  ).length;
  const outOfStock = totalProducts - inStock;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Stock Summary</span>
        </div>
        {!isConnected && (
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>Offline</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-xs text-green-600">In Stock</p>
          <p className="text-lg font-bold text-green-700">{inStock}</p>
        </div>
        <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-center">
          <p className="text-xs text-orange-600">Low Stock</p>
          <p className="text-lg font-bold text-orange-700">{lowStock}</p>
        </div>
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-xs text-red-600">Out of Stock</p>
          <p className="text-lg font-bold text-red-700">{outOfStock}</p>
        </div>
      </div>
    </div>
  );
}
