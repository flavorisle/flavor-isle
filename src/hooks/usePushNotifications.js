import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { VAPID_PUBLIC_KEY } from '@/lib/pushConfig';
import { useAuth } from '@/lib/AuthContext';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function usePushNotifications() {
  const { user } = useAuth();
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      if (!reg || !active) return;
      const sub = await reg.pushManager.getSubscription();
      if (active && sub) setSubscribed(true);
    }).catch(() => {});
    return () => { active = false; };
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !user) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      let reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON ? sub.toJSON() : { endpoint: sub.endpoint, keys: sub.keys };
      await base44.functions.invoke('subscribePush', {
        endpoint: json.endpoint,
        keys: json.keys,
      });
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }, [supported, user]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      await base44.functions.invoke('unsubscribePush', {});
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}