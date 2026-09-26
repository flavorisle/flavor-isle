import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMenuSetting } from '@/lib/menuSettings';
import { hydrateDeluxeConfig } from '@/lib/deluxeConfig';
import { getCutoffStatus } from '@/lib/orderCutoff';
import { getHappyHourDiscount } from '@/lib/happyHour';
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

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => dropComboLines(readSession('cartItems', [])));
  const [orderType, setOrderType] = useState(() => readSession('orderType', 'pickup')); // pickup | delivery | dine_in
  const [pickupMethod, setPickupMethod] = useState(() => readSession('pickupMethod', 'counter')); // counter | curbside (pickup only)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderingEnabled, setOrderingEnabledState] = useState(true);
  const [orderingClosedMessage, setOrderingClosedMessage] = useState('Ordering is temporarily closed');
  const [menuSetting, setMenuSetting] = useState(null);
  const [, setTick] = useState(0); // re-render every minute so cutoffs stay current

  // Group order state — when active, every added item is tagged with the person
  // currently being ordered for. The whole group shares ONE delivery fee + tax.
  const [groupMode, setGroupMode] = useState(() => readSession('groupMode', false));
  const [people, setPeople] = useState(() => readSession('people', [])); // [{ id, name }]
  const [activePersonId, setActivePersonId] = useState(() => readSession('activePersonId', null));

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
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ cartItems, orderType, pickupMethod, groupMode, people, activePersonId }));
    } catch { /* storage unavailable */ }
  }, [cartItems, orderType, pickupMethod, groupMode, people, activePersonId]);

  // Cross-device cart sync for signed-in customers. On mount we load the cart
  // saved to their CustomerProfile; on every change we debounce-save it back so
  // the same cart follows them across phones, tablets, and desktops. Guests
  // keep the sessionStorage behavior above.
  const profileRef = useRef(null); // { email, id } once the profile is loaded
  const hydratedRef = useRef(false);

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
        if (saved && Array.isArray(saved.cartItems) && saved.cartItems.length > 0 && !localHasItems) {
          setCartItems(dropComboLines(saved.cartItems));
          setOrderType(saved.orderType || 'pickup');
          setGroupMode(!!saved.groupMode);
          setPeople(saved.people || []);
          setActivePersonId(saved.activePersonId || null);
        }
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
    const timer = setTimeout(async () => {
      try {
        const payload = { cartItems, orderType, groupMode, people, activePersonId, savedAt: Date.now() };
        const { email, id } = profileRef.current;
        if (id) {
          await base44.entities.CustomerProfile.update(id, { cart: payload });
        } else {
          const me = await base44.auth.me().catch(() => null);
          const created = await base44.entities.CustomerProfile.create({ email, name: me?.full_name || email, cart: payload });
          if (created?.id) profileRef.current.id = created.id;
        }
      } catch { /* offline or quota — sessionStorage still has it */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [cartItems, orderType, groupMode, people, activePersonId]);

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

  const cutoffStatus = getCutoffStatus(menuSetting);

  // If delivery is paused, move anyone already set to delivery back to pickup.
  useEffect(() => {
    if (menuSetting?.delivery_enabled === false && orderType === 'delivery') {
      setOrderType('pickup');
    }
  }, [menuSetting, orderType]);

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
    const personKey = item.person_id ? `p${item.person_id}` : '';
    return mods || personKey ? `${item.id}__${personKey}${mods ? '|' : ''}${mods}` : item.id;
  };

  const activePerson = people.find(p => p.id === activePersonId) || null;

  const addItem = useCallback((item) => {
    trackAddToCart(foodItemToGa4(item));
    setCartItems(prev => {
      // Tag with the active person when in group mode (unless item already has one).
      const tagged = groupMode && !item.person_id
        ? { ...item, person_id: activePerson?.id, person_name: activePerson?.name }
        : item;
      const id = lineId(tagged);
      // Combos (alwaysUnique) never merge — always a fresh line.
      if (!tagged.alwaysUnique) {
        const existing = prev.find(i => i.id === id);
        if (existing) {
          return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
        }
      }
      return [...prev, { ...tagged, id, quantity: 1 }];
    });
  }, [groupMode, activePerson]);

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

  // Reassign an already-carted line to a different person (group mode).
  const reassignItem = useCallback((itemId, personId, personName) => {
    setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, person_id: personId, person_name: personName } : i));
  }, []);

  const clearCart = useCallback(() => { setCartItems([]); setAppliedReward(null); }, []);

  // Group order helpers
  const addPerson = useCallback((name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const existing = people.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setPeople(prev => [...prev, { id, name: trimmed }]);
    return id;
  }, [people]);

  const removePerson = useCallback((personId) => {
    setPeople(prev => prev.filter(p => p.id !== personId));
    setCartItems(prev => prev.map(i => i.person_id === personId ? { ...i, person_id: null, person_name: null } : i));
    setActivePersonId(prev => prev === personId ? null : prev);
  }, []);

  const startGroupOrder = useCallback(() => {
    setGroupMode(true);
    if (people.length === 0) {
      const id = `p-${Date.now()}`;
      setPeople([{ id, name: 'Me' }]);
      setActivePersonId(id);
    } else if (!activePersonId) {
      setActivePersonId(people[0].id);
    }
  }, [people, activePersonId]);

  const endGroupOrder = useCallback(() => {
    setGroupMode(false);
    setPeople([]);
    setActivePersonId(null);
    setCartItems(prev => prev.map(i => ({ ...i, person_id: null, person_name: null })));
  }, []);

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const happyHourDiscount = getHappyHourDiscount(cartItems, menuSetting);
  const adjustedSubtotal = subtotal - happyHourDiscount;
  const deliveryFee = orderType === 'delivery'
    ? Number(deliveryQuote?.fee ?? menuSetting?.delivery_fee ?? 0)
    : 0;
  const tax = adjustedSubtotal * 0.06;
  const total = adjustedSubtotal + deliveryFee + tax;

  // Per-person subtotal (group mode breakdown)
  const personSubtotals = people.map(p => {
    const personItems = cartItems.filter(i => i.person_id === p.id);
    return {
      ...p,
      subtotal: personItems.reduce((s, i) => s + i.price * i.quantity, 0),
      happyHourDiscount: getHappyHourDiscount(personItems, menuSetting),
      itemCount: personItems.reduce((s, i) => s + i.quantity, 0),
    };
  }).filter(p => p.itemCount > 0 || people.length > 0);
  const unassignedSubtotal = cartItems.filter(i => !i.person_id).reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, addItem, removeItem, updateQuantity, clearCart, reassignItem,
      orderType, setOrderType,
      pickupMethod, setPickupMethod,
      isCartOpen, setIsCartOpen,
      totalItems, subtotal, deliveryFee, tax, total,
      orderingEnabled, orderingClosedMessage,
      cutoffStatus,
      menuSetting,
      happyHourDiscount,
      groupMode, people, activePersonId, activePerson,
      startGroupOrder, endGroupOrder, addPerson, removePerson, setActivePersonId,
      personSubtotals, unassignedSubtotal,
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