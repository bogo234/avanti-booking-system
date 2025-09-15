// Firebase Cloud Messaging Service Worker for Avanti Booking System

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBqgKLBqvKy8WGQWqJOJWGSzWGH7dxJzE",
  authDomain: "avanti-booking.firebaseapp.com",
  projectId: "avanti-booking",
  storageBucket: "avanti-booking.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();
  
  // Get notification data
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  // Handle different actions
  if (action === 'view') {
    // Open the app to view the item
    const url = notificationData.url || '/dashboard';
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    const url = notificationData.url || '/dashboard';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Focus existing window and navigate if needed
            if (url !== '/dashboard') {
              client.postMessage({
                type: 'NAVIGATE',
                url: url
              });
            }
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  const { notification, data } = payload;
  
  if (!notification) {
    console.log('No notification payload, skipping display');
    return;
  }
  
  // Customize notification options
  const notificationTitle = notification.title || 'Avanti';
  const notificationOptions = {
    body: notification.body || '',
    icon: notification.icon || '/icons/notification-icon.png',
    badge: '/icons/notification-badge.png',
    image: notification.image,
    tag: data?.bookingId ? `booking-${data.bookingId}` : 'avanti-notification',
    requireInteraction: data?.requireInteraction === 'true',
    silent: data?.silent === 'true',
    timestamp: Date.now(),
    data: data || {},
    actions: []
  };
  
  // Add action buttons based on notification type
  if (data?.type === 'booking') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'Visa detaljer',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Avfärda',
        icon: '/icons/dismiss-icon.png'
      }
    ];
  } else if (data?.type === 'driver') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'Spåra förare',
        icon: '/icons/track-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Avfärda',
        icon: '/icons/dismiss-icon.png'
      }
    ];
  } else if (data?.type === 'payment') {
    notificationOptions.actions = [
      {
        action: 'view',
        title: 'Visa kvitto',
        icon: '/icons/receipt-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Avfärda',
        icon: '/icons/dismiss-icon.png'
      }
    ];
  }
  
  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Track notification dismissal
  const data = event.notification.data || {};
  if (data.bookingId) {
    // Could send analytics event here
    console.log(`Notification dismissed for booking: ${data.bookingId}`);
  }
});

// Handle push events (fallback)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('Error parsing push data:', error);
    return;
  }
  
  const { notification, data: customData } = data;
  
  if (!notification) {
    console.log('Push event has no notification payload');
    return;
  }
  
  const notificationTitle = notification.title || 'Avanti';
  const notificationOptions = {
    body: notification.body || '',
    icon: notification.icon || '/icons/notification-icon.png',
    badge: '/icons/notification-badge.png',
    tag: customData?.bookingId ? `booking-${customData.bookingId}` : 'avanti-push',
    data: customData || {},
    requireInteraction: customData?.requireInteraction === 'true',
    actions: [
      {
        action: 'view',
        title: 'Visa',
        icon: '/icons/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Avfärda',
        icon: '/icons/dismiss-icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle message events from main thread
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        type: 'VERSION',
        version: '2.0.0'
      });
      break;
      
    case 'CLEAR_NOTIFICATIONS':
      // Clear all notifications
      self.registration.getNotifications().then((notifications) => {
        notifications.forEach((notification) => {
          notification.close();
        });
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Handle install event
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Handle activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());
});

// Handle sync events (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications());
  }
});

// Sync notifications when coming back online
async function syncNotifications() {
  try {
    // This could sync with server to get missed notifications
    console.log('Syncing notifications...');
    
    // Example: fetch missed notifications from server
    const response = await fetch('/api/notifications?unreadOnly=true&limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Synced ${data.notifications?.length || 0} notifications`);
    }
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service worker unhandled rejection:', event.reason);
});

console.log('Firebase Messaging Service Worker loaded successfully');