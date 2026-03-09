'use client';

import { useEffect, useState } from 'react';
import { MegaMenuProductCard } from './MegaMenuProductCard';
import { logger } from '@/lib/utils/logger';

interface Product {
  id: string;
  slug: string;
  name: string;
  price?: number;
  image?: string | null;
}

interface Props {
  categorySlug: string | null;
}

/*
  NOTE:
  Replace this stub with:
  getCategoryPreviewProducts(categorySlug)
*/

async function fetchPreviewProducts(slug: string): Promise<Product[]> {
  try {
    const res = await fetch(`/api/category-preview?slug=${slug}`);

    if (!res.ok) return [];

    return res.json();
  } catch (err) {
    logger.error('preview fetch failed', err);
    return [];
  }
}

export function MegaMenuCategoryPreview({ categorySlug }: Props) {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (!categorySlug) return;

    let cancelled = false;

    async function load() {

      setLoading(true);

      const data = await fetchPreviewProducts(categorySlug);

      if (!cancelled) {
        setProducts(data.slice(0,4));
        setLoading(false);
      }

    }

    load();

    return () => {
      cancelled = true;
    };

  }, [categorySlug]);

  if (!categorySlug) {
    return (
      <div className="text-sm text-gray-500">
        Hover a category to preview products
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_,i)=>(
          <div key={i} className="animate-pulse h-32 bg-gray-100 rounded"/>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="text-sm text-gray-500">
        No preview products available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map(p=>(
        <MegaMenuProductCard key={p.id} product={p}/>
      ))}
    </div>
  );
}
