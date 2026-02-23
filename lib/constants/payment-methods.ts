export const paymentMethods = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    description: 'Mobile money payment via M-Pesa',
    icon: 'mobile',
    currencies: ['KES'],
    countries: ['KE', 'TZ'],
    processingFee: 0,
    minAmount: 10,
    maxAmount: 150000,
    requiresPhone: true,
    supportsRecurring: false,
    isEnabled: true,
    sortOrder: 1,
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or American Express',
    icon: 'credit-card',
    currencies: ['KES', 'USD', 'EUR', 'GBP'],
    countries: ['KE', 'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES'],
    processingFee: 0.035,
    minAmount: 100,
    maxAmount: 1000000,
    requiresPhone: false,
    supportsRecurring: true,
    isEnabled: true,
    sortOrder: 2,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank transfer',
    icon: 'bank',
    currencies: ['KES', 'USD', 'EUR', 'GBP'],
    countries: ['KE', 'US', 'GB', 'DE', 'FR', 'IT', 'ES'],
    processingFee: 0,
    minAmount: 1000,
    maxAmount: 5000000,
    requiresPhone: false,
    supportsRecurring: false,
    isEnabled: true,
    sortOrder: 3,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: 'paypal',
    currencies: ['USD', 'EUR', 'GBP'],
    countries: ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'AU', 'CA'],
    processingFee: 0.029,
    minAmount: 1,
    maxAmount: 10000,
    requiresPhone: false,
    supportsRecurring: true,
    isEnabled: true,
    sortOrder: 4,
  },
  {
    id: 'cash_on_delivery',
    name: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: 'cash',
    currencies: ['KES'],
    countries: ['KE'],
    processingFee: 0,
    minAmount: 0,
    maxAmount: 50000,
    requiresPhone: true,
    supportsRecurring: false,
    isEnabled: true,
    sortOrder: 5,
  },
  {
    id: 'equitel',
    name: 'Equitel',
    description: 'Mobile money via Equitel',
    icon: 'mobile',
    currencies: ['KES'],
    countries: ['KE'],
    processingFee: 0,
    minAmount: 10,
    maxAmount: 150000,
    requiresPhone: true,
    supportsRecurring: false,
    isEnabled: true,
    sortOrder: 6,
  },
  {
    id: 'airtel_money',
    name: 'Airtel Money',
    description: 'Mobile money via Airtel',
    icon: 'mobile',
    currencies: ['KES'],
    countries: ['KE'],
    processingFee: 0,
    minAmount: 10,
    maxAmount: 150000,
    requiresPhone: true,
    supportsRecurring: false,
    isEnabled: true,
    sortOrder: 7,
  },
  {
    id: 'til_pay',
    name: 'TilPay',
    description: 'Buy now, pay later with TilPay',
    icon: 'calendar',
    currencies: ['KES'],
    countries: ['KE'],
    processingFee: 0,
    minAmount: 1000,
    maxAmount: 100000,
    requiresPhone: true,
    supportsRecurring: true,
    isEnabled: true,
    sortOrder: 8,
  },
] as const;

export type PaymentMethodId = typeof paymentMethods[number]['id'];

export const paymentMethodMap = paymentMethods.reduce((acc, method) => {
  acc[method.id] = method;
  return acc;
}, {} as Record<PaymentMethodId, typeof paymentMethods[number]>);

export function getAvailablePaymentMethods(
  currency: string,
  country: string,
  amount: number
): typeof paymentMethods {
  return paymentMethods.filter(method => {
    if (!method.isEnabled) return false;
    if (!method.currencies.includes(currency as any)) return false;
    if (!method.countries.includes(country as any)) return false;
    if (amount < method.minAmount) return false;
    if (amount > method.maxAmount) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function calculateProcessingFee(
  amount: number,
  paymentMethodId: PaymentMethodId
): number {
  const method = paymentMethodMap[paymentMethodId];
  if (!method) return 0;
  
  const fee = amount * method.processingFee;
  return Math.ceil(fee);
}

export function getTotalWithFee(
  amount: number,
  paymentMethodId: PaymentMethodId
): number {
  return amount + calculateProcessingFee(amount, paymentMethodId);
}

export const paymentMethodIcons = {
  mpesa: '📱',
  card: '💳',
  bank_transfer: '🏦',
  paypal: '🌐',
  cash_on_delivery: '💰',
  equitel: '📱',
  airtel_money: '📱',
  til_pay: '📅',
} as const;
