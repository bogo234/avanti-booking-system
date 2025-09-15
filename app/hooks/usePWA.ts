import { useState, useEffect, useCallback } from 'react';
// import { messaging, vapidKey, requestNotificationPermission } from '../../lib/firebase';



interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  isSupported: boolean;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if app is installed
  const checkInstallStatus = useCallback(() => {
    const isInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    setPwaState(prev => ({ ...prev, isInstalled }));
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setSwRegistration(registration);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setPwaState(prev => ({ ...prev, hasUpdate: true }));
            }
          });
        }
      });

      // Handle controller change (app update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }, []);

  // Request notification permission
  const requestNotifications = useCallback(async () => {
    if (!pwaState.isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // const token = await requestNotificationPermission();
      // if (token) {
      //   console.log('Notification permission granted, token:', token);
      //   return true;
      // }
      console.log('Push notifications temporarily disabled');
      return false;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [pwaState.isSupported]);

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installed successfully');
        setPwaState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
        setDeferredPrompt(null);
        return true;
      } else {
        console.log('PWA installation dismissed');
        return false;
      }
    } catch (error) {
      console.error('PWA installation failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update app
  const updateApp = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [swRegistration]);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
      setPwaState(prev => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setPwaState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize PWA
  useEffect(() => {
    checkInstallStatus();
    registerServiceWorker();
  }, [checkInstallStatus, registerServiceWorker]);

  return {
    ...pwaState,
    installPWA,
    updateApp,
    requestNotifications,
    swRegistration,
  };
}

// Hook for push notifications
export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported('PushManager' in window && 'serviceWorker' in navigator);
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      // const newToken = await requestNotificationPermission();
      // if (newToken) {
      //   setToken(newToken);
      //   setPermission('granted');
      //   return true;
      // }
      console.log('Push notifications temporarily disabled');
      return false;
    } catch (error) {
      console.error('Failed to request push permission:', error);
      return false;
    }
  }, [isSupported]);

  const subscribeToMessages = useCallback(() => {
    // if (!messaging) return () => {};

    // const unsubscribe = messaging.onMessage((payload) => {
    //   console.log('Message received:', payload);
      
    //   // Show notification in foreground
    //   if (payload.notification) {
    //     new Notification(payload.notification.title || 'Avanti', {
    //       body: payload.notification.body,
    //       icon: '/icons/icon-192x192.png',
    //       badge: '/icons/icon-72x72.png',
    //       tag: 'avanti-notification',
    //     });
    //   }
    // });

    // return unsubscribe;
    console.log('Push messaging temporarily disabled');
    return () => {};
  }, []);

  return {
    isSupported,
    permission,
    token,
    requestPermission,
    subscribeToMessages,
  };
}
