const CACHE_NAME = 'xarastore-v1';
const OFFLINE_URL = '/offline';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - precache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests separately
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached API response if available
          return caches.match(event.request);
        })
    );
    return;
  }

  // For HTML pages - network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // For static assets - cache first
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          fetch(event.request)
            .then((response) => {
              if (response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
            });
          return cachedResponse;
        }

        // If not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache the response
            if (response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // If fetch fails and it's an image, return placeholder
            if (event.request.destination === 'image') {
              return caches.match('/placeholder.jpg');
            }
          });
      })
  );
});

// Background sync for cart
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  const db = await openDatabase();
  const offlineCart = await getOfflineCart(db);
  
  if (offlineCart && navigator.onLine) {
    try {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(offlineCart),
      });
      
      if (response.ok) {
        await clearOfflineCart(db);
      }
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  }
}

function openDatabase() {
  return new Promise((resolve) => {
    const request = indexedDB.open('xarastore-offline', 1);
    
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getOfflineCart(db) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    
    const transaction = db.transaction(['cart'], 'readonly');
    const store = transaction.objectStore('cart');
    const request = store.get('default');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function clearOfflineCart(db) {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }
    
    const transaction = db.transaction(['cart'], 'readwrite');
    const store = transaction.objectStore('cart');
    const request = store.delete('default');
    
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}
