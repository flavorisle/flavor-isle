// Meta Pixel event helpers for the Facebook pixel loaded in index.html
// (Pixel ID 2006793429980228). Mirrors the GA4 ecommerce events so both
// platforms receive the same user actions at the same time.
//
// Every helper no-ops when window.fbq is unavailable (SSR, ad blockers,
// preview) AND when the visitor has not granted consent via the cookie
// banner — matching the existing fbq('consent', 'grant'/'revoke') gate
// in ConsentBanner.jsx.

const CURRENCY = 'USD';
const CONSENT_KEY = 'flavor_isle_consent_v1';

function hasConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

function fbq(eventName, params) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (!hasConsent()) return;
  try {
    window.fbq('track', eventName, { currency: CURRENCY, ...params });
  } catch {
    /* never let analytics throw into the UI */
  }
}

// ── Item mappers (from GA4 item shape) ──

function ga4ToContents(items) {
  return (items || []).map((i) => ({
    id: String(i.item_id || ''),
    quantity: Number(i.quantity) || 1,
    item_price: Number(i.price) || 0,
  }));
}

function ga4ToContentIds(items) {
  return (items || []).map((i) => String(i.item_id || ''));
}

function totalQuantity(items) {
  return (items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
}

// ── Event helpers ──

export function fbqPageView() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (!hasConsent()) return;
  try {
    window.fbq('track', 'PageView');
  } catch {
    /* never let analytics throw into the UI */
  }
}

export function fbqViewContent(item, value) {
  fbq('ViewContent', {
    content_ids: ga4ToContentIds([item]),
    content_type: 'product',
    content_name: item.item_name,
    value: value ?? (Number(item.price) || 0),
  });
}

export function fbqAddToCart(item, value) {
  fbq('AddToCart', {
    content_ids: ga4ToContentIds([item]),
    content_type: 'product',
    value: value ?? Number(((item.price || 0) * (item.quantity || 1)).toFixed(2)),
    contents: ga4ToContents([item]),
  });
}

export function fbqInitiateCheckout(items, value) {
  fbq('InitiateCheckout', {
    value,
    num_items: totalQuantity(items),
    contents: ga4ToContents(items),
  });
}

export function fbqPurchase(items, value) {
  fbq('Purchase', {
    value,
    num_items: totalQuantity(items),
    contents: ga4ToContents(items),
    content_type: 'product',
  });
}