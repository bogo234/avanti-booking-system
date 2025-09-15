// Firebase Cloud Messaging utilities for Avanti Booking System
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { app } from './firebase';

// FCM configuration
export const FCMConfig = {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
  // Topic names for different notification types
  topics: {
    allUsers: 'all-users',
    customers: 'customers',
    drivers: 'drivers',
    admins: 'admins',
    bookingUpdates: 'booking-updates',
    systemAlerts: 'system-alerts'
  },
  // Notification types
  notificationTypes: {
    booking: 'booking',
    payment: 'payment',
    driver: 'driver',
    system: 'system',
    admin: 'admin',
    marketing: 'marketing'
  } as const
};

// Notification payload interface
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: Record<string, any>;
}

// FCM token management
export interface FCMTokenInfo {
  token: string;
  userId: string;
  deviceType: 'web' | 'android' | 'ios';
  userAgent: string;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

// Client-side FCM manager
export class FirebaseMessagingClient {
  private messaging: any = null;
  private currentToken: string | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Initialize messaging only in browser environment
    if (typeof window !== 'undefined') {
      try {
        this.messaging = getMessaging(app);
      } catch (error) {
        console.error('Failed to initialize Firebase Messaging:', error);
      }
    }
  }

  // Request notification permission and get FCM token
  async requestPermissionAndGetToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.messaging) {
      return { success: false, error: 'Firebase Messaging not available' };
    }

    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        return { success: false, error: 'This browser does not support notifications' };
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        return { 
          success: false, 
          error: permission === 'denied' 
            ? 'Notification permission denied' 
            : 'Notification permission not granted' 
        };
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: FCMConfig.vapidKey
      });

      if (!token) {
        return { success: false, error: 'Failed to get FCM token' };
      }

      this.currentToken = token;
      
      // Register token with backend
      await this.registerTokenWithBackend(token);

      return { success: true, token };

    } catch (error: any) {
      console.error('Error getting FCM token:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current FCM token
  async getCurrentToken(): Promise<string | null> {
    if (!this.messaging) return null;

    try {
      if (this.currentToken) return this.currentToken;

      const token = await getToken(this.messaging, {
        vapidKey: FCMConfig.vapidKey
      });

      this.currentToken = token;
      return token;

    } catch (error) {
      console.error('Error getting current FCM token:', error);
      return null;
    }
  }

  // Listen for foreground messages
  onMessage(callback: (payload: MessagePayload) => void): () => void {
    if (!this.messaging) {
      return () => {};
    }

    const unsubscribe = onMessage(this.messaging, callback);
    return unsubscribe;
  }

  // Register event listeners
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Remove event listeners
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit events
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Register FCM token with backend
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const user = (await import('./firebase')).auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/notifications/fcm/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fcmToken: token,
          deviceType: 'web',
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register FCM token');
      }

      this.emit('tokenRegistered', { token });

    } catch (error) {
      console.error('Error registering FCM token:', error);
      this.emit('tokenRegistrationError', error);
    }
  }

  // Subscribe to topic
  async subscribeToTopic(topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getCurrentToken();
      if (!token) {
        return { success: false, error: 'No FCM token available' };
      }

      const user = (await import('./firebase')).auth.currentUser;
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/notifications/fcm/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fcmToken: token,
          topic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to topic');
      }

      this.emit('topicSubscribed', { topic });
      return { success: true };

    } catch (error: any) {
      console.error('Error subscribing to topic:', error);
      return { success: false, error: error.message };
    }
  }

  // Unsubscribe from topic
  async unsubscribeFromTopic(topic: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getCurrentToken();
      if (!token) {
        return { success: false, error: 'No FCM token available' };
      }

      const user = (await import('./firebase')).auth.currentUser;
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/notifications/fcm/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fcmToken: token,
          topic
        })
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe from topic');
      }

      this.emit('topicUnsubscribed', { topic });
      return { success: true };

    } catch (error: any) {
      console.error('Error unsubscribing from topic:', error);
      return { success: false, error: error.message };
    }
  }

  // Show local notification (fallback for when app is in foreground)
  showLocalNotification(payload: NotificationPayload): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/notification-icon.png',
        badge: payload.badge || '/icons/notification-badge.png',
        image: payload.image,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        timestamp: payload.timestamp || Date.now(),
        actions: payload.actions,
        data: payload.data
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Handle notification click based on data
        if (payload.data?.url) {
          window.open(payload.data.url, '_blank');
        }
        
        this.emit('notificationClick', { payload, event });
        notification.close();
      };

      // Auto-close after 10 seconds unless requireInteraction is true
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Initialize FCM for the current user
  async initialize(): Promise<void> {
    if (!this.messaging) return;

    try {
      // Set up foreground message listener
      this.onMessage((payload) => {
        console.log('Foreground message received:', payload);
        
        // Show local notification for foreground messages
        if (payload.notification) {
          this.showLocalNotification({
            title: payload.notification.title || 'Avanti',
            body: payload.notification.body || '',
            icon: payload.notification.icon,
            image: payload.notification.image,
            data: payload.data
          });
        }

        this.emit('messageReceived', payload);
      });

      // Request permission and get token
      const result = await this.requestPermissionAndGetToken();
      
      if (result.success) {
        console.log('FCM initialized successfully');
        this.emit('initialized', { token: result.token });
      } else {
        console.warn('FCM initialization failed:', result.error);
        this.emit('initializationFailed', { error: result.error });
      }

    } catch (error) {
      console.error('Error initializing FCM:', error);
      this.emit('initializationError', error);
    }
  }

  // Get notification permission status
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }
}

// Service Worker utilities
export class ServiceWorkerManager {
  // Register service worker for FCM
  static async registerServiceWorker(): Promise<{ success: boolean; registration?: ServiceWorkerRegistration; error?: string }> {
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'Service Worker not supported' };
    }

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      console.log('Service Worker registered successfully');
      return { success: true, registration };

    } catch (error: any) {
      console.error('Service Worker registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Update service worker
  static async updateServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('Service Worker updated');
      }
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }
}

// Notification templates
export const NotificationTemplates = {
  bookingConfirmed: (bookingId: string): NotificationPayload => ({
    title: 'Bokning bekräftad',
    body: `Din bokning #${bookingId.slice(-8)} har bekräftats`,
    icon: '/icons/booking-confirmed.png',
    tag: `booking-${bookingId}`,
    data: {
      type: 'booking',
      action: 'confirmed',
      bookingId,
      url: `/booking/${bookingId}`
    }
  }),

  driverAssigned: (driverName: string, bookingId: string): NotificationPayload => ({
    title: 'Förare tilldelad',
    body: `${driverName} kommer att hämta dig`,
    icon: '/icons/driver-assigned.png',
    tag: `booking-${bookingId}`,
    requireInteraction: true,
    data: {
      type: 'booking',
      action: 'driver_assigned',
      bookingId,
      driverName,
      url: `/tracking/${bookingId}`
    }
  }),

  driverArrived: (bookingId: string): NotificationPayload => ({
    title: 'Föraren har anlänt',
    body: 'Din förare väntar på dig',
    icon: '/icons/driver-arrived.png',
    tag: `booking-${bookingId}`,
    requireInteraction: true,
    data: {
      type: 'booking',
      action: 'driver_arrived',
      bookingId,
      url: `/tracking/${bookingId}`
    }
  }),

  paymentReceived: (amount: number, bookingId: string): NotificationPayload => ({
    title: 'Betalning mottagen',
    body: `Betalning på ${amount} SEK har genomförts`,
    icon: '/icons/payment-success.png',
    tag: `payment-${bookingId}`,
    data: {
      type: 'payment',
      action: 'received',
      bookingId,
      amount,
      url: `/booking/${bookingId}`
    }
  }),

  systemAlert: (message: string): NotificationPayload => ({
    title: 'Systemmeddelande',
    body: message,
    icon: '/icons/system-alert.png',
    tag: 'system-alert',
    requireInteraction: true,
    data: {
      type: 'system',
      action: 'alert',
      url: '/dashboard'
    }
  })
};

// Export singleton instance
export const firebaseMessaging = new FirebaseMessagingClient();

// Export utility functions
export const FCMUtils = {
  // Generate notification ID
  generateNotificationId: (): string => {
    return `fcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Validate FCM token format
  isValidFCMToken: (token: string): boolean => {
    return /^[A-Za-z0-9:_-]+$/.test(token) && token.length > 100;
  },

  // Get device type from user agent
  getDeviceType: (userAgent: string): 'web' | 'android' | 'ios' => {
    if (/Android/i.test(userAgent)) return 'android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    return 'web';
  },

  // Format notification for different platforms
  formatNotificationForPlatform: (payload: NotificationPayload, platform: 'web' | 'android' | 'ios'): any => {
    const base = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon
      },
      data: payload.data || {}
    };

    switch (platform) {
      case 'android':
        return {
          ...base,
          android: {
            notification: {
              ...base.notification,
              icon: payload.icon,
              color: '#6366f1', // Avanti brand color
              sound: 'default',
              channel_id: 'avanti-notifications'
            }
          }
        };

      case 'ios':
        return {
          ...base,
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body
                },
                badge: 1,
                sound: 'default'
              }
            }
          }
        };

      default:
        return base;
    }
  }
};

export default firebaseMessaging;
