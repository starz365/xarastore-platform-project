'use client';

import clsx from 'clsx';
import { useCurrency } from '@/components/settings/CurrencyProvider';

interface PriceDisplayProps {
  price: number | string | null | undefined;
  originalPrice?: number | string | null | undefined;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCurrency?: boolean;
  showSavings?: boolean;
  className?: string;
}

/**
 * Safely normalize any incoming value into a valid number.
 * Handles:
 * - number
 * - string ("2500", "2,500")
 * - null / undefined
 * - invalid numeric strings
 */
const normalizeNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export function PriceDisplay({
  price,
  originalPrice,
  currency = 'KES',
  size = 'md',
  showCurrency = true,
  showSavings = true,
  className = '',
}: PriceDisplayProps) {
  const { format, isLoading } = useCurrency();

  // Normalize values defensively
  const safePrice = normalizeNumber(price);
  const safeOriginalPrice = normalizeNumber(originalPrice);

  if (isLoading) {
    return (
      <div
        className={clsx('h-6 bg-gray-200 rounded animate-pulse', className)}
        aria-hidden="true"
      />
    );
  }

  // Tailwind size map
  const sizeClasses: Record<typeof size, string> = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  // Discount logic (only if original > current)
  const hasDiscount = safeOriginalPrice > safePrice;
  const discount = hasDiscount
    ? Math.round(((safeOriginalPrice - safePrice) / safeOriginalPrice) * 100)
    : 0;

  const savings = hasDiscount ? safeOriginalPrice - safePrice : 0;

  const discountColor =
    discount >= 50
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';

  // Formatting
  const formattedPrice = showCurrency
    ? format(safePrice)
    : `${currency} ${safePrice.toLocaleString('en-KE')}`;

  const formattedOriginalPrice = hasDiscount
    ? showCurrency
      ? format(safeOriginalPrice)
      : `${currency} ${safeOriginalPrice.toLocaleString('en-KE')}`
    : null;

  const formattedSavings =
    savings > 0
      ? showCurrency
        ? format(savings)
        : `${currency} ${savings.toLocaleString('en-KE')}`
      : null;

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex items-baseline gap-2">
        {/* Current Price */}
        <span
          className={clsx('font-bold text-gray-900', sizeClasses[size])}
          aria-label={`Price ${formattedPrice}`}
        >
          {formattedPrice}
        </span>

        {/* Original Price */}
        {formattedOriginalPrice && (
          <span
            className={clsx(
              'text-gray-400 line-through',
              sizeClasses[size]
            )}
            aria-label={`Original price ${formattedOriginalPrice}`}
          >
            {formattedOriginalPrice}
          </span>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <span
            className={clsx(
              'px-2 py-1 text-xs font-bold rounded',
              discountColor
            )}
            title={
              showSavings && formattedSavings
                ? `You save ${formattedSavings}`
                : undefined
            }
            aria-label={`Discount ${discount}%`}
          >
            -{discount}%
          </span>
        )}
      </div>
    </div>
  );
}
