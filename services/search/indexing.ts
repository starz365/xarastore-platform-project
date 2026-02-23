import { supabase } from '@/lib/supabase/client';

export interface IndexDocument {
  id: string;
  type: 'product' | 'category' | 'brand' | 'content';
  title: string;
  content: string;
  metadata: Record<string, any>;
  tags: string[];
  boost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IndexStats {
  totalDocuments: number;
  byType: Record<string, number>;
  lastIndexed: Date;
  indexSize: number;
}

export class SearchIndexer {
  private static instance: SearchIndexer;
  private readonly indexTable = 'search_index';
  private readonly batchSize = 100;
  private isIndexing = false;

  private constructor() {
    this.ensureIndexTable();
  }

  static getInstance(): SearchIndexer {
    if (!SearchIndexer.instance) {
      SearchIndexer.instance = new SearchIndexer();
    }
    return SearchIndexer.instance;
  }

  async indexProduct(productId: string): Promise<void> {
    try {
      // Fetch product with related data
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands(*),
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('id', productId)
        .single();

      if (error || !product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Prepare document for indexing
      const document: IndexDocument = {
        id: `product_${product.id}`,
        type: 'product',
        title: product.name,
        content: this.generateProductContent(product),
        metadata: {
          price: product.price,
          originalPrice: product.original_price,
          sku: product.sku,
          brandId: product.brand.id,
          brandName: product.brand.name,
          categoryId: product.category.id,
          categoryName: product.category.name,
          rating: product.rating,
          reviewCount: product.review_count,
          stock: product.stock,
          isFeatured: product.is_featured,
          isDeal: product.is_deal,
          dealEndsAt: product.deal_ends_at,
          specifications: product.specifications,
          variants: product.variants,
        },
        tags: this.generateProductTags(product),
        boost: this.calculateProductBoost(product),
        createdAt: new Date(product.created_at),
        updatedAt: new Date(product.updated_at),
      };

      await this.upsertDocument(document);
    } catch (error) {
      console.error(`Failed to index product ${productId}:`, error);
      throw error;
    }
  }

  async indexCategory(categoryId: string): Promise<void> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select('*, parent:categories(*)')
        .eq('id', categoryId)
        .single();

      if (error || !category) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      const document: IndexDocument = {
        id: `category_${category.id}`,
        type: 'category',
        title: category.name,
        content: category.description || '',
        metadata: {
          parentId: category.parent_id,
          parentName: category.parent?.name,
          productCount: category.product_count,
          image: category.image,
        },
        tags: [category.name, category.slug],
        boost: 0.8, // Categories have lower boost than products
        createdAt: new Date(category.created_at),
        updatedAt: new Date(category.updated_at),
      };

      await this.upsertDocument(document);
    } catch (error) {
      console.error(`Failed to index category ${categoryId}:`, error);
      throw error;
    }
  }

  async indexBrand(brandId: string): Promise<void> {
    try {
      const { data: brand, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error || !brand) {
        throw new Error(`Brand not found: ${brandId}`);
      }

      const document: IndexDocument = {
        id: `brand_${brand.id}`,
        type: 'brand',
        title: brand.name,
        content: brand.description || '',
        metadata: {
          logo: brand.logo,
          productCount: brand.product_count,
        },
        tags: [brand.name, brand.slug],
        boost: 0.7, // Brands have lower boost
        createdAt: new Date(brand.created_at),
        updatedAt: new Date(brand.updated_at),
      };

      await this.upsertDocument(document);
    } catch (error) {
      console.error(`Failed to index brand ${brandId}:`, error);
      throw error;
    }
  }

  async reindexAllProducts(): Promise<{ success: boolean; count: number }> {
    if (this.isIndexing) {
      throw new Error('Indexing already in progress');
    }

    this.isIndexing = true;
    let processed = 0;
    let success = true;

    try {
      console.log('Starting full product reindexing...');

      // Get total count for progress tracking
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      console.log(`Found ${totalProducts} products to index`);

      // Process in batches
      let lastId: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('products')
          .select('id')
          .order('id')
          .limit(this.batchSize);

        if (lastId) {
          query = query.gt('id', lastId);
        }

        const { data: productIds, error } = await query;

        if (error) {
          throw error;
        }

        if (!productIds || productIds.length === 0) {
          hasMore = false;
          break;
        }

        // Index each product in the batch
        for (const product of productIds) {
          try {
            await this.indexProduct(product.id);
            processed++;
            
            // Log progress every 100 products
            if (processed % 100 === 0) {
              console.log(`Indexed ${processed}/${totalProducts} products`);
            }
          } catch (error) {
            console.error(`Failed to index product ${product.id}:`, error);
            success = false;
          }
          
          lastId = product.id;
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`Completed indexing ${processed} products`);
      
      // Update index statistics
      await this.updateIndexStats();

      return { success, count: processed };
    } catch (error) {
      console.error('Full reindexing failed:', error);
      success = false;
      return { success, count: processed };
    } finally {
      this.isIndexing = false;
    }
  }

  async deleteFromIndex(id: string, type: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.indexTable)
        .delete()
        .eq('document_id', `${type}_${id}`);

      if (error) throw error;

      console.log(`Deleted ${type} ${id} from search index`);
    } catch (error) {
      console.error(`Failed to delete ${type} ${id} from index:`, error);
      throw error;
    }
  }

  async getIndexStats(): Promise<IndexStats> {
    try {
      // Get total document count
      const { count: totalDocuments, error: countError } = await supabase
        .from(this.indexTable)
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get count by type
      const { data: byTypeData, error: typeError } = await supabase
        .from(this.indexTable)
        .select('document_type')
        .group('document_type');

      if (typeError) throw typeError;

      const byType: Record<string, number> = {};
      if (byTypeData) {
        // We need to count manually since Supabase doesn't support COUNT with GROUP BY directly
        for (const item of byTypeData) {
          const { count } = await supabase
            .from(this.indexTable)
            .select('*', { count: 'exact', head: true })
            .eq('document_type', item.document_type);
          
          byType[item.document_type] = count || 0;
        }
      }

      // Get last indexed timestamp
      const { data: lastIndexedData, error: lastError } = await supabase
        .from(this.indexTable)
        .select('indexed_at')
        .order('indexed_at', { ascending: false })
        .limit(1)
        .single();

      // Get approximate index size (in bytes)
      const { data: sizeData, error: sizeError } = await supabase
        .rpc('estimate_table_size', { table_name: this.indexTable });

      return {
        totalDocuments: totalDocuments || 0,
        byType,
        lastIndexed: lastIndexedData?.indexed_at ? new Date(lastIndexedData.indexed_at) : new Date(),
        indexSize: sizeData?.size || 0,
      };
    } catch (error) {
      console.error('Failed to get index stats:', error);
      throw error;
    }
  }

  async optimizeIndex(): Promise<void> {
    try {
      console.log('Optimizing search index...');
      
      // Refresh materialized view if using one
      const { error } = await supabase.rpc('refresh_search_index');
      
      if (error) {
        console.warn('Could not refresh materialized view:', error.message);
      }
      
      // Update statistics
      await this.updateIndexStats();
      
      console.log('Search index optimized');
    } catch (error) {
      console.error('Failed to optimize index:', error);
      throw error;
    }
  }

  async clearIndex(): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.indexTable)
        .delete()
        .neq('document_id', ''); // Delete all records

      if (error) throw error;

      console.log('Search index cleared');
      
      // Reset statistics
      await this.resetIndexStats();
    } catch (error) {
      console.error('Failed to clear index:', error);
      throw error;
    }
  }

  private async ensureIndexTable(): Promise<void> {
    // This would create the index table if it doesn't exist
    // In production, this should be done via migrations
    try {
      const { error } = await supabase.rpc('ensure_search_index_table');
      
      if (error && !error.message.includes('already exists')) {
        console.error('Failed to ensure search index table:', error);
      }
    } catch (error) {
      // Table might already exist, which is fine
    }
  }

  private async upsertDocument(document: IndexDocument): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.indexTable)
        .upsert({
          document_id: document.id,
          document_type: document.type,
          title: document.title,
          content: document.content,
          metadata: document.metadata,
          tags: document.tags,
          boost: document.boost,
          created_at: document.createdAt.toISOString(),
          updated_at: document.updatedAt.toISOString(),
          indexed_at: new Date().toISOString(),
        }, {
          onConflict: 'document_id',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to upsert document:', error);
      throw error;
    }
  }

  private generateProductContent(product: any): string {
    const contentParts = [
      product.name,
      product.description,
      product.brand?.name || '',
      product.category?.name || '',
      product.sku,
    ];

    // Add specifications if available
    if (product.specifications && typeof product.specifications === 'object') {
      Object.values(product.specifications).forEach(value => {
        if (typeof value === 'string') {
          contentParts.push(value);
        }
      });
    }

    // Add variant attributes
    if (product.variants && Array.isArray(product.variants)) {
      product.variants.forEach((variant: any) => {
        if (variant.attributes && typeof variant.attributes === 'object') {
          Object.values(variant.attributes).forEach(value => {
            if (typeof value === 'string') {
              contentParts.push(value);
            }
          });
        }
      });
    }

    return contentParts.join(' ').toLowerCase();
  }

  private generateProductTags(product: any): string[] {
    const tags = new Set<string>();

    // Basic tags
    tags.add(product.brand?.name?.toLowerCase());
    tags.add(product.category?.name?.toLowerCase());
    
    // Add keywords from name
    product.name.toLowerCase().split(' ').forEach((word: string) => {
      if (word.length > 2) {
        tags.add(word);
      }
    });

    // Add deal tags
    if (product.is_deal) {
      tags.add('deal');
      tags.add('discount');
      tags.add('sale');
    }

    if (product.is_featured) {
      tags.add('featured');
    }

    // Add stock status
    if (product.stock > 10) {
      tags.add('in stock');
    } else if (product.stock > 0) {
      tags.add('low stock');
    }

    // Filter out undefined and empty tags
    return Array.from(tags).filter(tag => tag && tag.trim().length > 0);
  }

  private calculateProductBoost(product: any): number {
    let boost = 1.0;

    // Boost for featured products
    if (product.is_featured) {
      boost *= 1.5;
    }

    // Boost for deals
    if (product.is_deal) {
      boost *= 1.3;
    }

    // Boost based on rating
    if (product.rating >= 4.5) {
      boost *= 1.4;
    } else if (product.rating >= 4.0) {
      boost *= 1.2;
    } else if (product.rating >= 3.0) {
      boost *= 1.1;
    }

    // Boost based on review count
    if (product.review_count > 100) {
      boost *= 1.3;
    } else if (product.review_count > 10) {
      boost *= 1.1;
    }

    // Slight boost for newer products
    const createdAt = new Date(product.created_at);
    const daysOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 30) {
      boost *= 1.2;
    } else if (daysOld < 90) {
      boost *= 1.1;
    }

    return Math.min(boost, 3.0); // Cap at 3.0
  }

  private async updateIndexStats(): Promise<void> {
    try {
      const stats = await this.getIndexStats();
      
      await supabase
        .from('index_statistics')
        .upsert({
          id: 'search_index',
          stats,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
    } catch (error) {
      console.error('Failed to update index stats:', error);
    }
  }

  private async resetIndexStats(): Promise<void> {
    try {
      await supabase
        .from('index_statistics')
        .update({
          stats: {
            totalDocuments: 0,
            byType: {},
            lastIndexed: new Date(),
            indexSize: 0,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'search_index');
    } catch (error) {
      console.error('Failed to reset index stats:', error);
    }
  }
}

export const searchIndexer = SearchIndexer.getInstance();
