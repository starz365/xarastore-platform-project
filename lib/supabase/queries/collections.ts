import { supabase } from '../client';
import { Collection, CollectionWithProducts, PaginatedCollections, CollectionFilters, transformCollection } from '@/types/collections';
import { Product } from '@/types';
import { transformProduct } from './products';
import { logger } from '@/lib/utils/logger';
import { PostgrestError } from '@supabase/supabase-js';

// Cache configuration for performance
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

// Add timeout to fetch operations
const FETCH_TIMEOUT = 15000; // 15 seconds

async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Database query timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  if (cached) cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Get featured collections
 * @param limit Maximum number of collections to return
 */
export async function getFeaturedCollections(limit: number = 6): Promise<Collection[]> {
  const cacheKey = `featured_collections_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    if (error) {
      logger.error('Error fetching featured collections:', { error: error.message, code: error.code });
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const collections = data.map(transformCollection);
    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error('Failed to fetch featured collections:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Get all active collections with pagination
 * @param filters Optional filters for collections
 */
export async function getAllCollections(
  filters?: CollectionFilters
): Promise<PaginatedCollections> {
  try {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Build cache key from filters
    const cacheKey = `all_collections_${page}_${pageSize}_${filters?.type || ''}_${filters?.sortBy || ''}_${filters?.search || ''}`;
    const cached = getFromCache<PaginatedCollections>(cacheKey);
    if (cached) return cached;

    // Start building the query
    let query = supabase
      .from('collections')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting based on database schema
    switch (filters?.sortBy) {
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'products':
        // If product_count exists in schema, use it, otherwise sort by updated_at
        query = query.order('product_count', { ascending: false, nullsFirst: false })
                     .order('updated_at', { ascending: false });
        break;
      case 'popular':
        query = query.order('view_count', { ascending: false, nullsFirst: false })
                     .order('updated_at', { ascending: false });
        break;
      default: // 'newest'
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, count, error } = await fetchWithTimeout(query);

    if (error) {
      logger.error('Error fetching all collections:', { error: error.message, code: error.code });
      return {
        collections: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }

    const collections = (data || []).map(transformCollection);
    const total = count || 0;

    const result = {
      collections,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Failed to fetch all collections:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return {
      collections: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }
}

/**
 * Get collection by slug with products
 * @param slug Collection slug identifier
 * @param includeProducts Whether to include products in the response
 * @param productLimit Maximum number of products to return
 */
export async function getCollectionBySlug(
  slug: string,
  includeProducts: boolean = true,
  productLimit: number = 50
): Promise<CollectionWithProducts | null> {
  const cacheKey = `collection_${slug}_${includeProducts}_${productLimit}`;
  const cached = getFromCache<CollectionWithProducts | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    // First, get the collection
    const { data: collectionData, error: collectionError } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
    );

    if (collectionError) {
      if (collectionError.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      logger.error(`Error fetching collection by slug "${slug}":`, { 
        error: collectionError.message, 
        code: collectionError.code 
      });
      return null;
    }

    if (!collectionData) {
      return null;
    }

    const collection = transformCollection(collectionData);

    // If products are not requested, return collection without products
    if (!includeProducts) {
      const result = { ...collection, products: [] };
      setCache(cacheKey, result);
      return result;
    }

    // Get products for this collection
    const { data: productsData, error: productsError } = await fetchWithTimeout(
      supabase
        .from('collection_products')
        .select(`
          product:products (
            id,
            slug,
            name,
            description,
            price,
            original_price,
            sku,
            stock,
            images,
            specifications,
            rating,
            review_count,
            is_featured,
            is_deal,
            deal_ends_at,
            created_at,
            updated_at,
            brand:brands (
              id,
              slug,
              name,
              logo,
              product_count
            ),
            category:categories (
              id,
              slug,
              name,
              product_count
            ),
            variants:product_variants (
              id,
              name,
              price,
              original_price,
              sku,
              stock,
              attributes
            )
          )
        `)
        .eq('collection_id', collection.id)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(productLimit)
    );

    if (productsError) {
      logger.error(`Error fetching products for collection "${slug}":`, { 
        error: productsError.message, 
        code: productsError.code 
      });
      const result = { ...collection, products: [] };
      setCache(cacheKey, result);
      return result;
    }

    const products = (productsData || [])
      .map((item: any) => {
        if (!item.product) return null;
        return transformProduct(item.product);
      })
      .filter(Boolean) as Product[];

    // Update view count asynchronously (don't await)
    supabase
      .from('collections')
      .update({ view_count: (collectionData.view_count || 0) + 1 })
      .eq('id', collection.id)
      .then(({ error }) => {
        if (error) {
          logger.error('Failed to update collection view count:', { 
            collectionId: collection.id, 
            error: error.message 
          });
        }
      });

    const result = { ...collection, products };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error(`Failed to fetch collection by slug "${slug}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Get collections by type
 * @param type Collection type to filter by
 * @param limit Maximum number of collections to return
 */
export async function getCollectionsByType(
  type: string,
  limit: number = 20
): Promise<Collection[]> {
  const cacheKey = `collections_by_type_${type}_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('type', type)
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('product_count', { ascending: false, nullsFirst: false })
        .limit(limit)
    );

    if (error) {
      logger.error(`Error fetching collections by type "${type}":`, { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    const collections = (data || []).map(transformCollection);
    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error(`Failed to fetch collections by type "${type}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Get products in a collection with pagination
 * @param collectionId Collection ID
 * @param page Page number
 * @param pageSize Number of products per page
 * @param onlyInStock Whether to filter only in-stock products
 */
export async function getProductsInCollection(
  collectionId: string,
  page: number = 1,
  pageSize: number = 24,
  onlyInStock: boolean = false
): Promise<{ products: Product[]; total: number; collection: Collection | null }> {
  const cacheKey = `products_in_collection_${collectionId}_${page}_${pageSize}_${onlyInStock}`;
  const cached = getFromCache<{ products: Product[]; total: number; collection: Collection | null }>(cacheKey);
  if (cached) return cached;

  try {
    // First, verify the collection exists and is active
    const { data: collectionData, error: collectionError } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .eq('is_active', true)
        .single()
    );

    if (collectionError) {
      if (collectionError.code === 'PGRST116') {
        return { products: [], total: 0, collection: null };
      }
      logger.error(`Error fetching collection "${collectionId}":`, { 
        error: collectionError.message, 
        code: collectionError.code 
      });
      return { products: [], total: 0, collection: null };
    }

    const collection = transformCollection(collectionData);
    const offset = (page - 1) * pageSize;

    // Build query for collection products
    let query = supabase
      .from('collection_products')
      .select(
        `
        product:products!inner (
          id,
          slug,
          name,
          description,
          price,
          original_price,
          sku,
          stock,
          images,
          specifications,
          rating,
          review_count,
          is_featured,
          is_deal,
          deal_ends_at,
          created_at,
          updated_at,
          brand:brands (
            id,
            slug,
            name,
            logo,
            product_count
          ),
          category:categories (
            id,
            slug,
            name,
            product_count
          ),
          variants:product_variants (
            id,
            name,
            price,
            original_price,
            sku,
            stock,
            attributes
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('collection_id', collectionId);

    // Filter for in-stock products if requested
    if (onlyInStock) {
      query = query.gt('product.stock', 0);
    }

    // Apply pagination and ordering
    const { data, count, error } = await fetchWithTimeout(
      query
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)
    );

    if (error) {
      logger.error(`Error fetching products for collection "${collectionId}":`, { 
        error: error.message, 
        code: error.code 
      });
      return { products: [], total: 0, collection };
    }

    const products = (data || [])
      .map((item: any) => {
        if (!item.product) return null;
        return transformProduct(item.product);
      })
      .filter(Boolean) as Product[];

    const result = {
      products,
      total: count || 0,
      collection,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error(`Failed to fetch products for collection "${collectionId}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return { products: [], total: 0, collection: null };
  }
}

/**
 * Get collections containing a specific product
 * @param productId Product ID
 * @param limit Maximum number of collections to return
 */
export async function getCollectionsForProduct(
  productId: string,
  limit: number = 5
): Promise<Collection[]> {
  const cacheKey = `collections_for_product_${productId}_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collection_products')
        .select(`
          collection:collections!inner (
            id,
            name,
            slug,
            description,
            image,
            type,
            product_count,
            is_active,
            is_featured,
            display_order,
            created_at,
            updated_at
          )
        `)
        .eq('product_id', productId)
        .eq('collection.is_active', true)
        .order('collection.display_order', { ascending: true, nullsFirst: false })
        .limit(limit)
    );

    if (error) {
      logger.error(`Error fetching collections for product "${productId}":`, { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    const collections = (data || [])
      .map((item: any) => item.collection)
      .filter(Boolean)
      .map(transformCollection);

    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error(`Failed to fetch collections for product "${productId}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Get collection types with counts
 * Returns all collection types with the number of active collections in each
 */
export async function getCollectionTypesWithCounts(): Promise<Array<{
  type: string;
  count: number;
}>> {
  const cacheKey = 'collection_types_with_counts';
  const cached = getFromCache<Array<{ type: string; count: number }>>(cacheKey);
  if (cached) return cached;

  try {
    // Get all active collections and group by type
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('type, id')
        .eq('is_active', true)
        .not('type', 'is', null)
    );

    if (error) {
      logger.error('Error fetching collection types with counts:', { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    // Group by type and count
    const typeCounts = (data || []).reduce((acc: Record<string, number>, item) => {
      const type = item.type;
      if (type) {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {});

    // Convert to array format and sort by count descending
    const result = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Failed to fetch collection types with counts:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Get trending collections based on view count and product count
 * @param limit Maximum number of collections to return
 */
export async function getTrendingCollections(limit: number = 8): Promise<Collection[]> {
  const cacheKey = `trending_collections_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .order('view_count', { ascending: false, nullsFirst: false })
        .order('product_count', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(limit)
    );

    if (error) {
      logger.error('Error fetching trending collections:', { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    const collections = (data || []).map(transformCollection);
    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error('Failed to fetch trending collections:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Search collections by name or description
 * @param query Search query
 * @param limit Maximum number of results to return
 */
export async function searchCollections(
  query: string,
  limit: number = 10
): Promise<Collection[]> {
  if (!query.trim()) {
    return [];
  }

  const cacheKey = `search_collections_${query}_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('product_count', { ascending: false, nullsFirst: false })
        .order('view_count', { ascending: false, nullsFirst: false })
        .limit(limit)
    );

    if (error) {
      logger.error('Error searching collections:', { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    const collections = (data || []).map(transformCollection);
    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error('Failed to search collections:', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Check if a collection exists and is active
 * @param slug Collection slug
 */
export async function collectionExists(slug: string): Promise<boolean> {
  const cacheKey = `collection_exists_${slug}`;
  const cached = getFromCache<boolean>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const { count, error } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('slug', slug)
        .eq('is_active', true)
    );

    if (error) {
      logger.error(`Error checking if collection exists "${slug}":`, { 
        error: error.message, 
        code: error.code 
      });
      return false;
    }

    const exists = (count || 0) > 0;
    setCache(cacheKey, exists);
    return exists;
  } catch (error) {
    logger.error(`Failed to check if collection exists "${slug}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return false;
  }
}

/**
 * Get similar collections (same type or category)
 * @param collectionId Current collection ID
 * @param limit Maximum number of similar collections to return
 */
export async function getSimilarCollections(
  collectionId: string,
  limit: number = 4
): Promise<Collection[]> {
  const cacheKey = `similar_collections_${collectionId}_${limit}`;
  const cached = getFromCache<Collection[]>(cacheKey);
  if (cached) return cached;

  try {
    // First, get the current collection
    const { data: currentCollection, error: collectionError } = await fetchWithTimeout(
      supabase
        .from('collections')
        .select('type, category_id')
        .eq('id', collectionId)
        .single()
    );

    if (collectionError || !currentCollection) {
      logger.error(`Error fetching current collection "${collectionId}":`, { 
        error: collectionError?.message, 
        code: collectionError?.code 
      });
      return [];
    }

    // Build query for similar collections
    let query = supabase
      .from('collections')
      .select('*')
      .neq('id', collectionId)
      .eq('is_active', true);

    // Prioritize same type, then same category
    if (currentCollection.type) {
      query = query.or(`type.eq.${currentCollection.type},category_id.eq.${currentCollection.category_id || ''}`);
    } else if (currentCollection.category_id) {
      query = query.eq('category_id', currentCollection.category_id);
    }

    // Sort by relevance
    const { data, error } = await fetchWithTimeout(
      query
        .order('product_count', { ascending: false, nullsFirst: false })
        .order('view_count', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(limit)
    );

    if (error) {
      logger.error(`Error fetching similar collections for "${collectionId}":`, { 
        error: error.message, 
        code: error.code 
      });
      return [];
    }

    const collections = (data || []).map(transformCollection);
    setCache(cacheKey, collections);
    return collections;
  } catch (error) {
    logger.error(`Failed to fetch similar collections for "${collectionId}":`, { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return [];
  }
}

/**
 * Clear all caches (useful for admin actions)
 */
export function clearCollectionsCache(): void {
  clearCache();
  logger.info('Collections cache cleared');
}
