import * as webpushModule from 'npm:web-push@3.6.7';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './vapidKeys.ts';

// Deno's CommonJS interop can expose web-push either as named exports on the
// namespace or nested under `.default`. Resolve both shapes defensively.
const _wp = webpushModule.default || webpushModule;
const setVapidDetails = _wp.setVapidDetails || webpushModule.setVapidDetails;
const sendNotification = _wp.sendNotification || webpushModule.sendNotification;

console.log('web-push module shape:', JSON.stringify({
  hasDefault: !!webpushModule.default,
  wpKeys: Object.keys(_wp || {}),
  setVapidIsFn: typeof setVapidDetails,
  sendIsFn: typeof sendNotification,
  pubKeyLen: VAPID_PUBLIC_KEY?.length,
  privKeyLen: VAPID_PRIVATE_KEY?.length,
}));

let vapidConfigured = false;
function ensureVapid() {
  if (!vapidConfigured) {
    setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    console.log('VAPID details set successfully');
  }
}

// Sends a push payload to a list of PushSubscription records.
// Stale subscriptions (410/404) are cleaned up automatically.
export async function sendPushToSubscriptions(base44, subscriptions, payload) {
  ensureVapid();
  let sent = 0;
  const errors = [];
  for (const sub of subscriptions) {
    try {
      await sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      errors.push({
        message: err.message,
        statusCode: err.statusCode,
        body: err.body,
        endpoint: sub.endpoint?.slice(0, 50),
      });
      if (err.statusCode === 410 || err.statusCode === 404) {
        try {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
        } catch (_) { /* already gone */ }
      }
    }
  }
  return { sent, errors };
}

// Sends a push to every subscription belonging to a given customer email.
export async function sendPushToEmail(base44, email, payload) {
  if (!email) return { sent: 0, errors: [] };
  const subs = await base44.asServiceRole.entities.PushSubscription.filter({ email });
  return sendPushToSubscriptions(base44, subs, payload);
}

// Broadcasts a push to every stored subscription (used for promo blasts).
export async function broadcastPush(base44, payload) {
  const subs = await base44.asServiceRole.entities.PushSubscription.list();
  return sendPushToSubscriptions(base44, subs, payload);
}