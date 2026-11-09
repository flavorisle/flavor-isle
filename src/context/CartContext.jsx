import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMenuSetting } from '@/lib/menuSettings';
import { useAuth } from '@/lib/AuthContext';
import { hydrateDeluxeConfig } from '@/lib/deluxeConfig';
import { getCutoffStatus } from '@/lib/orderCutoff';
import { getHappyHourDiscount } from '@/lib/happyHour';
import { getFamilyBundleDiscount } from '@/lib/familyBundle';
import { toCents, fromCents, salesTaxCents } from '@/lib/tax';
import { trackAddToCart, foodItemToGa4 } from '@/lib/ga4Ecommerce';

const CartContext = createContext(null);

const SESSION_KEY = 'flavor-isle-cart';

const readSession = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed[key] ?? fallback;
  } catch {
    return fallback;
  }
};

// A cart line carrying combo data (comboConfigId / comboComponents) was priced
// with the combo discount baked into its price. Combos are switched OFF, so the
// server can no longer reprice such a line and checkout rejects the stale total
// ("Price verification failed: server X vs client Y"). Drop those lines when the
// cart loads — from sessionStorage and from the saved profile cart — so a stale
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

  // Persist the cart for the current browser session so a refresh or a trip
  // through login doesn't lose the order.
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ cartItems, orderType, pickupMethod }));
    } catch { /* storage unavailable */ }
  }, [cartItems, orderType, pickupMethod]);

  // Cross-device cart sync for signed-in customers. On mount we load the cart
  // saved to their CustomerProfile; on every change we debounce-save it back so
  // the same cart follows them across phones, tablets, and desktops. Guests
  // keep the sessionStorage behavior above.
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
  useEffect(() => {
    if (!hydratedRef.current || !profileRef.current) return;
    const snapshot = cartSnapshot(cartItems, orderType);
    // Nothing actually changed (e.g. just hydration) — leave savedAt alone.
    if (snapshot === persistedSnapshotRef.current) return;
    const timer = setTimeout(async () => {
      try {
        const payload = { cartItems, orderType, savedAt: Date.now() };
        const { email, id } = profileRef.current;
        if (id) {
          await base44.entities.CustomerProfile.update(id, { cart: payload });
        } else {
          const me = await base44.auth.me().catch(() => null);
          const created = await base44.entities.CustomerProfile.create({ email, name: me?.full_name || email, cart: payload });
          if (created?.id) profileRef.current.id = created.id;
        }
        persistedSnapshotRef.current = snapshot;
      } catch { /* offline or quota — sessionStorage still has it */ }
    }, 1500);
    return () => clearTimeout(timer);
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
    const noteKey = item.allergyNote ? `a${item.allergyNote}` : '';
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

  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    }
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