export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  bannerImage?: string;
  type: CollectionType;
  isFeatured: boolean;
  isActive: boolean;
  displayOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  startDate?: string;
  endDate?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionProduct {
  id: string;
  collectionId: string;
  productId: string;
  displayOrder: number;
  isFeaturedInCollection: boolean;
  createdAt: string;
}

export type CollectionType = 
  | 'seasonal'
  | 'themed'
  | 'editorial'
  | 'trending'
  | 'featured'
  | 'new_arrivals'
  | 'best_sellers'
  | 'limited_time';

export interface CollectionWithProducts extends Collection {
  products: Product[];
}

export interface PaginatedCollections {
  collections: Collection[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CollectionFilters {
  type?: CollectionType;
  featuredOnly?: boolean;
  activeOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'newest' | 'oldest' | 'name' | 'product_count';
}

// Product interface (simplified version from existing types)
interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  brand: {
    id: string;
    name: string;
    slug: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export function transformCollection(data: any): Collection {
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description || '',
    image: data.image,
    bannerImage: data.banner_image,
    type: data.type,
    isFeatured: data.is_featured,
    isActive: data.is_active,
    displayOrder: data.display_order,
    metaTitle: data.meta_title,
    metaDescription: data.meta_description,
    startDate: data.start_date,
    endDate: data.end_date,
    productCount: data.product_count || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function transformCollectionProduct(data: any): CollectionProduct {
  return {
    id: data.id,
    collectionId: data.collection_id,
    productId: data.product_id,
    displayOrder: data.display_order,
    isFeaturedInCollection: data.is_featured_in_collection,
    createdAt: data.created_at,
  };
}
