import { supabase } from '../client';
import { Collection, CollectionWithProducts, PaginatedCollections, CollectionFilters, CollectionType, transformCollection } from '@/types/collections';
import { Product } from '@/types';
import { transformProduct } from './products';

/**
 * Get featured collections
 * @param limit Maximum number of collections to return
 */
export async function getFeaturedCollections(limit: number = 6): Promise<Collection[]> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_featured', true)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('display_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformCollection);
  } catch (error) {
    console.error('Error fetching featured collections:', error);
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

    let query = supabase
      .from('collections')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

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

    // Apply sorting
    switch (filters?.sortBy) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'product_count':
        query = query.order('product_count', { ascending: false });
        break;
      default: // 'newest'
        query = query.order('updated_at', { ascending: false });
    }

    // Apply pagination
    query = query.order('display_order', { ascending: true }).range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    const total = count || 0;
    const collections = (data || []).map(transformCollection);

    return {
      collections,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('Error fetching all collections:', error);
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
  try {
    // First, get the collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (collectionError || !collectionData) {
      return null;
    }

    const collection = transformCollection(collectionData);

    // If products are not requested, return collection without products
    if (!includeProducts) {
      return {
        ...collection,
        products: [],
      };
    }

    // Get products for this collection
    const { data: productsData, error: productsError } = await supabase
      .from('collection_products')
      .select(`
        *,
        product:products (
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        )
      `)
      .eq('collection_id', collection.id)
      .order('display_order', { ascending: true })
      .order('is_featured_in_collection', { ascending: false })
      .limit(productLimit);

    if (productsError) throw productsError;

    const products = (productsData || [])
      .map((item: any) => {
        if (!item.product) return null;
        return transformProduct(item.product);
      })
      .filter(Boolean) as Product[];

    return {
      ...collection,
      products,
    };
  } catch (error) {
    console.error(`Error fetching collection by slug "${slug}":`, error);
    return null;
  }
}

/**
 * Get collections by type
 * @param type Collection type to filter by
 * @param limit Maximum number of collections to return
 */
export async function getCollectionsByType(
  type: CollectionType,
  limit: number = 20
): Promise<Collection[]> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('display_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformCollection);
  } catch (error) {
    console.error(`Error fetching collections by type "${type}":`, error);
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
  try {
    // First, verify the collection exists and is active
    const { data: collectionData, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .eq('is_active', true)
      .single();

    if (collectionError || !collectionData) {
      return { products: [], total: 0, collection: null };
    }

    const collection = transformCollection(collectionData);
    const offset = (page - 1) * pageSize;

    // Build query for collection products
    let query = supabase
      .from('collection_products')
      .select(
        `
        *,
        product:products!inner (
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        )
      `,
        { count: 'exact' }
      )
      .eq('collection_id', collectionId);

    // Filter for in-stock products if requested
    if (onlyInStock) {
      query = query.filter('product.stock', 'gt', 0);
    }

    // Apply pagination and ordering
    const { data, count, error } = await query
      .order('display_order', { ascending: true })
      .order('is_featured_in_collection', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const products = (data || [])
      .map((item: any) => {
        if (!item.product) return null;
        return transformProduct(item.product);
      })
      .filter(Boolean) as Product[];

    return {
      products,
      total: count || 0,
      collection,
    };
  } catch (error) {
    console.error(`Error fetching products for collection "${collectionId}":`, error);
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
  try {
    const { data, error } = await supabase
      .from('collection_products')
      .select(`
        *,
        collection:collections!inner (*)
      `)
      .eq('product_id', productId)
      .eq('collection.is_active', true)
      .order('collection.display_order', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || [])
      .map((item: any) => item.collection)
      .filter(Boolean)
      .map(transformCollection);
  } catch (error) {
    console.error(`Error fetching collections for product "${productId}":`, error);
    return [];
  }
}

/**
 * Get collection types with counts
 * Returns all collection types with the number of active collections in each
 */
export async function getCollectionTypesWithCounts(): Promise<Array<{
  type: CollectionType;
  count: number;
}>> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('type, count')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .group('type');

    if (error) throw error;

    // Get all possible collection types from the database
    const { data: typeData } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumtypid', (await supabase.from('pg_type').select('oid').eq('typname', 'collection_type').single()).data?.oid);

    const allTypes = (typeData || []).map(t => t.enumlabel as CollectionType);

    return allTypes.map(type => ({
      type,
      count: (data?.find(d => d.type === type)?.count || 0) as number,
    }));
  } catch (error) {
    console.error('Error fetching collection types with counts:', error);
    
    // Fallback to predefined types with zero counts
    const defaultTypes: CollectionType[] = [
      'seasonal',
      'themed',
      'editorial',
      'trending',
      'featured',
      'new_arrivals',
      'best_sellers',
      'limited_time',
    ];

    return defaultTypes.map(type => ({ type, count: 0 }));
  }
}

/**
 * Get trending collections (based on recent updates and product count)
 * @param limit Maximum number of collections to return
 */
export async function getTrendingCollections(limit: number = 8): Promise<Collection[]> {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('product_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformCollection);
  } catch (error) {
    console.error('Error fetching trending collections:', error);
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
  try {
    if (!query.trim()) {
      return [];
    }

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(transformCollection);
  } catch (error) {
    console.error('Error searching collections:', error);
    return [];
  }
}

/**
 * Check if a collection exists and is active
 * @param slug Collection slug
 */
export async function collectionExists(slug: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('slug', slug)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

    if (error) throw error;

    return (count || 0) > 0;
  } catch (error) {
    console.error(`Error checking if collection exists "${slug}":`, error);
    return false;
  }
}

/**
 * Get similar collections (same type or overlapping products)
 * @param collectionId Current collection ID
 * @param limit Maximum number of similar collections to return
 */
export async function getSimilarCollections(
  collectionId: string,
  limit: number = 4
): Promise<Collection[]> {
  try {
    // First, get the current collection
    const { data: currentCollection, error: collectionError } = await supabase
      .from('collections')
      .select('type')
      .eq('id', collectionId)
      .single();

    if (collectionError) {
      return [];
    }

    // Find collections with the same type, excluding the current one
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('type', currentCollection.type)
      .neq('id', collectionId)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
      .order('product_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // If we don't have enough same-type collections, fill with trending ones
    if ((data?.length || 0) < limit) {
      const remaining = limit - (data?.length || 0);
      const { data: trendingData } = await supabase
        .from('collections')
        .select('*')
        .neq('id', collectionId)
        .neq('type', currentCollection.type)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`)
        .order('product_count', { ascending: false })
        .limit(remaining);

      const allCollections = [
        ...(data || []),
        ...(trendingData || []),
      ].slice(0, limit);

      return allCollections.map(transformCollection);
    }

    return (data || []).map(transformCollection);
  } catch (error) {
    console.error(`Error fetching similar collections for "${collectionId}":`, error);
    return [];
  }
}
