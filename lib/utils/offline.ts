import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  products: {
    key: string;
    value: {
      id: string;
      slug: string;
      name: string;
      price: number;
      originalPrice?: number;
      images: string[];
      brand: {
        id: string;
        name: string;
        slug: string;
      };
      rating: number;
      reviewCount: number;
      stock: number;
      updatedAt: string;
    };
    indexes: { 'by-updatedAt': string };
  };
  categories: {
    key: string;
    value: {
      id: string;
      slug: string;
      name: string;
      productCount: number;
      updatedAt: string;
    };
  };
  cart: {
    key: string;
    value: {
      id: string;
      items: Array<{
        productId: string;
        variantId: string;
        quantity: number;
      }>;
      updatedAt: string;
    };
  };
  visited: {
    key: string;
    value: {
      productId: string;
      timestamp: string;
    };
    indexes: { 'by-timestamp': string };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

export async function initOfflineDB() {
  if (!('indexedDB' in window)) {
    console.warn('IndexedDB not supported');
    return;
  }

  try {
    db = await openDB<OfflineDB>('xarastore-offline', 1, {
      upgrade(database) {
        // Products store
        if (!database.objectStoreNames.contains('products')) {
          const productStore = database.createObjectStore('products', {
            keyPath: 'id',
          });
          productStore.createIndex('by-updatedAt', 'updatedAt');
        }

        // Categories store
        if (!database.objectStoreNames.contains('categories')) {
          database.createObjectStore('categories', { keyPath: 'id' });
        }

        // Cart store
        if (!database.objectStoreNames.contains('cart')) {
          database.createObjectStore('cart', { keyPath: 'id' });
        }

        // Visited products store
        if (!database.objectStoreNames.contains('visited')) {
          const visitedStore = database.createObjectStore('visited', {
            keyPath: 'productId',
          });
          visitedStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    console.log('Offline database initialized');
  } catch (error) {
    console.error('Failed to initialize offline database:', error);
  }
}

export async function cacheProduct(product: OfflineDB['products']['value']) {
  if (!db) return;
  
  try {
    await db.put('products', {
      ...product,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to cache product:', error);
  }
}

export async function getCachedProduct(productId: string) {
  if (!db) return null;
  
  try {
    return await db.get('products', productId);
  } catch (error) {
    console.error('Failed to get cached product:', error);
    return null;
  }
}

export async function cacheCategory(category: OfflineDB['categories']['value']) {
  if (!db) return;
  
  try {
    await db.put('categories', {
      ...category,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to cache category:', error);
  }
}

export async function getCachedCategories() {
  if (!db) return [];
  
  try {
    return await db.getAll('categories');
  } catch (error) {
    console.error('Failed to get cached categories:', error);
    return [];
  }
}

export async function recordVisit(productId: string) {
  if (!db) return;
  
  try {
    await db.put('visited', {
      productId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to record visit:', error);
  }
}

export async function getRecentlyVisited(limit = 10) {
  if (!db) return [];
  
  try {
    const index = db.transaction('visited').store.index('by-timestamp');
    const visits = await index.getAll();
    
    // Get unique recent visits (most recent first)
    const uniqueVisits = Array.from(
      new Map(visits.reverse().map(v => [v.productId, v])).values()
    ).slice(0, limit);
    
    // Get product details for each visit
    const products = await Promise.all(
      uniqueVisits.map(visit => getCachedProduct(visit.productId))
    );
    
    return products.filter(Boolean) as OfflineDB['products']['value'][];
  } catch (error) {
    console.error('Failed to get recently visited:', error);
    return [];
  }
}

export async function saveCartOffline(cart: OfflineDB['cart']['value']) {
  if (!db) return;
  
  try {
    await db.put('cart', {
      ...cart,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save cart offline:', error);
  }
}

export async function getOfflineCart() {
  if (!db) return null;
  
  try {
    return await db.get('cart', 'default');
  } catch (error) {
    console.error('Failed to get offline cart:', error);
    return null;
  }
}

export async function clearOldCache(maxAgeDays = 7) {
  if (!db) return;
  
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    
    const tx = db.transaction(['products', 'visited'], 'readwrite');
    
    // Clear old products
    const productIndex = tx.objectStore('products').index('by-updatedAt');
    const oldProducts = await productIndex.getAll(
      IDBKeyRange.upperBound(cutoff.toISOString())
    );
    
    await Promise.all(
      oldProducts.map(product => 
        tx.objectStore('products').delete(product.id)
      )
    );
    
    // Clear old visits
    const visitedIndex = tx.objectStore('visited').index('by-timestamp');
    const oldVisits = await visitedIndex.getAll(
      IDBKeyRange.upperBound(cutoff.toISOString())
    );
    
    await Promise.all(
      oldVisits.map(visit => 
        tx.objectStore('visited').delete(visit.productId)
      )
    );
    
    await tx.done;
  } catch (error) {
    console.error('Failed to clear old cache:', error);
  }
}
