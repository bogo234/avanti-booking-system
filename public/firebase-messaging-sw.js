// Firebase Service Worker for Push Notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDWaDKO-qdKyxRNX6gag6mAHEs36_Oj9bw",
  authDomain: "avanti-booking-system.firebaseapp.com",
  projectId: "avanti-booking-system",
  storageBucket: "avanti-booking-system.firebasestorage.app",
  messagingSenderId: "524784289735",
  appId: "1:524784289735:web:148ee7e81e5076e4ab3be2",
  measurementId: "G-KXDENH3QY4"
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Ny bokning';
  const notificationOptions = {
    body: payload.notification.body || 'Du har en ny bokning att acceptera',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'booking-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'accept',
        title: 'Acceptera',
        icon: '/icons/accept.png'
      },
      {
        action: 'reject',
        title: 'Avslå',
        icon: '/icons/reject.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'accept') {
    // Handle accept action
    event.waitUntil(
      clients.openWindow('/driver')
    );
  } else if (event.action === 'reject') {
    // Handle reject action
    event.waitUntil(
      clients.openWindow('/driver')
    );
  } else {
    // Default click action
    event.waitUntil(
      clients.openWindow('/driver')
    );
  }
});
