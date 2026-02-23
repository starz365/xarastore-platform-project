export const currencies = [
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES', decimalDigits: 2, locale: 'en-KE' },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalDigits: 2, locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalDigits: 2, locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalDigits: 2, locale: 'en-GB' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalDigits: 0, locale: 'ja-JP' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalDigits: 2, locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalDigits: 2, locale: 'en-CA' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalDigits: 2, locale: 'de-CH' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalDigits: 2, locale: 'zh-CN' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalDigits: 2, locale: 'en-IN' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalDigits: 2, locale: 'en-ZA' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimalDigits: 2, locale: 'en-NG' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimalDigits: 2, locale: 'en-GH' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', decimalDigits: 0, locale: 'en-UG' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS', decimalDigits: 0, locale: 'sw-TZ' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF', decimalDigits: 0, locale: 'rw-RW' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', decimalDigits: 2, locale: 'am-ET' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimalDigits: 2, locale: 'ar-AE' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', decimalDigits: 2, locale: 'ar-SA' },
] as const;

export type CurrencyCode = typeof currencies[number]['code'];

export const currencyMap = currencies.reduce((acc, currency) => {
  acc[currency.code] = currency;
  return acc;
}, {} as Record<CurrencyCode, typeof currencies[number]>);

export const defaultCurrency = currencyMap.KES;

export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'KES', locale?: string): string {
  const currency = currencyMap[currencyCode];
  const formatter = new Intl.NumberFormat(locale || currency.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  });
  
  return formatter.format(amount);
}

export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  exchangeRates: Record<string, number>
): number {
  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;
  
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}
