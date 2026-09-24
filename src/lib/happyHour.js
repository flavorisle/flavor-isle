// Happy Hour utility — shared between cart, checkout, and menu display.
// All time checks use store-local (America/Chicago) time so the 2–6 PM window
// is correct regardless of the customer's device timezone.

import { chicagoNow } from './chicagoNow';

// Default config used when the MenuSetting record has no happy_hour object yet.
export const HAPPY_HOUR_DEFAULT = {
  active: true,
  start_time: '14:00',
  end_time: '18:00',
  discount_percent: 50,
  square_item_ids: ['MTOVX3FLW3QYAZRHAXMZMWYN'],
  label: 'Happy Hour — Unbeatable value on drinks',
};

// Merge the stored setting with defaults so missing fields don't break logic.
export function getHappyHourConfig(menuSetting) {
  const hh = menuSetting?.happy_hour;
  if (!hh) return HAPPY_HOUR_DEFAULT;
  return {
    ...HAPPY_HOUR_DEFAULT,
    ...hh,
    square_item_ids: Array.isArray(hh.square_item_ids) && hh.square_item_ids.length > 0
      ? hh.square_item_ids
      : HAPPY_HOUR_DEFAULT.square_item_ids,
  };
}

// Convert "HH:MM" to minutes since midnight.
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Is happy hour currently active right now (store-local time)?
export function isHappyHourActive(menuSetting) {
  const hh = getHappyHourConfig(menuSetting);
  if (!hh || !hh.active) return false;
  const now = chicagoNow();
  const start = timeToMinutes(hh.start_time);
  const end = timeToMinutes(hh.end_time);
  return now.totalMinutes >= start && now.totalMinutes < end;
}

// Calculate the happy hour discount amount for a set of cart items.
// Returns the total discount in dollars (0 if happy hour is off or no eligible items).
export function getHappyHourDiscount(cartItems, menuSetting) {
  if (!isHappyHourActive(menuSetting)) return 0;
  const hh = getHappyHourConfig(menuSetting);
  if (!hh) return 0;
  const pct = (hh.discount_percent || 0) / 100;
  if (pct <= 0) return 0;
  const ids = hh.square_item_ids || [];
  return (cartItems || [])
    .filter(item => ids.includes(item.square_item_id))
    .reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1) * pct, 0);
}

// Does a specific menu item qualify for happy hour right now?
export function isHappyHourItem(item, menuSetting) {
  if (!isHappyHourActive(menuSetting)) return false;
  const hh = getHappyHourConfig(menuSetting);
  if (!hh) return false;
  return (hh.square_item_ids || []).includes(item.square_item_id);
}

// Discounted price for a single menu item (base price only, no modifiers).
export function getHappyHourItemPrice(item, menuSetting) {
  const hh = getHappyHourConfig(menuSetting);
  if (!hh) return item.price;
  const pct = (hh.discount_percent || 0) / 100;
  return +(item.price * (1 - pct)).toFixed(2);
}

// Format the window for display, e.g. "2:00 PM – 6:00 PM"
export function formatHappyHourWindow(menuSetting) {
  const hh = getHappyHourConfig(menuSetting);
  if (!hh) return '';
  return `${formatTime12(hh.start_time)} – ${formatTime12(hh.end_time)}`;
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}