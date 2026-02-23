// Service Worker for Push Notifications

const CACHE_NAME = 'xarastore-push-v1';
const API_BASE_URL = '/api';

// Install event - cache necessary assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png',
      ]);
    }).then(() => self.skipWaiting())
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

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification from Xarastore',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      image: data.image,
      tag: data.tag || 'xarastore-notification',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      actions: data.actions || [],
      silent: data.silent || false,
      timestamp: data.timestamp || Date.now(),
      vibrate: data.vibrate || [200, 100, 200],
    };

    // Add default actions if none provided
    if (!options.actions.length && data.url) {
      options.actions.push({
        action: 'open',
        title: 'Open',
        icon: '/icons/open-72x72.png',
      });
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Xarastore',
        options
      )
    );
  } catch (error) {
    console.error('Push notification error:', error);
    
    // Show fallback notification
    event.waitUntil(
      self.registration.showNotification('Xarastore', {
        body: 'New update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-96x96.png',
        tag: 'fallback',
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;

  const urlToOpen = action === 'open' && notificationData.url 
    ? notificationData.url 
    : '/';

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Check if there's already a window/tab open with the target URL
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    
    // If no window/tab is open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);

  // Send analytics about notification click
  if (notificationData.notificationId) {
    fetch(`${API_BASE_URL}/analytics/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: notificationData.notificationId,
        action: action || 'click',
        timestamp: new Date().toISOString(),
      }),
    }).catch(error => console.error('Analytics error:', error));
  }
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data;
  
  if (notificationData.notificationId) {
    fetch(`${API_BASE_URL}/analytics/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: notificationData.notificationId,
        action: 'close',
        timestamp: new Date().toISOString(),
      }),
    }).catch(error => console.error('Analytics error:', error));
  }
});

// Push subscription change handler
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Send new subscription to server
        return fetch(`${API_BASE_URL}/push/subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      })
      .catch(error => console.error('Subscription change error:', error))
  );
});

// Background sync for notification delivery tracking
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notification-analytics') {
    event.waitUntil(syncNotificationAnalytics());
  }
});

async function syncNotificationAnalytics() {
  const db = await openDatabase();
  const pendingAnalytics = await getPendingAnalytics(db);
  
  if (pendingAnalytics.length > 0) {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingAnalytics),
      });

      if (response.ok) {
        await clearPendingAnalytics(db);
      }
    } catch (error) {
      console.error('Failed to sync analytics:', error);
    }
  }
}

// IndexedDB for offline analytics storage
function openDatabase() {
  return new Promise((resolve) => {
    const request = indexedDB.open('xarastore-push-analytics', 1);
    
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('analytics')) {
        const store = db.createObjectStore('analytics', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-timestamp', 'timestamp');
      }
    };
  });
}

async function getPendingAnalytics(db) {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    
    const transaction = db.transaction(['analytics'], 'readonly');
    const store = transaction.objectStore('analytics');
    const index = store.index('by-timestamp');
    const request = index.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

async function clearPendingAnalytics(db) {
  return new Promise((resolve) => {
    if (!db) {
      resolve();
      return;
    }
    
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
}

// Periodic sync for notification preferences
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-notification-preferences') {
    event.waitUntil(updateNotificationPreferences());
  }
});

async function updateNotificationPreferences() {
  try {
    const response = await fetch(`${API_BASE_URL}/push/preferences`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      const preferences = await response.json();
      await storeNotificationPreferences(preferences);
    }
  } catch (error) {
    console.error('Failed to update preferences:', error);
  }
}

async function storeNotificationPreferences(preferences) {
  return new Promise((resolve) => {
    const request = indexedDB.open('xarastore-preferences', 1);
    
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['preferences'], 'readwrite');
      const store = transaction.objectStore('preferences');
      
      const putRequest = store.put(preferences, 'notification-preferences');
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => resolve();
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences');
      }
    };
  });
}

// Message handler for communication with web app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_SUBSCRIPTION':
      event.ports[0].postMessage({
        subscription: self.registration.pushManager.getSubscription(),
      });
      break;
      
    case 'TRACK_EVENT':
      trackEventOffline(event.data.event);
      break;
  }
});

async function trackEventOffline(event) {
  const db = await openDatabase();
  if (!db) return;

  const transaction = db.transaction(['analytics'], 'readwrite');
  const store = transaction.objectStore('analytics');
  
  store.add({
    ...event,
    timestamp: new Date().toISOString(),
    offline: true,
  });
}

// Cache first strategy for notification assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/icons/') || 
      event.request.url.includes('/images/notifications/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
