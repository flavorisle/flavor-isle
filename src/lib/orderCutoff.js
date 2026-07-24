const STORE_TZ = 'America/Chicago';

// Returns which order types are cut off for the night, based on the store's
// closing time and per-type cutoff windows (all in store-local time).
// Dine-in uses the pickup cutoff since it's an in-store order.
export function getCutoffStatus(setting) {
  const closing = setting?.closing_time || '20:00';
  const deliveryCutoff = setting?.delivery_cutoff_minutes ?? 30;
  const pickupCutoff = setting?.pickup_cutoff_minutes ?? 15;

  const [h, m] = closing.split(':').map(Number);
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: STORE_TZ }));
  const minsToClose = h * 60 + m - (now.getHours() * 60 + now.getMinutes());

  return {
    delivery: minsToClose < deliveryCutoff,
    pickup: minsToClose < pickupCutoff,
    dine_in: minsToClose < pickupCutoff,
    deliveryCutoff,
    pickupCutoff,
  };
}