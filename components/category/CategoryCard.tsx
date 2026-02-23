import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group block bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
            <div className="text-4xl">
              {getCategoryEmoji(category.name)}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
              {category.name}
            </h3>
            {category.productCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {category.productCount} product{category.productCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
        </div>
        
        {category.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function getCategoryEmoji(name: string): string {
  const emojiMap: Record<string, string> = {
    electronics: '📱',
    fashion: '👕',
    'home & garden': '🏠',
    beauty: '💄',
    sports: '⚽',
    automotive: '🚗',
    books: '📚',
    toys: '🧸',
    grocery: '🛒',
    health: '💊',
  };

  const lowerName = name.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }

  return '📦';
}
