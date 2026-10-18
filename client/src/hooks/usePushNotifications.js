import { useEffect, useRef } from 'react';
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
 * Hook to automatically register and synchronize Web Push Notifications
 * so incoming calls wake up the user's phone even when the app/browser is closed.
 */
export const usePushNotifications = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || registeredRef.current) return;

    const setupPush = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
          return;
        }

        // Request notification permission if not yet decided
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') {
          return;
        }

        // Wait for Service Worker to be active
        const registration = await navigator.serviceWorker.ready;

        // Fetch server's VAPID public key
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const keyRes = await fetch('/api/users/push-key', { headers });
        if (!keyRes.ok) return;

        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        // Check if an existing subscription is already active
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(publicKey);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          });
        }

        // Save subscription on server
        if (subscription) {
          await fetch('/api/users/push-subscribe', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription: subscription.toJSON() })
          });
          registeredRef.current = true;
        }
      } catch (err) {
        console.warn('[PushNotifications] Push registration notice:', err.message);
      }
    };

    setupPush();
  }, [user]);
};
