import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { VAPID_PUBLIC_KEY } from '@/lib/pushConfig';
import { useAuth } from '@/lib/AuthContext';
import { detectPushCapability, pushPermission } from '@/lib/pushCapability';

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
  const capability = detectPushCapability();
  const supported = capability.canSubscribe;
  const [permission, setPermission] = useState(pushPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(supported);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) { setChecking(false); return; }
    let active = true;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (active) {
        setSubscribed(!!sub);
        setChecking(false);
      }
    }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [supported]);

  // `orderNumber` (optional) lets a guest who just ordered tie the subscription
  // to that order's email; the server re-checks the pair before storing it.
  /**
   * @param {{ email?: string, orderNumber?: string }} [options]
   */
  const subscribe = useCallback(async (options = {}) => {
    const { email, orderNumber } = options;
    if (!supported) return { ok: false, reason: 'unsupported' };
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { ok: false, reason: 'permission' };

      let reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Clear any existing subscription (it may have been created with an
      // older VAPID key, which would make every send fail).
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON ? sub.toJSON() : { endpoint: sub.endpoint, keys: /** @type {any} */ (sub).keys };
      const res = await base44.functions.invoke('subscribePush', {
        endpoint: json.endpoint,
        keys: json.keys,
        email: email || undefined,
        order_number: orderNumber || undefined,
        platform: capability.isIOS ? 'ios' : 'other',
      });
      if (res?.data?.error) return { ok: false, reason: 'server', error: res.data.error };
      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'error', error: err?.message };
    } finally {
      setLoading(false);
    }
  }, [supported, capability.isIOS]);

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

  return {
    ...capability,
    supported,
    permission,
    subscribed,
    checking,
    loading,
    isLoggedIn: !!user,
    subscribe,
    unsubscribe,
  };
}
