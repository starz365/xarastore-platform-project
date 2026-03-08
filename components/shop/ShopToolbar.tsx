'use client';

import { useRouter } from 'next/navigation';

interface ShopToolbarProps {
  page: number;
  total: number;
  sortBy: string;
  sortOptions: Array<{ value: string; label: string }>;
  pageSize: number;
}

export function ShopToolbar({ page, total, sortBy, sortOptions, pageSize }: ShopToolbarProps) {
  const router = useRouter();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sort', e.target.value);
    url.searchParams.delete('page');
    router.push(url.toString());
  };

  const start = ((page - 1) * pageSize) + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{start}</span>-
          <span className="font-semibold">{end}</span> of{' '}
          <span className="font-semibold">{total.toLocaleString()}</span> products
        </div>

        <div className="flex items-center space-x-4">
          {/* Sort */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Sort by:</label>
            <select
              name="sort"
              value={sortBy}
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
