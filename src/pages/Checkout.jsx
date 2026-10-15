import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Bike, Utensils, AlertCircle, Clock, Pencil } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toCents, fromCents, salesTaxFor } from '@/lib/tax';
import { getFamilyBundleDiscount } from '@/lib/familyBundle';
import { SHAKE_CATEGORIES } from '@/lib/findSmashie';

import { base44 } from '@/api/base44Client';

import SchedulePicker from '@/components/checkout/SchedulePicker';
import SavedAddressField from '@/components/checkout/SavedAddressField';
import CheckoutTrustBadges from '@/components/checkout/CheckoutTrustBadges';
import CheckoutLoyaltyBox from '@/components/checkout/CheckoutLoyaltyBox';
import CurbsideVehicleFields from '@/components/checkout/CurbsideVehicleFields';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import CartItemModifiers from '@/components/CartItemModifiers';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary, DAY_KEYS, formatTime12 } from '@/lib/businessHours';
import useLiveStatus from '@/hooks/useLiveStatus';
import { trackBeginCheckout, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import { SMS_POLICY_URL, SMS_TERMS_URL, TRANSACTIONAL_DISCLOSURE_TEXT, SMS_CONSENT_VERSION } from '@/lib/smsConsent';
import { getActiveReferralCode } from '@/lib/referral';
import useInlineCardPay from '@/hooks/useInlineCardPay';
import InlineCardFields from '@/components/checkout/InlineCardFields';

const ORDER_TYPE_LABELS = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };
const orderTypeLabel = (orderType, pickupMethod) =>
  orderType === 'pickup' && pickupMethod === 'curbside' ? 'Curbside Pickup' : ORDER_TYPE_LABELS[orderType];

export default function Checkout() {
  const { cartItems, orderType, setOrderType, pickupMethod, subtotal, deliveryFee, tax, total, orderingEnabled, orderingClosedMessage, cutoffStatus, appliedReward, setAppliedReward, deliveryQuote, setDeliveryQuote, happyHourDiscount, bundleDiscount } = useCart();
  const navigate = useNavigate();

  const {
    startPayment: startCardPay,
    resetCardForm,
    form: cardForm,
    starting: openingCardForm,
    error: cardFormError,
  } = useInlineCardPay();

  const businessHours = useBusinessHours();
  const { level, waitMin } = useLiveStatus();
  // Kitchen prep estimate scales with the live busyness level so checkout
  // ready times match what the hero/status bar advertise. Uses the regressed
  // wait from the backend so it eases back to normal as inflow slows.
  const prepMinutes = waitMin || 20;
  const storeClosed = orderingEnabled && cutoffStatus.delivery && cutoffStatus.pickup && cutoffStatus.dine_in;

  // The order this customer already saved but has not paid yet — a declined card, or
  // a payment page they closed. Tapping again sends them back to that same saved
  // order's own page rather than leaving a second unpaid one behind; anything that
  // changes what is being ordered drops it, so the amount they pay always matches
  // what is on the screen.
  const [pendingOrder, setPendingOrder] = useState(null);

  // Before the store opens for pickup, ready times are clamped to opening —
  // show "from {open}" on the order-type tiles instead of a minute estimate.
  const orderNow = new Date();
  const orderDayKey = DAY_KEYS[(orderNow.getDay() + 6) % 7];
  const orderTodayHours = businessHours?.[orderDayKey] || {};
  const beforeStoreOpen = !orderTodayHours.closed && orderTodayHours.open && (() => {
    const [oh, om] = orderTodayHours.open.split(':').map(Number);
    const so = new Date(orderNow); so.setHours(oh, om, 0, 0);
    return orderNow < so;
  })();
  const openFromLabel = beforeStoreOpen ? `from ${formatTime12(orderTodayHours.open)}` : null;

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', table: '', instructions: '', allergy: '' });
  const [smsConsent, setSmsConsent] = useState(false);
  const [loyaltyOptIn, setLoyaltyOptIn] = useState(false);
  // Referral code from a friend's ?ref= link (issue #83). Read once on mount and
  // carried on the order payload so the referrer earns their 50 Stars.
  const [referralCode] = useState(() => getActiveReferralCode());
  // Allergy notification — when ticked, the allergy text is required and goes to
  // the top of the order notes prefixed "ALLERGY:".
  const [hasAllergy, setHasAllergy] = useState(false);
  const [vehicle, setVehicle] = useState({ color: '', make: '', model: '' });
  const isCurbside = orderType === 'pickup' && pickupMethod === 'curbside';
  const [extras, setExtras] = useState({ forks: false, ketchup: false, salt: false, napkins: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedAddress, setSavedAddress] = useState(false);
  const nameRef = useRef(null);

  // Auto-focus the first field so the customer can start typing their name
  // immediately without hunting for the input — especially on desktop.
  useEffect(() => { nameRef.current?.focus(); }, []);

  // GA4 ecommerce: fire begin_checkout once when the customer lands on checkout.
  useEffect(() => {
    if (cartItems.length > 0) {
      trackBeginCheckout(cartItems.map(foodItemToGa4), totalWithTip, { coupon: appliedReward?.description });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill contact details for signed-in customers from their account +
  // saved customer profile. Only fills fields the customer hasn't typed into.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
      if (!isAuthed) return;
      if (cancelled) return;
      const me = await base44.auth.me().catch(() => null);
      if (!me || cancelled) return;
      const profiles = await base44.entities.CustomerProfile.filter({ email: me.email }).catch(() => []);
      const p = profiles?.[0] || {};
      if (cancelled) return;
      if (p.delivery_address || p.address) setSavedAddress(true);
      const [firstPart, ...rest] = (p.name || me.full_name || '').trim().split(/\s+/);
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || firstPart || '',
        lastName: prev.lastName || rest.join(' ') || '',
        email: prev.email || me.email || '',
        phone: prev.phone || p.phone || '',
        address: prev.address || p.delivery_address || p.address || '',
      }));
    })();
    return () => { cancelled = true; };
  }, []);

  // Find Smashie free-shake prize (#108). A signed-in winner holds one free
  // milkshake for today: the dearest shake in the bag comes off the total as its
  // own summary line. The server checks the prize again and prices the shake from
  // the catalog, so what is shown here only ever mirrors what it will confirm.
  const [shakePrizeActive, setShakePrizeActive] = useState(false);
  const [shakeIds, setShakeIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authed = await base44.auth.isAuthenticated().catch(() => false);
      if (!authed) return;
      const [prizeRes, shakes] = await Promise.all([
        base44.functions.invoke('getMySmashiePrize', {}).catch(() => null),
        base44.entities.MenuItem
          .filter({ square_category: { $in: SHAKE_CATEGORIES } }, { limit: 200 })
          .catch(() => null),
      ]);
      if (cancelled) return;
      setShakePrizeActive(!!prizeRes?.data?.active);
      setShakeIds(new Set((shakes?.items || []).map((i) => i.square_item_id).filter(Boolean)));
    })();
    return () => { cancelled = true; };
  }, []);

  // Advanced scheduling — ASAP (ready ≈ 20 min) or a chosen future time slot
  const [schedule, setSchedule] = useState({ mode: 'asap', scheduledFor: '', estimatedTime: 20, label: 'ASAP (≈ 20 min)' });

  // Tip state — "smart tipping": when the order is small enough that even the
  // largest percentage tip stays under $1.00, show flat-dollar ($1/$2/$3)
  // options instead of percentages so the crew still gets a worthwhile tip.
  const [tipPreset, setTipPreset] = useState('18');
  const [customTip, setCustomTip] = useState('');

  const smartFlat = subtotal * 0.20 < 1; // max % preset < $1 → use flat tips
  const tipPresets = smartFlat
    ? [
        { key: '1', label: '$1', amount: 1 },
        { key: '2', label: '$2', amount: 2 },
        { key: '3', label: '$3', amount: 3 },
      ]
    : [
        { key: '15', label: '15%', amount: +(subtotal * 0.15).toFixed(2) },
        { key: '18', label: '18%', amount: +(subtotal * 0.18).toFixed(2) },
        { key: '20', label: '20%', amount: +(subtotal * 0.20).toFixed(2) },
      ];

  // Reset to a valid default whenever the mode flips between % and flat $
  useEffect(() => {
    setTipPreset(smartFlat ? '2' : '18');
  }, [smartFlat]);

  // Clear stale field errors (e.g. delivery address) when the order type changes.
  useEffect(() => { setFieldErrors({}); }, [orderType]);

  // A saved, still-unpaid order stops being the one to charge as soon as what is
  // being ordered changes — the bag, the time, or the tip. The next tap then creates
  // a fresh verified order instead of charging a stale amount.
  useEffect(() => { setPendingOrder(null); resetCardForm(); },
    [orderType, pickupMethod, subtotal, total, tipPreset, customTip, schedule.mode, schedule.scheduledFor, schedule.estimatedTime, cartItems.length, resetCardForm]);

  // Distance-based delivery pricing — quote the fee from the typed address
  // (debounced). Clears the quote when not delivering or the address is empty.
  const [quoting, setQuoting] = useState(false);
  useEffect(() => {
    if (orderType !== 'delivery' || !form.address.trim()) {
      setDeliveryQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke('getDeliveryQuote', { address: form.address.trim() });
        // Keep not_found so checkout can block instead of silently charging $0.
        setDeliveryQuote(res.data?.ok ? res.data : (res.data?.not_found ? { not_found: true } : null));
      } catch {
        setDeliveryQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [orderType, form.address, setDeliveryQuote]);

  const tipAmount = tipPreset === 'custom'
    ? Math.max(0, parseFloat(customTip) || 0)
    : tipPreset === '0' ? 0
    : (tipPresets.find(p => p.key === tipPreset)?.amount ?? 0);

  // Compose the kitchen-facing notes: the allergy alert first so it is the very
  // first thing the kitchen reads on the ticket, then the customer's own
  // instructions, then requested extras.
  const extrasList = Object.entries(extras)
    .filter(([, v]) => v)
    .map(([k]) => ({
      forks: 'Forks', ketchup: 'Ketchup packets', salt: 'Salt packets', napkins: 'Napkins',
    }[k]));
  const instructionsWithExtras = [
    hasAllergy && form.allergy.trim() ? `ALLERGY: ${form.allergy.trim()}` : '',
    form.instructions.trim(),
    extrasList.length ? `Please include: ${extrasList.join(', ')}.` : '',
  ].filter(Boolean).join('\n');

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const rewardDiscount = happyHourDiscount > 0 ? 0 : appliedReward?.discountValue || 0;
  useEffect(() => { if (happyHourDiscount > 0 && appliedReward) setAppliedReward(null); }, [happyHourDiscount, appliedReward, setAppliedReward]);

  // The free Find Smashie shake: the most expensive shake in the bag, one of them
  // free. Taken off after any reward discount and never below zero — the same
  // bound the server applies, so the two totals agree to the cent.
  const shakeUnitPrice = useMemo(() => {
    if (!shakePrizeActive || !shakeIds) return 0;
    return cartItems
      .filter((i) => i.isBuildShake || shakeIds.has(i.square_item_id || i.catalog_object_id))
      .reduce((max, i) => Math.max(max, Number(i.price) || 0), 0);
  }, [shakePrizeActive, shakeIds, cartItems]);
  const adjustedCents = toCents(subtotal - happyHourDiscount - bundleDiscount);
  const freeShakeCents = Math.min(toCents(shakeUnitPrice), Math.max(0, adjustedCents - toCents(rewardDiscount)));
  const freeShakeDiscount = fromCents(freeShakeCents);

  // Composed in whole cents with the shared half-up rule, exactly like the
  // cart total and the server's verification — never a float sum re-rounded by
  // toFixed (which is what produced the $3.44 / $3.45 mismatch).
  const totalWithTip = fromCents(toCents(Math.max(0, total - rewardDiscount - freeShakeDiscount)) + toCents(tipAmount));

  // Single combined ready-by label: "~N min · clock time". For ASAP the clock
  // time is order time + prep minutes; for a scheduled order it's the chosen slot.
  const readyAt = schedule.scheduledFor
    ? new Date(schedule.scheduledFor)
    : new Date(Date.now() + prepMinutes * 60000);
  const readyMinutes = schedule.mode === 'schedule' ? schedule.estimatedTime : prepMinutes;
  const readyLabel = `~${readyMinutes} min · ${readyAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const updateForm = (field, val) => {
    // Editing any detail of the order makes an already-saved, unpaid order stale — and
    // with it the card fields that were signed for its amount.
    setPendingOrder(null);
    resetCardForm();
    setForm(prev => ({ ...prev, [field]: val }));
    setFieldErrors(prev => { if (!prev[field]) return prev; const n = { ...prev }; delete n[field]; return n; });
  };

  const handleContinue = async () => {
    setError('');
    const errors = {};
    if (cutoffStatus[orderType]) {
      setError(`${ORDER_TYPE_LABELS[orderType]} orders are closed for tonight — we stop taking them shortly before closing.`);
      return;
    }
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!form.email.trim()) errors.email = 'Your email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
    if (orderType === 'delivery' && !form.address.trim()) errors.address = 'A delivery address is required.';
    else if (orderType === 'delivery' && deliveryQuote?.out_of_range) {
      errors.address = `Sorry, this address is outside our ${deliveryQuote.max_miles}-mile delivery range.`;
    }
    else if (orderType === 'delivery' && (quoting || !deliveryQuote?.ok)) {
      // Never charge without a verified distance — block until the quote resolves.
      errors.address = quoting
        ? 'Still checking your delivery distance — one moment, then tap again.'
        : "We couldn't locate this address. Please double-check the street, city, and ZIP.";
    }
    if (isCurbside) {
      if (!vehicle.color.trim()) errors.carColor = 'Car color is required.';
      if (!vehicle.make.trim()) errors.carMake = 'Car make is required.';
    }
    if (schedule.mode === 'schedule' && !schedule.scheduledFor) errors.schedule = 'Please choose a time for your order.';
    // Allergy alert ticked — the kitchen needs to know what the allergy is.
    if (hasAllergy && !form.allergy.trim()) errors.allergy = 'Tell us what the allergy is.';
    if (loyaltyOptIn && !/^\+?1?\d{10}$/.test(form.phone.replace(/[\s().-]/g, ''))) errors.phone = 'Enter a valid phone to join, or uncheck Star Rewards.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please complete the highlighted fields to continue.');
      return;
    }

    // Fresh ready time at submit — ASAP = now + prepMinutes; scheduled = chosen slot
    const scheduledFor = schedule.scheduledFor;
    const estimatedTime = schedule.estimatedTime;

    const mappedItems = cartItems.map(i => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image_url: i.image_url,
      selectedModifiers: i.selectedModifiers || [],
      catalog_object_id: i.catalog_object_id || '',
      square_item_id: i.square_item_id || '',
      isBuildShake: !!i.isBuildShake,
      deluxeLabel: i.deluxeLabel || '',
      deluxeToppings: i.deluxeToppings || [],
      comboConfigId: i.comboConfigId || '',
      comboComponents: i.comboComponents || [],
      allergyNote: i.allergyNote || '',
    }));

    setLoading(true);
    try {
      // The order payload the saved order — and its payment page — are built from.
      const hostedPayload = {
        items: mappedItems,
        orderType,
        pickupMethod,
        customer: { name: fullName, email: form.email, phone: form.phone, address: form.address, table: form.table },
        instructions: instructionsWithExtras,
        subtotal, deliveryFee, tax, total: totalWithTip, tip: tipAmount,
        discount: rewardDiscount, redemptionId: appliedReward?.tierId || null, happyHourDiscount, bundleDiscount,
        // Tells the server a free shake is in play; it re-checks the prize and
        // prices the shake itself, so this only ever reports the claim.
        freeShakePrize: freeShakeCents > 0,
        loyaltyOptIn,
        referralCode: referralCode || undefined,
        scheduledFor,
        estimatedTime,
        vehicle: isCurbside ? vehicle : null,
        smsTransactionalConsent: smsConsent,
        smsConsentDisclosure: TRANSACTIONAL_DISCLOSURE_TEXT,
        smsConsentVersion: SMS_CONSENT_VERSION,
      };

      // A tap after a declined card (or a card form the customer closed) re-opens our
      // secure card form for that same saved order, so no second unpaid order is left
      // behind.
      if (pendingOrder) {
        await startCardPay(pendingOrder.orderNumber);
        return;
      }

      // The card is typed right here: the order is saved first, repriced and verified
      // server-side with the tip chosen above already inside its total, and our own
      // secure card form then opens over this same page for that saved total. The
      // customer never leaves the checkout, and nothing reaches the kitchen until the
      // processor's own record confirms the payment against that total.
      const orderRes = await base44.functions.invoke('createHelcimWebCheckout', hostedPayload);
      const data = orderRes?.data || orderRes;
      if (data?.orderNumber) {
        setPendingOrder({ orderNumber: data.orderNumber });
        // The order is saved and the shake is in it, so the prize is now spent.
        // Fired and forgotten: an order must never fail because the prize record
        // could not be marked used.
        if (freeShakeCents > 0) {
          base44.functions.invoke('fulfillSmashiePrize', {}).catch(() => {});
        }
        await startCardPay(data.orderNumber);
        return;
      }
      setError(data?.error || 'We could not open the secure card form, so nothing was charged. Please tap the pay button again.');
      return;
    } catch (err) {
      // Surface the server's own explanation (price check, order save) — those
      // are written for customers — instead of a generic message.
      const apiError = err?.response?.data?.error || err?.data?.error || '';
      setError(apiError || 'Could not initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!orderingEnabled || storeClosed) {
    return (
      <div className="min-h-screen force-light" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-24 px-4 text-center">
          <div className="text-6xl mb-6">{storeClosed ? '🌙' : '🚫'}</div>
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">{storeClosed ? "We're Closed Right Now" : 'Ordering is Closed'}</h2>
          <p className="text-muted-foreground mb-8">
            {storeClosed ? `We'll be back during our posted hours: ${hoursSummary(businessHours)}` : orderingClosedMessage}
          </p>
          <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-block">Browse the Menu</Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen force-light" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-24 px-4 text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">Your bag is empty</h2>
          <p className="text-muted-foreground mb-8">Add some delicious items from our menu first!</p>
          <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-block">Browse Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen force-light" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-32 lg:pb-10">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/menu" className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm">
            <ArrowLeft size={16} /> Back to Menu
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-heading text-3xl text-obsidian-roast leading-none">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-1">Review your order, then pay on our secure checkout page</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left – Form */}
          <div className="lg:col-span-3 space-y-4">

                <div className="card-diner p-4">
                  <h2 className="font-heading text-base text-obsidian-roast mb-3">Your Info</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">First Name *</label>
                      <input ref={nameRef} type="text" autoComplete="given-name" value={form.firstName} onChange={e => updateForm('firstName', e.target.value)} placeholder="Jane"
                        className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry ${fieldErrors.firstName ? 'border-destructive' : 'border-border'}`} />
                      {fieldErrors.firstName && <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Last Name *</label>
                      <input type="text" autoComplete="family-name" value={form.lastName} onChange={e => updateForm('lastName', e.target.value)} placeholder="Smith"
                        className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry ${fieldErrors.lastName ? 'border-destructive' : 'border-border'}`} />
                      {fieldErrors.lastName && <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="jane@example.com"
                        className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry ${fieldErrors.email ? 'border-destructive' : 'border-border'}`} />
                      {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(270) 555-0000"
                        className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
                    </div>
                    {orderType === 'dine_in' && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Table Number</label>
                        <input type="text" value={form.table} onChange={e => updateForm('table', e.target.value)} placeholder="e.g. 7"
                          className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      </div>
                    )}
                  </div>

                  {/* Delivery address — shown right after contact for delivery
                      orders so a new customer fills the most important field first. */}
                  {orderType === 'delivery' && (
                    <div className={fieldErrors.address ? 'ring-2 ring-destructive/30 rounded-2xl mt-4' : 'mt-4'}>
                      <SavedAddressField
                        value={form.address}
                        onChange={val => updateForm('address', val)}
                        saved={savedAddress}
                      />
                      {fieldErrors.address && <p className="text-xs text-destructive mt-1">{fieldErrors.address}</p>}
                      {/* Live distance-based delivery quote */}
                      {quoting && (
                        <p className="text-xs text-muted-foreground mt-1.5">Checking delivery distance…</p>
                      )}
                      {!quoting && deliveryQuote?.not_found && form.address.trim() && (
                        <p className="text-xs text-destructive mt-1.5">
                          We couldn't locate this address — please double-check the street, city, and ZIP.
                        </p>
                      )}
                      {!quoting && deliveryQuote?.out_of_range && (
                        <p className="text-xs text-destructive mt-1.5">
                          This address is ~{deliveryQuote.distance_miles} mi away — outside our {deliveryQuote.max_miles}-mile delivery range.
                        </p>
                      )}
                      {!quoting && deliveryQuote && !deliveryQuote.out_of_range && (
                        <p className="text-xs text-patina-mint mt-1.5">
                          ~{deliveryQuote.distance_miles} mi from the store — ${Number(deliveryQuote.fee || 0).toFixed(2)} delivery fee
                        </p>
                      )}
                    </div>
                  )}

                  {/* Curbside — vehicle details so the crew knows what car to bring the order to */}
                  {isCurbside && (
                    <CurbsideVehicleFields vehicle={vehicle} onChange={setVehicle} errors={fieldErrors} />
                  )}

                  <label className="flex items-center gap-3 mt-4 min-h-11 cursor-pointer select-none">
                    <input type="checkbox" checked={loyaltyOptIn} onChange={e => setLoyaltyOptIn(e.target.checked)} className="w-5 h-5 flex-shrink-0 accent-primary" />
                    <span className="text-sm text-obsidian-roast">Join Star Rewards — earn 1 Star per $1 <span className="text-muted-foreground">(optional; uses the phone number above)</span></span>
                  </label>

                  {/* SMS opt-in for order status updates — transactional only, optional,
                      unchecked, and persisted through order creation (which upserts an
                      SMSSubscriber record). Marketing consent is never offered or
                      inferred here. */}
                  <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={e => setSmsConsent(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30 flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Text me order status updates from Flavor Isle (confirmed, preparing, ready) about this order. Optional — not required to place an order. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{' '}
                      <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Privacy Policy</a>{' '}and{' '}
                      <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Terms of Service</a>.
                    </span>
                  </label>

                  {/* Request extras — appended to kitchen order notes */}
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Need any extras?</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'forks', label: 'Forks' },
                        { key: 'ketchup', label: 'Ketchup Packets' },
                        { key: 'salt', label: 'Salt' },
                        { key: 'napkins', label: 'Napkins' },
                      ].map(opt => (
                        <label
                          key={opt.key}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer text-sm transition-all ${
                            extras[opt.key]
                              ? 'border-midnight-cherry bg-midnight-cherry/5 text-obsidian-roast'
                              : 'border-border text-muted-foreground hover:border-midnight-cherry/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={extras[opt.key]}
                            onChange={e => setExtras(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30 flex-shrink-0"
                          />
                          <span className="font-body">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                    <textarea value={form.instructions} onChange={e => updateForm('instructions', e.target.value)}
                      placeholder="Allergies, extra sauce, no pickles…" rows={3}
                      className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none" />
                  </div>

                  {/* Allergy alert — ticking it opens a required text box, and the
                      text is placed at the top of the order notes as "ALLERGY: …". */}
                  <div className="mt-4">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasAllergy}
                        onChange={e => { setHasAllergy(e.target.checked); if (!e.target.checked) updateForm('allergy', ''); }}
                        className="mt-0.5 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30 flex-shrink-0"
                      />
                      <span className="text-sm text-obsidian-roast leading-relaxed">Someone in my party has a food allergy</span>
                    </label>
                    {hasAllergy && (
                      <div className="mt-3 pl-8">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tell us what the allergy is *</label>
                        <textarea value={form.allergy} onChange={e => updateForm('allergy', e.target.value)}
                          placeholder="e.g. Severe peanut allergy…" rows={2}
                          className={`w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none ${fieldErrors.allergy ? 'border-destructive' : 'border-border'}`} />
                        {fieldErrors.allergy && <p className="text-xs text-destructive mt-1">{fieldErrors.allergy}</p>}
                      </div>
                    )}
                  </div>
                </div>

          </div>

          {/* Right – Order Details & Summary */}
          <div className="lg:col-span-2 order-first lg:order-none">
            <div className="card-diner p-5 lg:sticky lg:top-32">
              <h2 className="font-heading text-base text-obsidian-roast mb-3">Order Details & Summary</h2>

              {/* Order type + ready time merged into one card */}
              <div className="rounded-xl bg-midnight-cherry/5 px-3 py-3 mb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-midnight-cherry font-heading text-sm min-w-0">
                    <img
                      src={ORDER_TYPE_IMAGES[orderType]}
                      alt={orderTypeLabel(orderType, pickupMethod)}
                      className="w-7 h-7 object-contain flex-shrink-0"
                    />
                    <span className="truncate">{orderTypeLabel(orderType, pickupMethod)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-patina-mint font-heading text-sm whitespace-nowrap">
                    <Clock size={15} />
                    <span>Ready by {readyLabel}</span>
                  </div>
                </div>
              </div>

              <SchedulePicker onChange={setSchedule} prepMinutes={prepMinutes} compact />

              <div className="space-y-2 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm text-obsidian-roast">{item.name} <span className="text-xs text-muted-foreground font-body">× {item.quantity}</span></p>
                      <CartItemModifiers modifiers={item.selectedModifiers} allergyNote={item.allergyNote} />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          const pid = item.comboParentId || item.productId || (item.id || '').split('__')[0];
                          if (pid && !pid.startsWith('combo-')) navigate(`/product/${pid}`);
                        }}
                        className="p-1 text-muted-foreground hover:text-patina-mint transition-colors"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Referred by a friend — the referrer gets 50 bonus Stars once
                  this order completes (issue #83). Never required. */}
              {referralCode && (
                <p className="text-xs text-patina-mint mb-3">
                  Referred by a friend — they'll get 50 bonus Stars when this order completes.
                </p>
              )}

              {/* Free Find Smashie shake — the prize waits until a shake is in the
                  bag, so the winner is nudged rather than the prize being burned. */}
              {shakePrizeActive && freeShakeCents === 0 && (
                <p className="text-xs text-patina-mint mb-3">
                  Your free Find Smashie shake applies when you add one.
                </p>
              )}

              {/* Star Rewards — compact balance + redeemable rewards */}
              {happyHourDiscount <= 0 && <CheckoutLoyaltyBox
                subtotal={subtotal}
                phone={form.phone}
                cartItems={cartItems}
                appliedReward={appliedReward}
                onApply={setAppliedReward}
              />}

              {/* Add a Tip — lives in the summary so the running total reflects it live. */}
              <div className="border-t border-border pt-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading text-base text-obsidian-roast">Add a Tip</h3>
                  <span className="text-midnight-cherry font-heading text-base">${tipAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">100% goes to the kitchen crew.</p>
                <div className="grid grid-cols-4 gap-2">
                  {tipPresets.map(preset => (
                    <button
                      key={preset.key}
                      onClick={() => setTipPreset(preset.key)}
                      className={`py-2 rounded-xl border-2 font-heading text-sm transition-all ${
                        tipPreset === preset.key
                          ? 'border-midnight-cherry bg-midnight-cherry text-white'
                          : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setTipPreset('custom')}
                    className={`py-2 rounded-xl border-2 font-heading text-sm transition-all ${
                      tipPreset === 'custom'
                        ? 'border-midnight-cherry bg-midnight-cherry text-white'
                        : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {tipPreset === 'custom' && (
                  <div className="mt-2 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={customTip}
                      onChange={e => setCustomTip(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                )}
                <button
                  onClick={() => { setTipPreset('0'); setCustomTip(''); }}
                  className="mt-2 text-xs text-muted-foreground underline hover:text-midnight-cherry transition-colors"
                >
                  No tip
                </button>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span><span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (6%)</span><span>${tax.toFixed(2)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tip</span><span>${tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {happyHourDiscount > 0 && (
                  <div className="flex justify-between text-midnight-cherry font-semibold">
                    <span>Happy Hour — Unbeatable Value (online)</span><span>−${happyHourDiscount.toFixed(2)}</span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="flex justify-between text-midnight-cherry font-semibold">
                    <span>School Night Lifesaver bundle</span><span>−${bundleDiscount.toFixed(2)}</span>
                  </div>
                )}
                {rewardDiscount > 0 && (
                  <div className="flex justify-between text-patina-mint">
                    <span>Reward{appliedReward?.description ? ` (${appliedReward.description})` : ''}</span><span>−${rewardDiscount.toFixed(2)}</span>
                  </div>
                )}
                {freeShakeDiscount > 0 && (
                  <div className="flex justify-between text-midnight-cherry font-semibold">
                    <span>Free shake — Find Smashie</span><span>−${freeShakeDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
                  <span>Total</span><span>${totalWithTip.toFixed(2)}</span>
                </div>
              </div>

              {(error || cardFormError) && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error || cardFormError}</span>
                </div>
              )}

              {cardForm ? (
                <div className="border-t border-border pt-4">
                  <h3 className="font-heading text-base text-obsidian-roast">Enter your card</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Order #{cardForm.orderNumber} is saved — pay ${cardForm.amount} and it goes straight to the kitchen.
                  </p>
                  <InlineCardFields
                    form={cardForm}
                    defaultName={fullName}
                    defaultAddress={form.address}
                  />
                </div>
              ) : (
                <>
                  {pendingOrder && (
                    <div className="mb-3 rounded-xl bg-patina-mint/10 px-3 py-2.5">
                      <p className="text-xs font-semibold text-patina-mint">Order #{pendingOrder.orderNumber} is saved.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Type your card in our secure form right on this page — nothing goes to the kitchen until it's paid.
                      </p>
                    </div>
                  )}

                  <div className="hidden lg:block">
                    <button
                      onClick={handleContinue}
                      disabled={loading || openingCardForm}
                      className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading || openingCardForm ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                      <>{pendingOrder ? 'Pay' : 'Continue to Payment'} · ${totalWithTip.toFixed(2)}</>
                      )}
                    </button>
                    <div className="mt-3">
                      <CheckoutTrustBadges variant="compact" />
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA — keeps the primary action reachable without scrolling
          the full summary. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-float-lg px-4 pt-3 pb-8 safe-bottom">
        <button
          onClick={() => {
            // The card fields live in the summary above: bring them into view rather
            // than opening a second way to pay.
            if (cardForm) {
              document.getElementById('helcimForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
            handleContinue();
          }}
          disabled={loading || openingCardForm}
          className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading || openingCardForm ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {cardForm ? 'Enter your card to pay' : pendingOrder ? 'Pay' : 'Continue to Payment'} · $
              {(cardForm?.amount ? Number(cardForm.amount) : totalWithTip).toFixed(2)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}