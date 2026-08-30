import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Bike, Utensils, AlertCircle, Lock, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';

import { base44 } from '@/api/base44Client';

import SchedulePicker from '@/components/checkout/SchedulePicker';
import SplitPayment from '@/components/checkout/SplitPayment';
import SavedAddressField from '@/components/checkout/SavedAddressField';
import CheckoutTrustBadges from '@/components/checkout/CheckoutTrustBadges';
import WalletPayButton from '@/components/checkout/WalletPayButton';
import ExpressCheckout from '@/components/checkout/ExpressCheckout';
import CheckoutLoyaltyBox from '@/components/checkout/CheckoutLoyaltyBox';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import CartItemModifiers from '@/components/CartItemModifiers';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary, DAY_KEYS, formatTime12 } from '@/lib/businessHours';
import useLiveStatus from '@/hooks/useLiveStatus';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const ORDER_TYPE_LABELS = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };

// Brand-neutral card field styling — matches the app's diner aesthetic with
// no Stripe logos or branding.
const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#141414',
      fontFamily: 'Open Sans, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
      iconColor: '#C0392B',
    },
    invalid: { color: '#dc2626', iconColor: '#dc2626' },
  },
  hidePostalCode: true,
};

// Inner payment form — must be rendered inside <Elements>
function PaymentForm({ clientSecret, orderNumber, onSuccess, onError, total }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    onError('');

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (result.error) {
      onError(result.error.message);
      setPaying(false);
    } else if (result.paymentIntent.status === 'succeeded') {
      onSuccess(orderNumber);
    }
  };

  return (
    <div>
      <WalletPayButton
        clientSecret={clientSecret}
        total={total}
        label={`Flavor Isle #${orderNumber}`}
        onSuccess={() => onSuccess(orderNumber)}
        onError={onError}
      />
      <form onSubmit={handlePay}>
      <div className="border border-border rounded-2xl px-4 py-4 bg-white mb-5">
        <CardElement options={CARD_STYLE} />
      </div>
      <button
        type="submit"
        disabled={paying || !stripe}
        className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {paying ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Lock size={15} /> Pay ${total.toFixed(2)}</>
        )}
      </button>
      </form>
    </div>
  );
}

export default function Checkout() {
  const { cartItems, orderType, setOrderType, subtotal, deliveryFee, tax, total, clearCart, orderingEnabled, orderingClosedMessage, cutoffStatus, groupMode, personSubtotals, people, appliedReward, setAppliedReward } = useCart();
  const navigate = useNavigate();
  const businessHours = useBusinessHours();
  const { level, waitMin } = useLiveStatus();
  // Kitchen prep estimate scales with the live busyness level so checkout
  // ready times match what the hero/status bar advertise. Uses the regressed
  // wait from the backend so it eases back to normal as inflow slows.
  const prepMinutes = waitMin || 20;
  const storeClosed = orderingEnabled && cutoffStatus.delivery && cutoffStatus.pickup && cutoffStatus.dine_in;

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

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '', table: '', instructions: '' });
  const [smsConsent, setSmsConsent] = useState(false);
  const [extras, setExtras] = useState({ forks: false, ketchup: false, salt: false, napkins: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedAddress, setSavedAddress] = useState(false);
  const nameRef = useRef(null);

  // Auto-focus the first field so a guest can start typing their name
  // immediately without hunting for the input — especially on desktop.
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Prefill contact details for signed-in customers from their account +
  // saved customer profile. Only fills fields the guest hasn't typed into.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
      if (!isAuthed || cancelled) return;
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

  // Payment step state
  const [step, setStep] = useState('details'); // 'details' | 'payment' | 'split'
  const [stripePromise, setStripePromise] = useState(null);
  const [expressStripePromise, setExpressStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  // Whether the device actually supports a wallet (Apple Pay / Google Pay).
  // The express card stays hidden until the Stripe Payment Request confirms support.
  const [walletReady, setWalletReady] = useState(null);

  // Group split-payment state
  const [payMode, setPayMode] = useState('together'); // 'together' | 'separate'
  const [splitIntents, setSplitIntents] = useState([]);
  const [splitPublishable, setSplitPublishable] = useState('');

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

  // Clear an applied reward when split mode changes (separate split can't apply
  // a single reward). The reward is now chosen in the cart drawer.
  useEffect(() => {
    setAppliedReward(null);
  }, [groupMode, payMode]);

  // Clear stale field errors (e.g. delivery address) when the order type changes.
  useEffect(() => { setFieldErrors({}); }, [orderType]);

  const tipAmount = tipPreset === 'custom'
    ? Math.max(0, parseFloat(customTip) || 0)
    : tipPreset === '0' ? 0
    : (tipPresets.find(p => p.key === tipPreset)?.amount ?? 0);

  // Compose the kitchen-facing notes: customer instructions + requested extras.
  const extrasList = Object.entries(extras)
    .filter(([, v]) => v)
    .map(([k]) => ({
      forks: 'Forks', ketchup: 'Ketchup packets', salt: 'Salt packets', napkins: 'Napkins',
    }[k]));
  const instructionsWithExtras = [
    form.instructions.trim(),
    extrasList.length ? `Please include: ${extrasList.join(', ')}.` : '',
  ].filter(Boolean).join('\n');

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const rewardDiscount = appliedReward?.discountValue || 0;
  const totalWithTip = +(Math.max(0, total - rewardDiscount) + tipAmount).toFixed(2);

  // Single combined ready-by label: "~N min · clock time". For ASAP the clock
  // time is order time + prep minutes; for a scheduled order it's the chosen slot.
  const readyAt = schedule.scheduledFor
    ? new Date(schedule.scheduledFor)
    : new Date(Date.now() + prepMinutes * 60000);
  const readyMinutes = schedule.mode === 'schedule' ? schedule.estimatedTime : prepMinutes;
  const readyLabel = `~${readyMinutes} min · ${readyAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  const updateForm = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setFieldErrors(prev => { if (!prev[field]) return prev; const n = { ...prev }; delete n[field]; return n; });
  };

  // Scroll to top when moving to the payment or split step so the card form
  // is immediately visible instead of leaving the user scrolled down past it.
  useEffect(() => {
    if (step === 'payment' || step === 'split') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

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
    if (schedule.mode === 'schedule' && !schedule.scheduledFor) errors.schedule = 'Please choose a time for your order.';

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
      person_name: i.person_name || '',
      catalog_object_id: i.catalog_object_id || '',
      isBuildShake: !!i.isBuildShake,
      deluxeLabel: i.deluxeLabel || '',
      deluxeToppings: i.deluxeToppings || [],
    }));

    setLoading(true);
    try {
      if (groupMode && payMode === 'separate') {
        // Split: each person pays their own share; one fee + tip shared across the group.
        const withItems = personSubtotals.filter(p => p.itemCount > 0);
        if (withItems.length === 0) { setError('Add items to split.'); setLoading(false); return; }
        // Even split of the shared fee + tip, remainder on the last person so the
        // sum of shares exactly equals the group total.
        const shareCount = withItems.length;
        const feeShareBase = Math.floor((deliveryFee + tipAmount) * 100 / shareCount) / 100;
        const remainder = +((deliveryFee + tipAmount) - feeShareBase * shareCount).toFixed(2);
        const splits = withItems.map((p, idx) => {
          const pSub = p.subtotal;
          const pTax = +(pSub * 0.06).toFixed(2);
          const feeTip = feeShareBase + (idx === withItems.length - 1 ? remainder : 0);
          const pTotal = +(pSub + pTax + feeTip).toFixed(2);
          return { person_name: p.name, subtotal: pSub, tax: pTax, deliveryFee: feeTip, tip: 0, total: pTotal };
        });

        const res = await base44.functions.invoke('createGroupPayment', {
          items: mappedItems,
          orderType,
          customer: { name: fullName, email: form.email, phone: form.phone, address: form.address, table: form.table },
          instructions: instructionsWithExtras,
          subtotal, deliveryFee, tax, total: totalWithTip,
          scheduledFor, estimatedTime,
          splits,
          groupName: people.map(p => p.name).join(', '),
        });

        const { intents, publishableKey, orderNumber: on } = res.data;
        setSplitIntents(intents);
        setSplitPublishable(publishableKey);
        setOrderNumber(on);
        setStep('split');
      } else {
        const res = await base44.functions.invoke('createPaymentIntent', {
          items: mappedItems,
          orderType,
          customer: { name: fullName, email: form.email, phone: form.phone, address: form.address, table: form.table },
          instructions: form.instructions,
          subtotal, deliveryFee, tax, total: totalWithTip, tip: tipAmount,
          discount: rewardDiscount, redemptionId: appliedReward?.tierId || null,
          scheduledFor,
          estimatedTime,
        });

        const { clientSecret: cs, publishableKey, orderNumber: on } = res.data;
        setClientSecret(cs);
        setOrderNumber(on);
        setStripePromise(loadStripe(publishableKey));
        setStep('payment');
      }
    } catch (err) {
      setError('Could not initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (on) => {
    clearCart();
    navigate(`/order-confirmation?order_number=${on}&ready_for=${encodeURIComponent(schedule.scheduledFor || '')}`);
  };

  // Load the Stripe publishable key once so Apple Pay / Google Pay can render
  // on the first step (before a payment intent exists).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getStripePublishableKey', {});
        if (!cancelled && res?.data?.publishableKey) {
          setExpressStripePromise(loadStripe(res.data.publishableKey));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Build a single-pay intent from the current cart + wallet-provided contact
  // details. Used by the express Apple Pay / Google Pay button.
  const createIntent = async (walletCustomer) => {
    const scheduledFor = schedule.scheduledFor;
    const estimatedTime = schedule.estimatedTime;
    const mappedItems = cartItems.map(i => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image_url: i.image_url,
      selectedModifiers: i.selectedModifiers || [],
      person_name: i.person_name || '',
      catalog_object_id: i.catalog_object_id || '',
      isBuildShake: !!i.isBuildShake,
      deluxeLabel: i.deluxeLabel || '',
      deluxeToppings: i.deluxeToppings || [],
    }));
    const customer = {
      name: walletCustomer.name || fullName,
      email: walletCustomer.email || form.email,
      phone: walletCustomer.phone || form.phone,
      address: orderType === 'delivery' ? form.address : '',
      table: form.table || '',
    };
    const res = await base44.functions.invoke('createPaymentIntent', {
      items: mappedItems,
      orderType,
      customer,
      instructions: instructionsWithExtras,
      subtotal, deliveryFee, tax, total: totalWithTip, tip: tipAmount,
      discount: rewardDiscount, redemptionId: appliedReward?.tierId || null,
      scheduledFor, estimatedTime,
    });
    return res.data;
  };

  const expressAvailable = !cutoffStatus[orderType]
    && !(groupMode && payMode === 'separate')
    && (orderType !== 'delivery' || form.address.trim() !== '');

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
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">Your cart is empty</h2>
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
          {step === 'payment' || step === 'split' ? (
            <button onClick={() => setStep('details')} className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm">
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <Link to="/menu" className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm">
              <ArrowLeft size={16} /> Back to Menu
            </Link>
          )}
        </div>

        <div className="mb-6">
          <h1 className="font-heading text-3xl text-obsidian-roast leading-none">Checkout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'details' ? 'Step 1 of 2 — Your details' : 'Step 2 of 2 — Payment'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left – Form */}
          <div className="lg:col-span-3 space-y-4">

            {step === 'details' && (
              <>
                {/* Express checkout — one-tap Apple Pay / Google Pay first.
                    Hidden entirely when the device has no wallet (walletReady === false). */}
                {expressStripePromise && expressAvailable && walletReady !== false && (
                  <div className="card-diner p-5 border-2 border-midnight-cherry/20 bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="font-heading text-lg text-obsidian-roast">One-Tap Checkout</h2>
                      <span className="text-xs bg-midnight-cherry/10 text-midnight-cherry px-2.5 py-1 rounded-full font-heading">Fastest</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Skip the form — pay instantly with your wallet and we'll grab the details we need from it.</p>
                    <Elements stripe={expressStripePromise}>
                      <ExpressCheckout
                        total={totalWithTip}
                        label="Flavor Isle"
                        createIntent={createIntent}
                        onSuccess={handleSuccess}
                        onError={setError}
                        onAvailability={setWalletReady}
                      />
                    </Elements>
                    <div className="flex items-center gap-3 mt-5">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-xs text-muted-foreground font-heading uppercase tracking-widest">or fill in details</span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                  </div>
                )}

                {/* Contact Info — delivery address moved up front so a new guest
                    sees the most important field first, before consent/instructions. */}
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
                      orders so a new guest fills the most important field first. */}
                  {orderType === 'delivery' && (
                    <div className={fieldErrors.address ? 'ring-2 ring-destructive/30 rounded-2xl mt-4' : 'mt-4'}>
                      <SavedAddressField
                        value={form.address}
                        onChange={val => updateForm('address', val)}
                        saved={savedAddress}
                      />
                      {fieldErrors.address && <p className="text-xs text-destructive mt-1">{fieldErrors.address}</p>}
                    </div>
                  )}

                  {/* SMS opt-in for order status updates (A2P 10DLC compliant consent) */}
                  <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={smsConsent}
                      onChange={e => setSmsConsent(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30 flex-shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      Text me order status updates from Flavor Isle (confirmed, preparing, ready). Reply STOP to cancel, HELP for help. Msg &amp; data rates may apply. See our{' '}
                      <Link to="/privacy-policy" className="text-midnight-cherry underline hover:no-underline">Privacy Policy</Link>{' '}and{' '}
                      <Link to="/terms-of-service" className="text-midnight-cherry underline hover:no-underline">Terms of Service</Link>.
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
                </div>

                {/* Group payment mode — the whole group pays one fee; choose
                    whether one person pays everything or each pays their share. */}
                {groupMode && (
                  <div className="card-diner p-4">
                    <h2 className="font-heading text-base text-obsidian-roast mb-1">Group Payment</h2>
                    <p className="text-xs text-muted-foreground mb-3">Split into per-person charges, or pay the full total. Delivery fee is charged once.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPayMode('together')}
                        className={`p-3 rounded-2xl border-2 text-center transition-all ${payMode === 'together' ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'}`}>
                        <p className="font-heading text-sm text-obsidian-roast">Pay Together</p>
                        <p className="text-xs text-muted-foreground">One charge · ${totalWithTip.toFixed(2)}</p>
                      </button>
                      <button onClick={() => setPayMode('separate')}
                        className={`p-3 rounded-2xl border-2 text-center transition-all ${payMode === 'separate' ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'}`}>
                        <p className="font-heading text-sm text-obsidian-roast">Pay Separately</p>
                        <p className="text-xs text-muted-foreground">Each person pays their share</p>
                      </button>
                    </div>
                  </div>
                )}

              </>
            )}

            {step === 'split' && splitIntents.length > 0 && (
              <SplitPayment
                intents={splitIntents}
                publishableKey={splitPublishable}
                orderNumber={orderNumber}
                onSuccess={handleSuccess}
                onError={setError}
              />
            )}

            {step === 'payment' && stripePromise && clientSecret && (
              <div className="card-diner p-4">
                <h2 className="font-heading text-base text-obsidian-roast mb-1">Payment</h2>
                <p className="text-sm text-muted-foreground mb-4">Enter your card details below to complete your order.</p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    orderNumber={orderNumber}
                    onSuccess={handleSuccess}
                    onError={setError}
                    total={totalWithTip}
                  />
                </Elements>
                <div className="mt-5">
                  <CheckoutTrustBadges variant="full" />
                </div>
              </div>
            )}
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
                      alt={ORDER_TYPE_LABELS[orderType]}
                      className="w-7 h-7 object-contain flex-shrink-0"
                    />
                    <span className="truncate">{ORDER_TYPE_LABELS[orderType]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-patina-mint font-heading text-sm whitespace-nowrap">
                    <Clock size={15} />
                    <span>Ready by {readyLabel}</span>
                  </div>
                </div>
              </div>

              {step === 'details' && (
                <SchedulePicker onChange={setSchedule} prepMinutes={prepMinutes} compact />
              )}

              <div className="space-y-2 mb-4">
                {groupMode ? (
                  personSubtotals.filter(p => p.itemCount > 0).map(p => (
                    <div key={p.id} className="rounded-2xl bg-muted/60 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-heading text-sm text-patina-mint">{p.name === 'Me' ? 'You' : p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.itemCount} item{p.itemCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2">
                        {cartItems.filter(i => i.person_id === p.id).map(item => (
                          <div key={item.id} className="flex justify-between items-start gap-3 pl-2 border-l-2 border-patina-mint/30">
                            <div>
                              <p className="font-heading text-sm text-obsidian-roast">{item.name} <span className="text-xs text-muted-foreground font-body">× {item.quantity}</span></p>
                              <CartItemModifiers modifiers={item.selectedModifiers} />
                            </div>
                            <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between pt-2 mt-2 border-t border-border/60 text-xs">
                        <span className="text-muted-foreground">{p.name === 'Me' ? 'Your share' : `${p.name}'s share`}</span>
                        <span className="font-heading text-obsidian-roast">${p.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="flex justify-between items-start gap-3">
                      <div>
                        <p className="font-heading text-sm text-obsidian-roast">{item.name} <span className="text-xs text-muted-foreground font-body">× {item.quantity}</span></p>
                        <CartItemModifiers modifiers={item.selectedModifiers} />
                      </div>
                      <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Star Rewards — compact balance + redeemable rewards */}
              <CheckoutLoyaltyBox
                subtotal={subtotal}
                phone={form.phone}
                appliedReward={appliedReward}
                onApply={setAppliedReward}
              />

              {/* Add a Tip — lives in the summary so the running total reflects it live */}
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
                    <span>{groupMode ? 'Delivery (shared once)' : 'Delivery'}</span><span>${deliveryFee.toFixed(2)}</span>
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
                {rewardDiscount > 0 && (
                  <div className="flex justify-between text-patina-mint">
                    <span>Reward{appliedReward?.description ? ` (${appliedReward.description})` : ''}</span><span>−${rewardDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
                  <span>Total</span><span>${totalWithTip.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {step === 'details' && (
                <div className="hidden lg:block">
                  <button
                    onClick={handleContinue}
                    disabled={loading}
                    className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                    <>{groupMode && payMode === 'separate' ? `Pay Separately · $${totalWithTip.toFixed(2)}` : `Continue to Payment · $${totalWithTip.toFixed(2)}`}</>
                    )}
                  </button>
                  <div className="mt-3">
                    <CheckoutTrustBadges variant="compact" />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA — keeps the primary action reachable without scrolling the full summary */}
      {step === 'details' && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-float-lg px-4 pt-3 pb-8 safe-bottom">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{groupMode && payMode === 'separate' ? `Pay Separately · $${totalWithTip.toFixed(2)}` : `Continue to Payment · $${totalWithTip.toFixed(2)}`}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}