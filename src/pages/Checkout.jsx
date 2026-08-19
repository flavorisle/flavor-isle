import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Bike, Utensils, AlertCircle, Lock, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';

import { base44 } from '@/api/base44Client';

import SchedulePicker from '@/components/checkout/SchedulePicker';
import SplitPayment from '@/components/checkout/SplitPayment';
import SavedAddressField from '@/components/checkout/SavedAddressField';
import CheckoutLoyaltyBar from '@/components/checkout/CheckoutLoyaltyBar';
import CheckoutTrustBadges from '@/components/checkout/CheckoutTrustBadges';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import CartItemModifiers from '@/components/CartItemModifiers';
import DownloadAppBanner from '@/components/DownloadAppBanner';
import SignUpNudge from '@/components/SignUpNudge';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';
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
  );
}

export default function Checkout() {
  const { cartItems, orderType, setOrderType, subtotal, deliveryFee, tax, total, clearCart, orderingEnabled, orderingClosedMessage, cutoffStatus, groupMode, personSubtotals, people } = useCart();
  const navigate = useNavigate();
  const businessHours = useBusinessHours();
  const storeClosed = orderingEnabled && cutoffStatus.delivery && cutoffStatus.pickup && cutoffStatus.dine_in;

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', table: '', instructions: '' });
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedAddress, setSavedAddress] = useState(false);

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
      setForm(prev => ({
        ...prev,
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
  const [clientSecret, setClientSecret] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

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

  const tipAmount = tipPreset === 'custom'
    ? Math.max(0, parseFloat(customTip) || 0)
    : tipPreset === '0' ? 0
    : (tipPresets.find(p => p.key === tipPreset)?.amount ?? 0);

  const totalWithTip = +(Math.max(0, total) + tipAmount).toFixed(2);

  const readyAt = schedule.scheduledFor ? new Date(schedule.scheduledFor) : null;
  const readyLabel = readyAt
    ? `${readyAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${schedule.mode === 'asap' ? ' (≈ 20 min)' : ''}`
    : 'ASAP (≈ 20 min)';

  const updateForm = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // Scroll to top when moving to the payment or split step so the card form
  // is immediately visible instead of leaving the user scrolled down past it.
  useEffect(() => {
    if (step === 'payment' || step === 'split') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const handleContinue = async () => {
    setError('');
    if (cutoffStatus[orderType]) {
      setError(`${ORDER_TYPE_LABELS[orderType]} orders are closed for tonight — we stop taking them shortly before closing.`);
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    if (orderType === 'delivery' && !form.address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }
    if (schedule.mode === 'schedule' && !schedule.scheduledFor) {
      setError('Please choose a time for your order.');
      return;
    }

    // Fresh ready time at submit — ASAP = now + 20 min; scheduled = chosen slot
    const scheduledFor = schedule.mode === 'asap'
      ? new Date(Date.now() + 20 * 60000).toISOString()
      : schedule.scheduledFor;
    const estimatedTime = schedule.mode === 'asap' ? 20 : schedule.estimatedTime;

    const mappedItems = cartItems.map(i => ({
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image_url: i.image_url,
      selectedModifiers: i.selectedModifiers || [],
      person_name: i.person_name || '',
      catalog_object_id: i.catalog_object_id || '',
      isBuildShake: !!i.isBuildShake,
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

        const fullName = form.name.trim();
        const res = await base44.functions.invoke('createGroupPayment', {
          items: mappedItems,
          orderType,
          customer: { name: fullName, email: form.email, phone: form.phone, address: form.address, table: form.table },
          instructions: form.instructions,
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
        const fullName = form.name.trim();
        const res = await base44.functions.invoke('createPaymentIntent', {
          items: mappedItems,
          orderType,
          customer: { name: fullName, email: form.email, phone: form.phone, address: form.address, table: form.table },
          instructions: form.instructions,
          subtotal, deliveryFee, tax, total: totalWithTip, tip: tipAmount,
          discount: 0, redemptionId: null,
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

        <h1 className="font-heading text-4xl text-obsidian-roast mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left – Form */}
          <div className="lg:col-span-3 space-y-6">

            {step === 'details' && (
              <>
                {/* Order Type */}
                <div className="card-diner p-6">
                  <h2 className="font-heading text-lg text-obsidian-roast mb-4">Order Type</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { type: 'pickup', label: 'Pickup', sub: '15–25 min' },
                      { type: 'delivery', label: 'Delivery', sub: '35–50 min' },
                      { type: 'dine_in', label: 'Dine-In', sub: 'Seat yourself' },
                    ].map(({ type, label, sub }) => (
                      <button
                        key={type}
                        onClick={() => {
                          if (!cutoffStatus[type] && orderType !== type) {
                            base44.analytics.track({ eventName: 'checkout_order_type_selected', properties: { order_type: type } });
                          }
                          setOrderType(type);
                        }}
                        disabled={cutoffStatus[type]}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-heading text-sm ${
                          cutoffStatus[type]
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : orderType === type
                            ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry'
                            : 'border-border text-muted-foreground hover:border-midnight-cherry/40'
                        }`}
                      >
                        <img
                          src={ORDER_TYPE_IMAGES[type]}
                          alt={label}
                          className={`w-16 h-16 object-contain rounded-lg ${cutoffStatus[type] ? 'opacity-40 grayscale' : ''}`}
                        />
                        {label}
                        <span className="text-xs font-body opacity-60">{cutoffStatus[type] ? 'Closed for tonight' : sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pickup Time */}
                <div className="card-diner p-6">
                  <SchedulePicker onChange={setSchedule} />
                </div>

                {/* Loyalty & Rewards — stars-earned preview for members,
                    earn-rewards nudge for guests */}
                <CheckoutLoyaltyBar subtotal={subtotal} phone={form.phone} />

                {/* Contact Info */}
                <div className="card-diner p-6">
                  <h2 className="font-heading text-lg text-obsidian-roast mb-4">Your Info</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
                      <input type="text" autoComplete="name" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Jane Smith"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" autoComplete="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="jane@example.com"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" autoComplete="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(270) 555-0000"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
                    {orderType === 'dine_in' && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Table Number</label>
                        <input type="text" value={form.table} onChange={e => updateForm('table', e.target.value)} placeholder="e.g. 7"
                          className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      </div>
                    )}
                  </div>

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

                  {orderType === 'delivery' && (
                    <SavedAddressField
                      value={form.address}
                      onChange={val => updateForm('address', val)}
                      saved={savedAddress}
                    />
                  )}

                  <div className="mt-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                    <textarea value={form.instructions} onChange={e => updateForm('instructions', e.target.value)}
                      placeholder="Allergies, extra sauce, no pickles…" rows={3}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none" />
                  </div>
                </div>

                {/* Add a Tip */}
                <div className="card-diner p-6">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-heading text-lg text-obsidian-roast">Add a Tip</h2>
                    <span className="text-midnight-cherry font-heading text-lg">${tipAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">100% goes to the kitchen crew.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {tipPresets.map(preset => (
                      <button
                        key={preset.key}
                        onClick={() => setTipPreset(preset.key)}
                        className={`py-3 rounded-2xl border-2 font-heading text-sm transition-all ${
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
                      className={`py-3 rounded-2xl border-2 font-heading text-sm transition-all ${
                        tipPreset === 'custom'
                          ? 'border-midnight-cherry bg-midnight-cherry text-white'
                          : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {tipPreset === 'custom' && (
                    <div className="mt-3 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={customTip}
                        onChange={e => setCustomTip(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => { setTipPreset('0'); setCustomTip(''); }}
                    className="mt-3 text-xs text-muted-foreground underline hover:text-midnight-cherry transition-colors"
                  >
                    No tip
                  </button>
                </div>

                {/* Group payment mode — the whole group pays one fee; choose
                    whether one person pays everything or each pays their share. */}
                {groupMode && (
                  <div className="card-diner p-6">
                    <h2 className="font-heading text-lg text-obsidian-roast mb-1">Group Payment</h2>
                    <p className="text-sm text-muted-foreground mb-4">Split into per-person card charges, or pay the full total at once. The delivery fee is charged once either way.</p>
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
              <div className="card-diner p-6">
                <h2 className="font-heading text-lg text-obsidian-roast mb-1">Payment</h2>
                <p className="text-sm text-muted-foreground mb-5">Enter your card details below to complete your order.</p>
                <CheckoutLoyaltyBar subtotal={subtotal} phone={form.phone} />
                <div className="mb-5" />
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

          {/* Right – Order Summary */}
          <div className="lg:col-span-2">
            <div className="card-diner p-6 sticky top-32">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Order Summary</h2>

              <div className="flex items-center gap-2 bg-patina-mint/10 text-patina-mint rounded-2xl px-4 py-3 mb-5 text-sm font-heading">
                <Clock size={16} />
                <span>Ready by {readyLabel}</span>
              </div>

              <div className="space-y-3 mb-5">
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
                              <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                              <CartItemModifiers modifiers={item.selectedModifiers} />
                              <p className="text-xs text-muted-foreground">× {item.quantity}</p>
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
                        <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                        <CartItemModifiers modifiers={item.selectedModifiers} />
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                      <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm mb-5">
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

              <DownloadAppBanner variant="compact" />

              <div className="mt-4">
                <SignUpNudge variant="compact" />
              </div>
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