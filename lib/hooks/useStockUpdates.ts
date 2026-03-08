'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { toast } from '@/components/shared/Toast';

interface StockUpdate {
  productId: string;
  stock: number;
  previousStock?: number;
  timestamp: string;
  sku?: string;
  name?: string;
  alert?: boolean;
}

interface UseStockUpdatesOptions {
  productIds?: string[];
  onStockUpdate?: (update: StockUpdate) => void;
  onLowStock?: (update: StockUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
  showAlerts?: boolean;
}

export function useStockUpdates({
  productIds = [],
  onStockUpdate,
  onLowStock,
  onConnectionChange,
  showAlerts = true,
}: UseStockUpdatesOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useNetworkStatus();
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const clientId = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const connect = useCallback(() => {
    if (!isOnline) {
      setIsConnected(false);
      onConnectionChange?.(false);
      return;
    }

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Build URL with product IDs and client ID
      const url = new URL('/api/shop/stock-updates', window.location.origin);
      if (productIds.length > 0) {
        url.searchParams.set('productIds', productIds.join(','));
      }
      url.searchParams.set('clientId', clientId.current);

      const eventSource = new EventSource(url.toString(), {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        onConnectionChange?.(true);
        console.log('Stock updates connected');
      };

      eventSource.onerror = (event) => {
        console.error('Stock updates error:', event);
        setIsConnected(false);
        onConnectionChange?.(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError(new Error('Max reconnection attempts reached'));
          toast.error('Stock updates disconnected', {
            description: 'Please refresh the page to reconnect.',
          });
        }
      };

      // Handle initial stock data
      eventSource.addEventListener('initial', (event) => {
        const data = JSON.parse(event.data);
        const initialStock: Record<string, number> = {};
        
        data.products?.forEach((product: any) => {
          initialStock[product.productId] = product.stock;
        });
        
        setStockData(initialStock);
        setLastUpdate(new Date(data.timestamp));
      });

      // Handle real-time stock updates
      eventSource.addEventListener('stock-update', (event) => {
        const update: StockUpdate = JSON.parse(event.data);
        
        setStockData(prev => ({
          ...prev,
          [update.productId]: update.stock,
        }));
        
        setLastUpdate(new Date(update.timestamp));
        
        onStockUpdate?.(update);

        // Show toast for significant stock changes
        if (showAlerts && update.previousStock) {
          const change = update.stock - update.previousStock;
          if (Math.abs(change) >= 5) {
            toast.info(
              change > 0 
                ? `Stock increased for ${update.name || 'product'}`
                : `Stock decreased for ${update.name || 'product'}`,
              {
                description: `${Math.abs(change)} units ${change > 0 ? 'added' : 'sold'}`,
              }
            );
          }
        }
      });

      // Handle low stock alerts
      eventSource.addEventListener('low-stock-alert', (event) => {
        const update: StockUpdate = JSON.parse(event.data);
        
        onLowStock?.(update);

        if (showAlerts) {
          toast.warning(`Low stock alert: ${update.name || 'Product'}`, {
            description: `Only ${update.stock} units remaining`,
            duration: 10000,
          });
        }
      });

      // Handle heartbeat
      eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        setLastUpdate(new Date(data.timestamp));
      });

      // Handle server shutdown
      eventSource.addEventListener('shutdown', (event) => {
        const data = JSON.parse(event.data);
        setIsConnected(false);
        onConnectionChange?.(false);
        
        if (data.reconnect) {
          setTimeout(() => connect(), 5000);
        }

        toast.info('Stock updates temporarily unavailable', {
          description: data.message || 'Reconnecting...',
        });
      });

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('Failed to connect to stock updates:', error);
      setError(error as Error);
      setIsConnected(false);
      onConnectionChange?.(false);
    }
  }, [isOnline, productIds, onStockUpdate, onLowStock, onConnectionChange, showAlerts]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  // Reconnect when coming online
  useEffect(() => {
    if (isOnline && !isConnected) {
      connect();
    }
  }, [isOnline, isConnected, connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  // Get stock for a specific product
  const getStock = useCallback((productId: string) => {
    return stockData[productId];
  }, [stockData]);

  // Check if product is in stock
  const isInStock = useCallback((productId: string) => {
    const stock = stockData[productId];
    return stock !== undefined ? stock > 0 : true;
  }, [stockData]);

  // Check if product is low stock
  const isLowStock = useCallback((productId: string, threshold: number = 10) => {
    const stock = stockData[productId];
    return stock !== undefined ? stock < threshold : false;
  }, [stockData]);

  return {
    isConnected,
    lastUpdate,
    error,
    stockData,
    reconnect,
    getStock,
    isInStock,
    isLowStock,
  };
}
