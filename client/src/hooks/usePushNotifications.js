import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook to manage Web Push Notifications with explicit User Gesture request
 * so incoming calls wake up the user's phone even when the app/browser is closed.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permissionState, setPermissionState] = useState(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      window.isSecureContext;
    setIsSupported(!!supported);

    if (typeof Notification !== 'undefined') {
      setPermissionState(Notification.permission);
    }
  }, []);

  const registerSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

      const registration = await navigator.serviceWorker.ready;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const keyRes = await fetch('/api/users/push-key', { headers });
      if (!keyRes.ok) return false;

      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      if (subscription) {
        await fetch('/api/users/push-subscribe', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });
        setIsSubscribed(true);
        return true;
      }
    } catch (err) {
      console.warn('[PushNotifications] Registration error:', err);
    }
    return false;
  }, []);

  // If permission is ALREADY granted, auto-register without prompting
  useEffect(() => {
    if (user && isSupported && Notification.permission === 'granted') {
      registerSubscription();
    }
  }, [user, isSupported, registerSubscription]);

  // Request notification permission directly from a user gesture (button click)
  const requestCallNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return false;

    if (!window.isSecureContext) {
      alert(
        'Incoming call ringing when app is closed requires a secure connection (HTTPS or localhost). If testing across mobile devices, please open via HTTPS or deploy to production.'
      );
      return false;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Push notifications are not supported by this browser. Please use Chrome on Android or Safari on iOS 16.4+');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === 'granted') {
        const success = await registerSubscription();
        if (success) {
          alert('✓ Call ringing enabled! Your phone will now ring for incoming calls even when PulseChat is closed.');
        }
        return success;
      } else if (permission === 'denied') {
        alert(
          'Notifications were denied. Please tap the lock/settings icon in your browser address bar and set Notifications to "Allow" to enable incoming call ringing.'
        );
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
    }
    return false;
  }, [registerSubscription]);

  return {
    permissionState,
    isSubscribed,
    isSupported,
    requestCallNotifications
  };
};
