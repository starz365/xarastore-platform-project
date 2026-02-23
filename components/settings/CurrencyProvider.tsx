'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { settingsManager } from '@/lib/utils/settings';

interface CurrencyContextType {
  code: string;
  symbol: string;
  locale: string;
  format: (amount: number, options?: Intl.NumberFormatOptions) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState({
    code: 'KES',
    symbol: 'KES',
    locale: 'en-KE',
  });
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      ...options,
    }).format(amount);
  };

  const loadCurrencySettings = async () => {
    try {
      setIsLoading(true);
      const settings = await settingsManager.getCurrencySettings();
      setCurrency(settings);
    } catch (error) {
      console.error('Failed to load currency settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencySettings();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadCurrencySettings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <CurrencyContext.Provider value={{ ...currency, format: formatCurrency, isLoading }}>
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
