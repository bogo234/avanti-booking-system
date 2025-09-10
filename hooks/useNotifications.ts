import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '../lib/firebase';

export const useNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        // Request permission
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);

        if (permissionResult === 'granted') {
          // Get FCM token
          const fcmToken = await requestNotificationPermission();
          setToken(fcmToken);
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    // Listen for foreground messages
    const unsubscribe = onMessageListener();
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const sendTestNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from Avanti',
        icon: '/favicon.ico'
      });
    }
  };

  return {
    token,
    permission,
    sendTestNotification
  };
};
