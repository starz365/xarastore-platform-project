import { formatCurrency } from '@/lib/utils/currency';
import { useCurrency } from '@/components/settings/CurrencyProvider';
import clsx from 'clsx';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCurrency?: boolean;
  showSavings?: boolean; // new: show absolute savings
  className?: string;
}

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

  if (isLoading) {
    return <div className={`h-6 bg-gray-200 rounded animate-pulse ${className}`} />;
  }

  // Tailwind size classes
  const sizeClasses: Record<typeof size, string> = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  // Discount calculation
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

  const savings = originalPrice && originalPrice > price ? originalPrice - price : 0;

  // Color logic for discount badge
  const discountColor = discount >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const formattedPrice = showCurrency ? format(price) : `${currency} ${price.toLocaleString()}`;
  const formattedOriginalPrice =
    originalPrice && originalPrice > price
      ? showCurrency
        ? format(originalPrice)
        : `${currency} ${originalPrice.toLocaleString()}`
      : null;

  const formattedSavings =
    savings > 0 ? (showCurrency ? format(savings) : `${currency} ${savings.toLocaleString()}`) : null;

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex items-baseline gap-2">
        {/* Current Price */}
        <span className={`font-bold text-gray-900 ${sizeClasses[size]}`} aria-label={`Price ${formattedPrice}`}>
          {formattedPrice}
        </span>

        {/* Original Price with strikethrough if discounted */}
        {formattedOriginalPrice && (
          <span
            className={`text-gray-400 line-through ${sizeClasses[size]}`}
            aria-label={`Original price ${formattedOriginalPrice}`}
          >
            {formattedOriginalPrice}
          </span>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <span
            className={clsx('px-2 py-1 text-xs font-bold rounded', discountColor)}
            title={showSavings && formattedSavings ? `You save ${formattedSavings}` : undefined}
            aria-label={`Discount ${discount}%`}
          >
            -{discount}%
          </span>
        )}
      </div>
    </div>
  );
}
