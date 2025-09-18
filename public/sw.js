// Advanced Service Worker for Avanti Booking System
// Implements comprehensive offline functionality and background sync

const CACHE_NAME = 'avanti-v2.0.1';
const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/images/fallback.png';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/booking',
  '/auth',
  '/driver',
  '/customer',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/images/fallback.png'
];

// Runtime caching strategies
const CACHE_STRATEGIES = {
  // Static assets - Cache First
  STATIC: [
    /\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/,
    /\/icons\//,
    /\/images\//
  ],
  
  // API calls - Network First with fallback
  API: [
    /\/api\//
  ],
  
  // Pages - Stale While Revalidate
  PAGES: [
    /^(?!.*\/api\/).*$/
  ]
};

// Background sync tags
const SYNC_TAGS = {
  BOOKING_SYNC: 'booking-sync',
  LOCATION_SYNC: 'location-sync',
  NOTIFICATION_SYNC: 'notification-sync',
  ANALYTICS_SYNC: 'analytics-sync'
};

// Offline queue for failed requests
let offlineQueue = [];
let isOnline = navigator.onLine;

// Install event - Cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache essential assets
        await cache.addAll(PRECACHE_ASSETS);
        
        // Do not precache third-party scripts (e.g., Google Maps). Always fetch fresh.
        
        console.log('Precaching completed');
        
        // Skip waiting to activate immediately
        self.skipWaiting();
        
      } catch (error) {
        console.error('Precaching failed:', error);
      }
    })()
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
      
      await Promise.all(
        oldCaches.map(name => caches.delete(name))
      );
      
      // Claim all clients
      await self.clients.claim();
      
      console.log('Service Worker activated');
    })()
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different request types
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiCall(request.url)) {
    event.respondWith(handleApiCall(request));
  } else if (isPageRequest(request)) {
    event.respondWith(handlePageRequest(request));
  }
});

// Background Sync - Handle offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case SYNC_TAGS.BOOKING_SYNC:
      event.waitUntil(syncBookings());
      break;
    case SYNC_TAGS.LOCATION_SYNC:
      event.waitUntil(syncLocationUpdates());
      break;
    case SYNC_TAGS.NOTIFICATION_SYNC:
      event.waitUntil(syncNotifications());
      break;
    case SYNC_TAGS.ANALYTICS_SYNC:
      event.waitUntil(syncAnalytics());
      break;
    default:
      event.waitUntil(syncOfflineQueue());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const { notification, data: customData } = data;
    
    if (!notification) return;
    
    const notificationOptions = {
      body: notification.body || '',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      image: notification.image,
      tag: customData?.tag || 'avanti-notification',
      data: customData || {},
      requireInteraction: customData?.requireInteraction || false,
      silent: customData?.silent || false,
      actions: getNotificationActions(customData?.type),
      timestamp: Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(
        notification.title || 'Avanti',
        notificationOptions
      )
    );
    
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  let url = '/';
  
  // Handle different notification types
  if (data.type === 'booking' && data.bookingId) {
    url = `/booking/${data.bookingId}`;
  } else if (data.type === 'driver' && data.trackingId) {
    url = `/tracking/${data.trackingId}`;
  } else if (data.url) {
    url = data.url;
  }
  
  // Handle action buttons
  if (action === 'view') {
    url = data.url || url;
  } else if (action === 'track') {
    url = `/tracking/${data.bookingId || data.trackingId}`;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url });
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(data.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(data.cacheNames));
      break;
      
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(data);
      break;
      
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage({
        type: 'CACHE_STATUS',
        data: getCacheStatus()
      });
      break;
  }
});

// Network status monitoring
self.addEventListener('online', () => {
  console.log('Network back online');
  isOnline = true;
  
  // Sync offline queue
  syncOfflineQueue();
  
  // Notify clients
  broadcastToClients({ type: 'NETWORK_STATUS', online: true });
});

self.addEventListener('offline', () => {
  console.log('Network offline');
  isOnline = false;
  
  // Notify clients
  broadcastToClients({ type: 'NETWORK_STATUS', online: false });
});

// Caching strategy implementations
async function handleStaticAsset(request) {
  try {
    // Cache First strategy
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    
    // Return fallback for images
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      const fallback = await caches.match(FALLBACK_IMAGE);
      if (fallback) return fallback;
    }
    
    throw error;
  }
}

async function handleApiCall(request) {
  try {
    // Network First strategy with offline queue
    const networkResponse = await fetch(request);
    
    // Cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('API call failed:', error);
    
    // For GET requests, try cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT requests, queue for later sync
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      await queueOfflineAction({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await request.text(),
        timestamp: Date.now()
      });
      
      // Return optimistic response
      return new Response(JSON.stringify({
        success: true,
        message: 'Request queued for when online',
        offline: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return offline page for failed requests
    const offlinePage = await caches.match(OFFLINE_PAGE);
    if (offlinePage) return offlinePage;
    
    throw error;
  }
}

async function handlePageRequest(request) {
  try {
    // Stale While Revalidate strategy
    const cachedResponse = await caches.match(request);
    
    const networkResponsePromise = fetch(request).then(response => {
      if (response.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    });
    
    // Return cached response immediately if available
    if (cachedResponse) {
      // Update cache in background
      networkResponsePromise.catch(() => {
        console.log('Background update failed for:', request.url);
      });
      
      return cachedResponse;
    }
    
    // Wait for network response
    return await networkResponsePromise;
    
  } catch (error) {
    console.error('Page request failed:', error);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    
    // Return offline page
    const offlinePage = await caches.match(OFFLINE_PAGE);
    if (offlinePage) return offlinePage;
    
    throw error;
  }
}

// Background sync implementations
async function syncBookings() {
  console.log('Syncing offline bookings...');
  
  try {
    const queuedBookings = offlineQueue.filter(item => 
      item.url.includes('/api/booking') && item.method === 'POST'
    );
    
    for (const booking of queuedBookings) {
      try {
        const response = await fetch(booking.url, {
          method: booking.method,
          headers: booking.headers,
          body: booking.body
        });
        
        if (response.ok) {
          // Remove from queue
          offlineQueue = offlineQueue.filter(item => item !== booking);
          
          // Notify success
          broadcastToClients({
            type: 'BOOKING_SYNCED',
            data: { success: true, timestamp: booking.timestamp }
          });
        }
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
    
  } catch (error) {
    console.error('Booking sync failed:', error);
  }
}

async function syncLocationUpdates() {
  console.log('Syncing location updates...');
  
  try {
    const locationUpdates = offlineQueue.filter(item => 
      item.url.includes('/api/driver/location')
    );
    
    for (const update of locationUpdates) {
      try {
        const response = await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body
        });
        
        if (response.ok) {
          offlineQueue = offlineQueue.filter(item => item !== update);
        }
      } catch (error) {
        console.error('Failed to sync location update:', error);
      }
    }
    
  } catch (error) {
    console.error('Location sync failed:', error);
  }
}

async function syncNotifications() {
  console.log('Syncing notifications...');
  
  try {
    // Sync notification read status and other notification-related actions
    const notificationActions = offlineQueue.filter(item => 
      item.url.includes('/api/notifications')
    );
    
    for (const action of notificationActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        if (response.ok) {
          offlineQueue = offlineQueue.filter(item => item !== action);
        }
      } catch (error) {
        console.error('Failed to sync notification:', error);
      }
    }
    
  } catch (error) {
    console.error('Notification sync failed:', error);
  }
}

async function syncAnalytics() {
  console.log('Syncing analytics data...');
  
  try {
    // Sync analytics events that were queued offline
    const analyticsEvents = offlineQueue.filter(item => 
      item.url.includes('/api/analytics')
    );
    
    for (const event of analyticsEvents) {
      try {
        const response = await fetch(event.url, {
          method: event.method,
          headers: event.headers,
          body: event.body
        });
        
        if (response.ok) {
          offlineQueue = offlineQueue.filter(item => item !== event);
        }
      } catch (error) {
        console.error('Failed to sync analytics:', error);
      }
    }
    
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

async function syncOfflineQueue() {
  if (!isOnline || offlineQueue.length === 0) return;
  
  console.log(`Syncing ${offlineQueue.length} offline actions...`);
  
  const actionsToSync = [...offlineQueue];
  
  for (const action of actionsToSync) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body
      });
      
      if (response.ok) {
        offlineQueue = offlineQueue.filter(item => item !== action);
        
        broadcastToClients({
          type: 'OFFLINE_ACTION_SYNCED',
          data: { url: action.url, timestamp: action.timestamp }
        });
      }
    } catch (error) {
      console.error('Failed to sync offline action:', error);
    }
  }
  
  console.log(`Offline sync completed. ${offlineQueue.length} actions remaining.`);
}

// Helper functions
function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function isStaticAsset(url) {
  return isSameOrigin(url) && CACHE_STRATEGIES.STATIC.some(pattern => pattern.test(url));
}

function isApiCall(url) {
  return isSameOrigin(url) && CACHE_STRATEGIES.API.some(pattern => pattern.test(url));
}

function isPageRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

async function queueOfflineAction(action) {
  offlineQueue.push(action);
  
  // Limit queue size
  if (offlineQueue.length > 100) {
    offlineQueue = offlineQueue.slice(-100);
  }
  
  // Register for background sync
  try {
    await self.registration.sync.register('offline-sync');
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

function getNotificationActions(type) {
  const actions = {
    booking: [
      { action: 'view', title: 'Visa detaljer', icon: '/icons/view.png' },
      { action: 'track', title: 'Spåra', icon: '/icons/track.png' }
    ],
    driver: [
      { action: 'track', title: 'Spåra förare', icon: '/icons/track.png' },
      { action: 'call', title: 'Ring', icon: '/icons/call.png' }
    ],
    payment: [
      { action: 'view', title: 'Visa kvitto', icon: '/icons/receipt.png' }
    ]
  };
  
  return actions[type] || [
    { action: 'view', title: 'Visa', icon: '/icons/view.png' }
  ];
}

async function cacheUrls(urls) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urls);
    console.log('URLs cached successfully:', urls);
  } catch (error) {
    console.error('Failed to cache URLs:', error);
  }
}

async function clearCache(cacheNames) {
  try {
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
    console.log('Caches cleared:', cacheNames);
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

function getCacheStatus() {
  return {
    cacheName: CACHE_NAME,
    offlineQueueSize: offlineQueue.length,
    isOnline
  };
}

function broadcastToClients(message) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage(message);
    });
  });
}

console.log('Advanced Service Worker loaded successfully');
