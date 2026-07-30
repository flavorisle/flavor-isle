import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Bike, Utensils, AlertCircle, Lock, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import RewardSelector from '@/components/checkout/RewardSelector';
import SchedulePicker from '@/components/checkout/SchedulePicker';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import CartItemModifiers from '@/components/CartItemModifiers';
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
      <div className="border border-border rounded-2xl px-4 py-4 bg-muted mb-5">
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
  const { cartItems, orderType, setOrderType, subtotal, deliveryFee, tax, total, clearCart, orderingEnabled, orderingClosedMessage, cutoffStatus } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', table: '', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payment step state
  const [step, setStep] = useState('details'); // 'details' | 'payment'
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

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

  // Loyalty rewards — available (unused, unexpired) redemptions for signed-in users
  const { user } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [appliedRewardId, setAppliedRewardId] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.LoyaltyRedemption.filter({ user_id: user.id, is_redeemed: false }).then(rr => {
      const now = new Date();
      setRewards((rr || []).filter(r => !r.expires_at || new Date(r.expires_at) > now));
    });
  }, [user]);

  const appliedReward = rewards.find(r => r.id === appliedRewardId) || null;
  const discountAmount = appliedReward ? Math.min(appliedReward.discount_value, total) : 0;
  const totalWithTip = +(Math.max(0, total - discountAmount) + tipAmount).toFixed(2);

  const readyAt = schedule.scheduledFor ? new Date(schedule.scheduledFor) : null;
  const readyLabel = readyAt
    ? `${readyAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${schedule.mode === 'asap' ? ' (≈ 20 min)' : ''}`
    : 'ASAP (≈ 20 min)';

  const updateForm = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

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

    setLoading(true);
    try {
      const res = await base44.functions.invoke('createPaymentIntent', {
        items: cartItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url, selectedModifiers: i.selectedModifiers || [] })),
        orderType,
        customer: { name: form.name, email: form.email, phone: form.phone, address: form.address, table: form.table },
        instructions: form.instructions,
        subtotal, deliveryFee, tax, total: totalWithTip, tip: tipAmount,
        discount: discountAmount, redemptionId: appliedReward?.id || null,
        scheduledFor,
        estimatedTime,
      });

      const { clientSecret: cs, publishableKey, orderNumber: on } = res.data;
      setClientSecret(cs);
      setOrderNumber(on);
      setStripePromise(loadStripe(publishableKey));
      setStep('payment');
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

  if (!orderingEnabled) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-24 px-4 text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">Ordering is Closed</h2>
          <p className="text-muted-foreground mb-8">{orderingClosedMessage}</p>
          <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-block">Browse the Menu</Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-32 lg:pb-10">
        <div className="flex items-center gap-4 mb-8">
          {step === 'payment' ? (
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
                      { type: 'pickup', Icon: ShoppingBag, label: 'Pickup', sub: '15–25 min' },
                      { type: 'delivery', Icon: Bike, label: 'Delivery', sub: '35–50 min' },
                      { type: 'dine_in', Icon: Utensils, label: 'Dine-In', sub: 'Seat yourself' },
                    ].map(({ type, Icon, label, sub }) => (
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
                        <Icon size={20} />
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

                {/* Contact Info */}
                <div className="card-diner p-6">
                  <h2 className="font-heading text-lg text-obsidian-roast mb-4">Your Info</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name *</label>
                      <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Jane Smith"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email *</label>
                      <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} placeholder="jane@example.com"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="(270) 555-0000"
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

                  {orderType === 'delivery' && (
                    <div className="mt-4">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivery Address *</label>
                      <input type="text" value={form.address} onChange={e => updateForm('address', e.target.value)} placeholder="123 Main St, Smiths Grove, KY 42171"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                    </div>
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

                {/* Loyalty Rewards */}
                {user && rewards.length > 0 && (
                  <RewardSelector
                    rewards={rewards}
                    subtotal={subtotal}
                    appliedId={appliedRewardId}
                    onApply={setAppliedRewardId}
                  />
                )}
              </>
            )}

            {step === 'payment' && stripePromise && clientSecret && (
              <div className="card-diner p-6">
                <h2 className="font-heading text-lg text-obsidian-roast mb-1">Payment</h2>
                <p className="text-sm text-muted-foreground mb-5">Enter your card details below to complete your order.</p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PaymentForm
                    clientSecret={clientSecret}
                    orderNumber={orderNumber}
                    onSuccess={handleSuccess}
                    onError={setError}
                    total={totalWithTip}
                  />
                </Elements>
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
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                      <CartItemModifiers modifiers={item.selectedModifiers} />
                      <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                    </div>
                    <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm mb-5">
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
                {discountAmount > 0 && (
                  <div className="flex justify-between text-patina-mint font-semibold">
                    <span>Reward Discount</span><span>−${discountAmount.toFixed(2)}</span>
                  </div>
                )}
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
                      <>Continue to Payment · ${totalWithTip.toFixed(2)}</>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground text-center mt-3">🔒 Secure checkout · 256-bit SSL encryption</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile CTA — keeps the primary action reachable without scrolling the full summary */}
      {step === 'details' && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-float-lg px-4 py-3 safe-bottom">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Continue to Payment · ${totalWithTip.toFixed(2)}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}