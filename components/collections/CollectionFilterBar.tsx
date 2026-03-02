'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CollectionFilterBarProps {
  types: Array<{ type: string; count: number }>;
  currentType: string;
  currentSort: string;
}

export function CollectionFilterBar({ types, currentType, currentSort }: CollectionFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('sort', e.target.value);
    router.push(`/collections?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-2">
        <Filter className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Filter by:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={currentType === '' ? 'primary' : 'outline'}
            size="sm"
            asChild
          >
            <Link href="/collections">All</Link>
          </Button>
          {types.slice(0, 5).map((type) => (
            <Button
              key={type.type}
              variant={currentType === type.type ? 'primary' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/collections?type=${encodeURIComponent(type.type)}`}>
                {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                <span className="ml-1 text-xs opacity-70">({type.count})</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Sort by:</span>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          defaultValue={currentSort}
          onChange={handleSortChange}
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="name">Name A-Z</option>
          <option value="products">Most Products</option>
        </select>
      </div>
    </div>
  );
}
