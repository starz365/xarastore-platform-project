// Service Worker for Xarastore PWA
// Version: 2.0.0

const CACHE_NAME = 'xarastore-v2';
const OFFLINE_CACHE = 'xarastore-offline-v1';
const API_CACHE = 'xarastore-api-v1';
const IMAGE_CACHE = 'xarastore-images-v1';

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/images/logo.png',
  '/images/placeholder/product.jpg'
];

const API_ENDPOINTS = [
  '/api/products',
  '/api/categories',
  '/api/brands',
  '/api/deals'
];

const STATIC_ASSETS = [
  '/_next/static/css/',
  '/_next/static/chunks/pages/',
  '/_next/static/media/'
];

// Install Event - Precaching
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      }),
      caches.open(OFFLINE_CACHE).then(cache => {
        console.log('[Service Worker] Precaching offline resources');
        return cache.add('/offline');
      }),
      self.skipWaiting()
    ]).then(() => {
      console.log('[Service Worker] Install completed');
    })
  );
});

// Activate Event - Cleanup old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (![CACHE_NAME, OFFLINE_CACHE, API_CACHE, IMAGE_CACHE].includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch Event - Network first with cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(event);
  }
  
  // Handle image requests
  if (request.destination === 'image') {
    return handleImageRequest(event);
  }
  
  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname.startsWith(asset))) {
    return handleStaticAssetRequest(event);
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    return handleNavigationRequest(event);
  }
  
  // Default: cache-first for other requests
  return handleDefaultRequest(event);
});

// API Request Handler
async function handleApiRequest(event) {
  const { request } = event;
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful API responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(API_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached API response if available
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline fallback for critical APIs
          if (request.url.includes('/api/products') || 
              request.url.includes('/api/categories')) {
            return new Response(
              JSON.stringify({ 
                message: 'You are offline. Data will sync when you reconnect.',
                offline: true 
              }),
              {
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
          
          throw new Error('Network error and no cache available');
        });
      })
  );
}

// Image Request Handler
async function handleImageRequest(event) {
  const { request } = event;
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Update cache in background
        fetchAndCache(request, IMAGE_CACHE);
        return cachedResponse;
      }
      
      return fetchAndCache(request, IMAGE_CACHE).catch(() => {
        // Return placeholder image if fetch fails
        return caches.match('/images/placeholder/product.jpg');
      });
    })
  );
}

// Static Asset Handler
async function handleStaticAssetRequest(event) {
  const { request } = event;
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then(response => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    })
  );
}

// Navigation Request Handler
async function handleNavigationRequest(event) {
  const { request } = event;
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache the page
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Return offline page from cache
        return caches.match('/offline').then(offlineResponse => {
          if (offlineResponse) {
            return offlineResponse;
          }
          
          // Create basic offline response
          return new Response(
            `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Offline | Xarastore</title>
              <style>
                body { font-family: sans-serif; padding: 20px; text-align: center; }
                h1 { color: #dc2626; }
              </style>
            </head>
            <body>
              <h1>You're Offline</h1>
              <p>Please check your internet connection and try again.</p>
              <button onclick="window.location.reload()">Retry</button>
            </body>
            </html>
            `,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        });
      })
  );
}

// Default Request Handler
async function handleDefaultRequest(event) {
  const { request } = event;
  
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Update cache in background
        fetchAndCache(request, CACHE_NAME);
        return cachedResponse;
      }
      
      return fetchAndCache(request, CACHE_NAME).catch(() => {
        // For HTML pages, return offline page
        if (request.headers.get('Accept').includes('text/html')) {
          return caches.match('/offline');
        }
        
        throw new Error('Network error and no cache available');
      });
    })
  );
}

// Helper function to fetch and cache
async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  
  if (response.status === 200) {
    const responseToCache = response.clone();
    caches.open(cacheName).then(cache => {
      cache.put(request, responseToCache);
    });
  }
  
  return response;
}

// Background Sync
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Sync cart data
async function syncCart() {
  try {
    const db = await openDatabase();
    const cart = await getOfflineCart(db);
    
    if (cart && navigator.onLine) {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cart)
      });
      
      if (response.ok) {
        await clearOfflineCart(db);
        console.log('[Service Worker] Cart synced successfully');
        
        // Show notification
        self.registration.showNotification('Xarastore', {
          body: 'Your cart has been synced!',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'cart-sync'
        });
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to sync cart:', error);
  }
}

// Sync orders
async function syncOrders() {
  try {
    const db = await openDatabase();
    const orders = await getOfflineOrders(db);
    
    for (const order of orders) {
      if (navigator.onLine) {
        const response = await fetch('/api/orders/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          await removeOfflineOrder(db, order.id);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to sync orders:', error);
  }
}

// IndexedDB helper functions
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xarastore-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-visited', 'lastVisited');
      }
    };
  });
}

function getOfflineCart(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['cart'], 'readonly');
    const store = transaction.objectStore('cart');
    const request = store.get('current');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function clearOfflineCart(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['cart'], 'readwrite');
    const store = transaction.objectStore('cart');
    const request = store.delete('current');
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getOfflineOrders(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['orders'], 'readonly');
    const store = transaction.objectStore('orders');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removeOfflineOrder(db, orderId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['orders'], 'readwrite');
    const store = transaction.objectStore('orders');
    const request = store.delete(orderId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Push Notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New update from Xarastore!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Xarastore', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Periodic Sync (for background updates)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-content') {
      console.log('[Service Worker] Periodic sync for content update');
      event.waitUntil(updateCachedContent());
    }
  });
}

// Update cached content
async function updateCachedContent() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.startsWith(self.location.origin)) {
        try {
          const response = await fetch(request);
          if (response.status === 200) {
            await cache.put(request, response);
          }
        } catch (error) {
          console.log(`[Service Worker] Failed to update: ${request.url}`);
        }
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to update cached content:', error);
  }
}

// Message Handler
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

console.log('[Service Worker] Loaded successfully');
