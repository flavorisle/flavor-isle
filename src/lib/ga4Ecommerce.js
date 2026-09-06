// GA4 ecommerce event helpers for the Google tag loaded in index.html
// (measurement ID G-SHXK97DNTD). Pushes the standard GA4 ecommerce events
// so the Monetization and Ecommerce Purchases reports populate for both
// the food ordering flow and the Tasty Threads merch store.
//
// Every helper no-ops when gtag is unavailable (SSR, ad blockers, preview)
// so tracking can never break the ordering flow.

const CURRENCY = 'USD';

function gtag() {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  try {
    window.gtag(...arguments);
  } catch {
    /* never let analytics throw into the UI */
  }
}

// ── Item mappers ──

// Food cart / menu item → GA4 item shape.
export function foodItemToGa4(item) {
  return {
    item_id: item.square_item_id || item.catalog_object_id || item.id || item.name,
    item_name: item.name,
    item_category: item.display_category || item.category || 'Food',
    price: Number(item.price) || 0,
    quantity: item.quantity || 1,
  };
}

// Tasty Threads (Printful) item → GA4 item shape.
export function merchItemToGa4(item) {
  const variant = [item.color, item.size].filter(Boolean).join(' / ') || item.variantName || '';
  return {
    item_id: String(item.sync_variant_id || item.variant_id || item.productId || item.id || ''),
    item_name: item.name,
    item_category: 'Merch',
    price: Number(item.price) || 0,
    quantity: item.quantity || 1,
    item_variant: variant,
  };
}

// ── Event helpers ──

export function trackViewItemList(items, { item_list_id, item_list_name } = {}) {
  gtag('event', 'view_item_list', {
    item_list_id,
    item_list_name,
    items,
  });
}

export function trackViewItem(item, { value } = {}) {
  gtag('event', 'view_item', {
    currency: CURRENCY,
    value: value ?? item.price,
    items: [item],
  });
}

export function trackAddToCart(item, { value } = {}) {
  gtag('event', 'add_to_cart', {
    currency: CURRENCY,
    value: value ?? Number((item.price * (item.quantity || 1)).toFixed(2)),
    items: [item],
  });
}

export function trackViewCart(items, value) {
  gtag('event', 'view_cart', {
    currency: CURRENCY,
    value,
    items,
  });
}

export function trackBeginCheckout(items, value, { coupon } = {}) {
  gtag('event', 'begin_checkout', {
    currency: CURRENCY,
    value,
    coupon,
    items,
  });
}

export function trackPurchase(items, { transaction_id, value, tax, shipping, coupon } = {}) {
  gtag('event', 'purchase', {
    transaction_id,
    currency: CURRENCY,
    value,
    tax,
    shipping,
    coupon,
    items,
  });
}