'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { settingsManager } from '@/lib/utils/settings';

interface CurrencyContextType {
  code: string;
  symbol: string;
  locale: string;
  format: (amount: number, options?: Intl.NumberFormatOptions) => string;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_CURRENCY = {
  code: 'KES',
  symbol: 'KES',
  locale: 'en-KE',
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCurrencySettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const settings = await settingsManager.getCurrencySettings();
      setCurrency(settings);
    } catch (error) {
      console.error('Failed to load currency settings:', error);
      setError(error instanceof Error ? error : new Error('Failed to load currency settings'));
      // Keep default currency on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const formatCurrency = useCallback((amount: number, options?: Intl.NumberFormatOptions): string => {
    try {
      // Ensure amount is a valid number
      const validAmount = isNaN(amount) ? 0 : amount;
      
      return new Intl.NumberFormat(currency.locale, {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options,
      }).format(validAmount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      // Fallback formatting
      const validAmount = isNaN(amount) ? 0 : amount;
      return `${currency.symbol} ${validAmount.toFixed(0)}`;
    }
  }, [currency]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...currency,
    format: formatCurrency,
    isLoading,
    error,
    refresh: loadCurrencySettings
  }), [currency, formatCurrency, isLoading, error, loadCurrencySettings]);

  useEffect(() => {
    loadCurrencySettings();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadCurrencySettings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadCurrencySettings]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
