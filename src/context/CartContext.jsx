import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMenuSetting, deliveryStatus } from '@/lib/menuSettings';
import { useAuth } from '@/lib/AuthContext';
import { hydrateDeluxeConfig } from '@/lib/deluxeConfig';
import { getCutoffStatus } from '@/lib/orderCutoff';
import { getHappyHourDiscount } from '@/lib/happyHour';
import { getFamilyBundleDiscount } from '@/lib/familyBundle';
import { comboGroupStatus, dissolveLine } from '@/lib/comboIsle';
import { toCents, fromCents, salesTaxCents } from '@/lib/tax';
import { trackAddToCart, foodItemToGa4 } from '@/lib/ga4Ecommerce';

const CartContext = createContext(null);

const SESSION_KEY = 'flavor-isle-cart';

// Guests' carts live in localStorage under the same key with a 7-day expiry
// (issue #337) — sessionStorage lost the order the moment the tab closed. The
// stored shape is unchanged apart from expiresAt.
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const readSessionStore = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An expired cart is dropped on sight.
      if (typeof parsed?.expiresAt === 'number' && parsed.expiresAt < Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    }
  } catch { /* storage unavailable */ }
  // One-time migration of a cart saved under the old sessionStorage key.
  try {
    const legacy = sessionStorage.getItem(SESSION_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, expiresAt: Date.now() + SESSION_TTL_MS }));
    sessionStorage.removeItem(SESSION_KEY);
    return parsed;
  } catch {
    return null;
  }
};

const readSession = (key, fallback) => {
  const parsed = readSessionStore();
  return parsed?.[key] ?? fallback;
};

const writeSession = (data) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, expiresAt: Date.now() + SESSION_TTL_MS }));
  } catch { /* storage unavailable */ }
};

// A cart line carrying combo data (comboConfigId / comboComponents) was priced
// with the combo discount baked into its price. Combos are switched OFF, so the
// server can no longer reprice such a line and checkout rejects the stale total
// ("Price verification failed: server X vs client Y"). Drop those lines when the
// cart loads — from the local cart and from the saved profile cart — so a stale
// combo line can never be carried into checkout. Every other line is untouched.
const dropComboLines = (items) =>
  (items || []).filter(i => !i?.comboConfigId && !i?.comboComponents);

// Stable serialization of what the customer actually chose: item id, quantity,
// selected modifier ids and the order type. Hydration always builds a NEW array
// (same contents), so comparing object identity made every page load look like
// an edit and rewrote cart.savedAt — which re-triggered the reminder email
// (issue #160). Two carts with the same contents serialize identically.
const cartSnapshot = (items, type) =>
  JSON.stringify({
    type,
    lines: (items || [])
      .map(i => `${i.productId || i.id}|${i.quantity}|${(i.selectedModifiers || [])
        .map(m => m.id || m.name)
        .sort()
        .join(',')}`)
      .sort(),
  });

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => dropComboLines(readSession('cartItems', [])));
  const [orderType, setOrderType] = useState(() => readSession('orderType', 'pickup')); // pickup | delivery | dine_in
  const [pickupMethod, setPickupMethod] = useState(() => readSession('pickupMethod', 'counter')); // counter | curbside (pickup only)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderingEnabled, setOrderingEnabledState] = useState(true);
  const [orderingClosedMessage, setOrderingClosedMessage] = useState('Ordering is temporarily closed');
  const [menuSetting, setMenuSetting] = useState(null);
  const [, setTick] = useState(0); // re-render every minute so cutoffs stay current

  // A signed-in admin can always order — after hours, during an admin closure,
  // and even with the all-ordering switch off — so the owner can place a test
  // order while the store is shut to customers. Everyone else is unaffected.
  const { user } = useAuth();
  const adminOrdering = user?.role === 'admin';

  // Applied Star Rewards discount — shared between the cart drawer (where the
  // customer picks a reward) and checkout (where it reduces the total).
  const [appliedReward, setAppliedReward] = useState(null);

  // Distance-based delivery quote — set by checkout once the customer's
  // address is quoted ({ fee, distance_miles, out_of_range }). When present,
  // it overrides the flat delivery_fee for delivery orders.
  const [deliveryQuote, setDeliveryQuote] = useState(null);

  // ── Cross-tab cart sync (issue #337) ──
  // Two tabs used to hold two separate carts and both wrote the same
  // CustomerProfile, so the last tab to type won. One cart now follows the
  // customer across tabs: every change is posted on a BroadcastChannel and
  // applied here, with a storage-event fallback for browsers without one.
  const tabIdRef = useRef(Math.random().toString(36).slice(2));
  const channelRef = useRef(null);
  const lastSyncRef = useRef(0);
  const broadcastFirstRef = useRef(true);
  // Set while a cart that arrived from another tab is being applied: that cart
  // is already stored, so this tab must neither write it back nor post it again
  // or the two tabs would bounce the same cart between them forever.
  const skipPersistRef = useRef(false);
  const skipPostRef = useRef(false);

  const applyRemoteCart = (items, type) => {
    skipPersistRef.current = true;
    skipPostRef.current = true;
    setCartItems(dropComboLines(items || []));
    setOrderType(type || 'pickup');
  };

  // Persist the cart locally so a refresh, a trip through login, or a closed tab
  // doesn't lose the order (guests keep it 7 days — see writeSession).
  useEffect(() => {
    if (skipPersistRef.current) { skipPersistRef.current = false; return; }
    writeSession({ cartItems, orderType, pickupMethod });
  }, [cartItems, orderType, pickupMethod]);

  // Open the channel once and clean it up.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('flavor-isle-cart');
    channelRef.current = ch;
    ch.onmessage = (e) => {
      const m = e.data;
      if (!m || m.type !== 'cart' || m.tabId === tabIdRef.current) return;
      if ((m.at || 0) <= lastSyncRef.current) return;
      lastSyncRef.current = m.at;
      applyRemoteCart(m.items, m.orderType);
    };
    return () => { try { ch.close(); } catch { /* already closed */ } channelRef.current = null; };
  }, []);

  // Post every cart change, skipping the first render so hydration does not
  // look like an edit.
  useEffect(() => {
    if (broadcastFirstRef.current) { broadcastFirstRef.current = false; return; }
    if (skipPostRef.current) { skipPostRef.current = false; return; }
    const at = Date.now();
    lastSyncRef.current = at;
    try {
      channelRef.current?.postMessage({ type: 'cart', tabId: tabIdRef.current, items: cartItems, orderType, at });
    } catch { /* channel gone */ }
  }, [cartItems, orderType]);

  // Fallback where BroadcastChannel does not exist: another tab's write to the
  // shared cart key fires a storage event here, and this tab adopts it.
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') return;
    const onStorage = (e) => {
      if (e.key !== SESSION_KEY || e.newValue == null) return;
      const at = Date.now();
      if (at <= lastSyncRef.current) return;
      lastSyncRef.current = at;
      applyRemoteCart(readSession('cartItems', []), readSession('orderType', 'pickup'));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Cross-device cart sync for signed-in customers. On mount we load the cart
  // saved to their CustomerProfile; on every change we debounce-save it back so
  // the same cart follows them across phones, tablets, and desktops. Guests
  // keep the local cart behavior above.
  const profileRef = useRef(null); // { email, id } once the profile is loaded
  const hydratedRef = useRef(false);
  // Snapshot of the cart already saved to the profile — a load that changes
  // nothing must not write, so savedAt stays put (issue #160).
  const persistedSnapshotRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authed = await base44.auth.isAuthenticated().catch(() => false);
      if (!authed || cancelled) return;
      const me = await base44.auth.me().catch(() => null);
      if (!me || cancelled) return;
      try {
        const profiles = await base44.entities.CustomerProfile.filter({ email: me.email });
        if (cancelled) return;
        const p = profiles?.[0];
        profileRef.current = { email: me.email, id: p?.id || null };
        const saved = p?.cart;
        // Only hydrate from the server when this browser doesn't already have a
        // cart in progress, so we never clobber an order the user is actively building.
        const localHasItems = (readSession('cartItems', []) || []).length > 0;
        let hydratedItems = dropComboLines(readSession('cartItems', []));
        let hydratedType = readSession('orderType', 'pickup');
        if (saved && Array.isArray(saved.cartItems) && saved.cartItems.length > 0 && !localHasItems) {
          hydratedItems = dropComboLines(saved.cartItems);
          hydratedType = saved.orderType || 'pickup';
          setCartItems(hydratedItems);
          setOrderType(hydratedType);
        }
        // What is already persisted: this page load must not look like an edit.
        persistedSnapshotRef.current = cartSnapshot(hydratedItems, hydratedType);
      } catch { /* profile not available yet */ }
      finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced save back to the profile so other devices pick up the latest cart.
  // A save that fails is retried once, and if that fails too the same write is
  // attempted one last time as the page goes away (issue #337) — otherwise the
  // cart silently stopped following the customer to another device.
  useEffect(() => {
    if (!hydratedRef.current || !profileRef.current) return;
    const snapshot = cartSnapshot(cartItems, orderType);
    // Nothing actually changed (e.g. just hydration) — leave savedAt alone.
    if (snapshot === persistedSnapshotRef.current) return;
    let flushOnHide = null;
    const timer = setTimeout(async () => {
      const payload = { cartItems, orderType, savedAt: Date.now() };
      const write = async () => {
        const { email, id } = profileRef.current;
        if (id) {
          await base44.entities.CustomerProfile.update(id, { cart: payload });
        } else {
          const me = await base44.auth.me().catch(() => null);
          const created = await base44.entities.CustomerProfile.create({ email, name: me?.full_name || email, cart: payload });
          if (created?.id) profileRef.current.id = created.id;
        }
      };
      const attempt = async () => {
        try { await write(); return true; } catch { return false; }
      };
      if (await attempt()) { persistedSnapshotRef.current = snapshot; return; }
      // One retry, two seconds later.
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (await attempt()) { persistedSnapshotRef.current = snapshot; return; }
      // Both attempts failed: try the same write once more as the page goes away.
      flushOnHide = async () => {
        window.removeEventListener('pagehide', flushOnHide);
        if (await attempt()) persistedSnapshotRef.current = snapshot;
      };
      window.addEventListener('pagehide', flushOnHide);
    }, 1500);
    return () => {
      clearTimeout(timer);
      if (flushOnHide) window.removeEventListener('pagehide', flushOnHide);
    };
  }, [cartItems, orderType]);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        hydrateDeluxeConfig(s.deluxe);
        setMenuSetting(s);
        setOrderingEnabledState(s.ordering_enabled !== false);
        if (s.ordering_closed_message) setOrderingClosedMessage(s.ordering_closed_message);
      })
      .catch(() => {});
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const cutoffStatusRaw = getCutoffStatus(menuSetting);
  // Admins are never cut off — every order type stays open to them.
  const cutoffStatus = adminOrdering
    ? { ...cutoffStatusRaw, delivery: false, pickup: false, dine_in: false }
    : cutoffStatusRaw;

  // Issue #297 Part C: the pickup fallback carries the admin's own sentence, so
  // a customer bounced back to pickup reads why in the store's words.
  const deliveryPausedNotice = deliveryStatus(menuSetting).message;

  // If delivery is paused, move anyone already set to delivery back to pickup.
  useEffect(() => {
    if (menuSetting?.delivery_enabled === false && orderType === 'delivery') {
      setOrderType('pickup');
    }
  }, [menuSetting, orderType]);

  // Curbside starts OFF (issue #122): unless the switch is on, a saved curbside
  // selection falls back to counter pickup — same bounce as delivery above.
  useEffect(() => {
    if (menuSetting?.curbside_enabled !== true && pickupMethod === 'curbside') {
      setPickupMethod('counter');
    }
  }, [menuSetting, pickupMethod]);

  // Different modifier combos on the same menu item become separate lines,
  // so each selection's modifiers are preserved and displayed.
  // Combo builder items (alwaysUnique) are NEVER merged — each built combo is
  // its own line so custom-named multiples don't collapse into one quantity.
  const lineId = (item) => {
    if (item.alwaysUnique) {
      return `${item.id}__${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    const mods = (item.selectedModifiers || [])
      .map(m => `${m.name}:${m.price ?? 0}`)
      .sort()
      .join('|');
    // A customer's per-item allergy note joins the line key, so two of the same
    // shake with different allergies stay separate lines instead of merging.
    const noteKey = `${item.allergyNote ? `a${item.allergyNote}` : ''}${item.saltNote ? `s${item.saltNote}` : ''}`;
    const flavorKey = item.flavorLevel ? `|f${item.flavorLevel}` : '';
    return mods || noteKey || flavorKey ? `${item.id}__${noteKey}${flavorKey}${mods ? '|' : ''}${mods}` : item.id;
  };

  const addItem = useCallback((item) => {
    trackAddToCart(foodItemToGa4(item));
    setCartItems(prev => {
      const id = lineId(item);
      // Combos (alwaysUnique) never merge — always a fresh line.
      if (!item.alwaysUnique) {
        const existing = prev.find(i => i.id === id);
        if (existing) {
          return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
        }
      }
      // initialQuantity lets a bundle add a multi-unit line (the Weekend Party
      // Pack's twelve minis) as ONE line; everything else is a single unit.
      const qty = Math.max(1, Math.floor(Number(item.initialQuantity) || 1));
      return [...prev, { ...item, id, quantity: qty }];
    });
  }, []);

  // A box that lost an item is no longer a box (Wesley, Nov 15 2026, 8:03 AM):
  // whatever is left of it goes back to being ordinary singles at their full
  // Square price, with no box number for the kitchen to read.
  const brokenBoxKey = Array.from(comboGroupStatus(cartItems).broken).sort().join('|');
  useEffect(() => {
    if (!brokenBoxKey) return;
    setCartItems(prev => {
      const { broken } = comboGroupStatus(prev);
      if (!broken.size) return prev;
      return prev.map(i => (i.comboGroup && broken.has(i.comboGroup) ? dissolveLine(i) : i));
    });
  }, [brokenBoxKey]);

  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.id !== itemId));
      return;
    }
    setCartItems(prev => {
      const line = prev.find(i => i.id === itemId);
      // Changing the count of anything inside a Combo Isle box ends that box: a
      // box is only ever made by the builder, so the rest sell as singles.
      if (line?.comboGroup) {
        const next = prev
          .filter(i => i.id !== itemId)
          .map(i => (i.comboGroup === line.comboGroup ? dissolveLine(i) : i));
        return next;
      }
      return prev.map(i => i.id === itemId ? { ...i, quantity } : i);
    });
  }, []);

  const clearCart = useCallback(() => { setCartItems([]); setAppliedReward(null); }, []);

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const happyHourDiscount = getHappyHourDiscount(cartItems, menuSetting);
  // The family bundle's lines carry the full a-la-carte prices and the fixed
  // bundle discount comes off here, so the discounted subtotal is exactly the
  // bundle price plus any paid extras the customer chose. Recomputed from the
  // cart lines, so editing or removing a bundle line can never leave a stale
  // discount behind.
  const bundleDiscount = getFamilyBundleDiscount(cartItems);
  const adjustedSubtotal = subtotal - happyHourDiscount - bundleDiscount;
  const deliveryFee = orderType === 'delivery'
    ? Number(deliveryQuote?.fee ?? menuSetting?.delivery_fee ?? 0)
    : 0;
  // Tax and total in WHOLE CENTS, rounded half up (see @/lib/tax) — the same
  // rule the server verifies with. Float math here used to round the half-cent
  // down in the total while the tax line displayed it rounded up, so a single
  // $3.25 item ($3.25 × 6% = $0.195) showed $0.20 tax on a $3.44 total and was
  // rejected as a mismatch against the server's $3.45.
  const taxCentsValue = salesTaxCents(toCents(adjustedSubtotal));
  const tax = fromCents(taxCentsValue);
  const total = fromCents(toCents(adjustedSubtotal) + toCents(deliveryFee) + taxCentsValue);

  return (
    <CartContext.Provider value={{
      cartItems, addItem, removeItem, updateQuantity, clearCart,
      orderType, setOrderType,
      pickupMethod, setPickupMethod,
      isCartOpen, setIsCartOpen,
      totalItems, subtotal, deliveryFee, tax, total,
      orderingEnabled: adminOrdering || orderingEnabled, orderingClosedMessage,
      cutoffStatus,
      deliveryPausedNotice,
      menuSetting,
      happyHourDiscount,
      bundleDiscount,
      appliedReward, setAppliedReward,
      deliveryQuote, setDeliveryQuote,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};