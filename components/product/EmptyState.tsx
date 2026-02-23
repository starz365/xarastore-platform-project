import { Search, Filter, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'search' | 'filter' | 'cart';
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = 'search',
  action,
  className = '',
}: EmptyStateProps) {
  const Icon = {
    search: Search,
    filter: Filter,
    cart: ShoppingBag,
  }[icon];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-red-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md mb-6">{description}</p>
      {action && (
        <Button asChild variant="primary">
          <Link href={action.href}>
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  );
}
