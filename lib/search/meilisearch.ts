import { MeiliSearch } from 'meilisearch';
import { getRedisCache } from '@/services/cache/redis';

interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: string[];
  sort?: string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
  highlightPreTag?: string;
  highlightPostTag?: string;
}

interface ProductDocument {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  category_id: string;
  brand: string;
  brand_id: string;
  tags: string[];
  sku: string;
  stock: number;
  rating: number;
  review_count: number;
  created_at: number;
  updated_at: number;
  images: string[];
  attributes: Record<string, any>;
  searchable_text: string;
}

export class SearchService {
  private client: MeiliSearch;
  private index: string;
  private redis = getRedisCache();
  private static instance: SearchService;

  constructor(config?: { host?: string; apiKey?: string; index?: string }) {
    this.client = new MeiliSearch({
      host: config?.host || process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: config?.apiKey || process.env.MEILISEARCH_API_KEY,
    });
    
    this.index = config?.index || 'products';
  }

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Initialize search index with settings
   */
  async initialize() {
    try {
      const index = this.client.index(this.index);
      
      // Configure index settings
      await index.updateSettings({
        searchableAttributes: [
          'name',
          'description',
          'brand',
          'category',
          'tags',
          'sku',
          'searchable_text',
        ],
        filterableAttributes: [
          'category_id',
          'brand_id',
          'price',
          'stock',
          'rating',
          'tags',
          'created_at',
          'attributes',
        ],
        sortableAttributes: [
          'price',
          'rating',
          'created_at',
          'name',
          'review_count',
        ],
        displayedAttributes: [
          'id',
          'name',
          'description',
          'price',
          'category',
          'brand',
          'images',
          'rating',
          'stock',
        ],
        distinctAttribute: 'id',
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
          'price:asc',
          'rating:desc',
        ],
        stopWords: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at'],
        synonyms: {
          'phone': ['smartphone', 'mobile', 'cellphone'],
          'laptop': ['notebook', 'computer'],
          'shoes': ['sneakers', 'footwear'],
        },
        pagination: {
          maxTotalHits: 10000,
        },
      });
      
      console.log('Search index initialized');
    } catch (error) {
      console.error('Failed to initialize search index:', error);
      throw error;
    }
  }

  /**
   * Index a product
   */
  async indexProduct(product: ProductDocument) {
    try {
      const index = this.client.index(this.index);
      await index.addDocuments([product]);
      
      // Clear search cache
      await this.redis.flush('search:*');
      
      return true;
    } catch (error) {
      console.error('Failed to index product:', error);
      return false;
    }
  }

  /**
   * Index multiple products
   */
  async indexProducts(products: ProductDocument[]) {
    try {
      const index = this.client.index(this.index);
      await index.addDocuments(products);
      
      // Clear search cache
      await this.redis.flush('search:*');
      
      return true;
    } catch (error) {
      console.error('Failed to index products:', error);
      return false;
    }
  }

  /**
   * Update a product
   */
  async updateProduct(product: Partial<ProductDocument> & { id: string }) {
    try {
      const index = this.client.index(this.index);
      await index.updateDocuments([product]);
      
      // Clear search cache
      await this.redis.flush('search:*');
      
      return true;
    } catch (error) {
      console.error('Failed to update product:', error);
      return false;
    }
  }

  /**
   * Delete a product from index
   */
  async deleteProduct(productId: string) {
    try {
      const index = this.client.index(this.index);
      await index.deleteDocument(productId);
      
      // Clear search cache
      await this.redis.flush('search:*');
      
      return true;
    } catch (error) {
      console.error('Failed to delete product from index:', error);
      return false;
    }
  }

  /**
   * Search products
   */
  async search(query: string, options: SearchOptions = {}) {
    try {
      const cacheKey = `search:${query}:${JSON.stringify(options)}`;
      
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const index = this.client.index(this.index);
      
      const searchParams: any = {
        q: query,
        limit: options.limit || 24,
        offset: options.offset || 0,
      };
      
      if (options.filters?.length) {
        searchParams.filter = options.filters;
      }
      
      if (options.sort?.length) {
        searchParams.sort = options.sort;
      }
      
      if (options.attributesToRetrieve) {
        searchParams.attributesToRetrieve = options.attributesToRetrieve;
      }
      
      if (options.attributesToHighlight) {
        searchParams.attributesToHighlight = options.attributesToHighlight;
        searchParams.highlightPreTag = options.highlightPreTag || '<em>';
        searchParams.highlightPostTag = options.highlightPostTag || '</em>';
      }
      
      const results = await index.search(query, searchParams);
      
      // Cache results for 5 minutes
      await this.redis.set(cacheKey, results, 300);
      
      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return { hits: [], estimatedTotalHits: 0 };
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 5) {
    try {
      const cacheKey = `suggestions:${query}:${limit}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const index = this.client.index(this.index);
      
      const results = await index.search(query, {
        limit,
        attributesToRetrieve: ['name', 'category', 'brand'],
        attributesToCrop: [],
      });
      
      const suggestions = results.hits.map(hit => ({
        text: hit.name,
        category: hit.category,
        brand: hit.brand,
      }));
      
      // Cache for 1 hour
      await this.redis.set(cacheKey, suggestions, 3600);
      
      return suggestions;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Get facet distribution
   */
  async getFacets(facetName: string, query: string = '', filters?: string[]) {
    try {
      const cacheKey = `facets:${facetName}:${query}:${JSON.stringify(filters)}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      const index = this.client.index(this.index);
      
      const results = await index.search(query, {
        facets: [facetName],
        filters: filters?.join(' AND '),
        limit: 0,
      });
      
      const facets = results.facetDistribution?.[facetName] || {};
      
      // Cache for 1 hour
      await this.redis.set(cacheKey, facets, 3600);
      
      return facets;
    } catch (error) {
      console.error('Failed to get facets:', error);
      return {};
    }
  }

  /**
   * Get similar products
   */
  async getSimilarProducts(productId: string, limit: number = 10) {
    try {
      const cacheKey = `similar:${productId}:${limit}`;
      
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }
      
      // Get the product first
      const index = this.client.index(this.index);
      const product = await index.getDocument(productId);
      
      if (!product) {
        return [];
      }
      
      // Search for similar products based on category and tags
      const filters = [
        `id != ${productId}`,
        `category_id = ${product.category_id}`,
      ];
      
      if (product.tags?.length) {
        filters.push(`tags IN [${product.tags.map((t: string) => `"${t}"`).join(', ')}]`);
      }
      
      const results = await index.search('', {
        filter: filters.join(' AND '),
        limit,
        sort: ['rating:desc'],
      });
      
      // Cache for 1 hour
      await this.redis.set(cacheKey, results.hits, 3600);
      
      return results.hits;
    } catch (error) {
      console.error('Failed to get similar products:', error);
      return [];
    }
  }

  /**
   * Sync database with search index
   */
  async syncDatabase(products: ProductDocument[]) {
    try {
      const index = this.client.index(this.index);
      
      // Get all existing document IDs
      const existingDocs = await index.getDocuments({
        limit: 10000,
        fields: ['id'],
      });
      
      const existingIds = new Set(existingDocs.results.map(d => d.id));
      const newIds = new Set(products.map(p => p.id));
      
      // Find documents to delete
      const toDelete = [...existingIds].filter(id => !newIds.has(id));
      
      // Perform bulk operations
      const operations = [];
      
      if (toDelete.length > 0) {
        operations.push(index.deleteDocuments(toDelete));
      }
      
      if (products.length > 0) {
        operations.push(index.addDocuments(products));
      }
      
      await Promise.all(operations);
      
      // Clear cache
      await this.redis.flush('search:*');
      
      return {
        indexed: products.length,
        deleted: toDelete.length,
      };
    } catch (error) {
      console.error('Failed to sync database:', error);
      throw error;
    }
  }

  /**
   * Get index stats
   */
  async getStats() {
    try {
      const index = this.client.index(this.index);
      const [stats, tasks] = await Promise.all([
        index.getStats(),
        index.getTasks(),
      ]);
      
      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
        lastUpdate: stats.updatedAt,
        fieldDistribution: stats.fieldDistribution,
        pendingTasks: tasks.results.filter(t => t.status === 'enqueued').length,
      };
    } catch (error) {
      console.error('Failed to get index stats:', error);
      return null;
    }
  }

  /**
   * Clear all indexes
   */
  async clearIndex() {
    try {
      const index = this.client.index(this.index);
      await index.deleteAllDocuments();
      await this.redis.flush('search:*');
      return true;
    } catch (error) {
      console.error('Failed to clear index:', error);
      return false;
    }
  }
}
