'use client';

import Link from 'next/link';

interface Product {
  id: string;
  slug: string;
  name: string;
  price?: number;
  image?: string | null;
}

interface Props {
  product: Product;
}

export function MegaMenuProductCard({ product }: Props) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-lg border border-gray-100 p-3 hover:border-red-200 hover:shadow-sm transition"
    >
      <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
            No Image
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-gray-900 line-clamp-2">
        {product.name}
      </p>

      {product.price && (
        <p className="text-sm text-red-600 font-semibold">
          ${product.price}
        </p>
      )}
    </Link>
  );
}

