// Tasty Threads checkout — shipping + Stripe embedded checkout (iframe on page).
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Lock, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import { useMerchCart } from '@/context/MerchCartContext';
import ProductionTimeNotice from '@/components/merch/ProductionTimeNotice';
import BrandSelect, { BrandOption } from '@/components/BrandSelect';
import { trackBeginCheckout, trackPurchase, merchItemToGa4 } from '@/lib/ga4Ecommerce';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function MerchCheckout() {
  const { items, subtotal, clearCart } = useMerchCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    address1: '', address2: '', city: '', state_code: 'KY', zip: '', country_code: 'US',
  });
  const [shipping, setShipping] = useState(null);
  const [rateName, setRateName] = useState('');
  const [ratingShipping, setRatingShipping] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  // Embedded Stripe checkout session — when set, the Stripe form is mounted
  // in an iframe on this page instead of redirecting the customer away.
  const [embedded, setEmbedded] = useState(null); // { clientSecret, session_id, orderNumber }
  const [stripePromise, setStripePromise] = useState(null);
  const [mounting, setMounting] = useState(false);

  const total = subtotal + (shipping || 0);

  // Mount the Stripe embedded checkout iframe once a session is created.
  useEffect(() => {
    if (!embedded || !stripePromise) return;
    let checkout;
    let cancelled = false;
    setMounting(true);
    (async () => {
      try {
        const stripe = await stripePromise;
        checkout = await stripe.initEmbeddedCheckout({ clientSecret: embedded.clientSecret });
        if (cancelled) { checkout.destroy(); return; }
        checkout.mount('#merch-embedded-checkout');
        checkout.onComplete(() => {
          trackPurchase(items.map(merchItemToGa4), {
            transaction_id: embedded.orderNumber,
            value: total,
            shipping,
          });
          clearCart();
          navigate(`/merch-confirmation?session_id=${embedded.session_id}&order_number=${embedded.orderNumber}`);
        });
      } catch (err) {
        if (!cancelled) setError('Could not load checkout. Please try again.');
      } finally {
        if (!cancelled) setMounting(false);
      }
    })();
    return () => { cancelled = true; if (checkout) checkout.destroy(); };
  }, [embedded, stripePromise]);

  // GA4 ecommerce: fire begin_checkout once when the customer lands on merch checkout.
  useEffect(() => {
    if (items.length > 0) {
      trackBeginCheckout(items.map(merchItemToGa4), total);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const validateAddress = () => {
    if (!form.name.trim() || !form.email.trim()) return 'Please enter your name and email.';
    if (!form.address1.trim() || !form.city.trim() || !form.state_code || !form.zip.trim()) return 'Please complete your shipping address.';
    return '';
  };

  const handleGetShipping = async () => {
    setError('');
    const v = validateAddress();
    if (v) { setError(v); return; }
    setRatingShipping(true);
    try {
      const res = await base44.functions.invoke('getPrintfulShipping', {
        recipient: {
          address1: form.address1,
          city: form.city,
          state_code: form.state_code,
          country_code: form.country_code,
          zip: form.zip,
        },
        items: items.map(i => ({ variant_id: i.variant_id, sync_variant_id: i.sync_variant_id, quantity: i.quantity })),
      });
      setShipping(res.data.shipping);
      setRateName(res.data.rateName);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not calculate shipping. Check the address and try again.');
    } finally {
      setRatingShipping(false);
    }
  };

  const handlePay = async () => {
    setError('');
    if (items.length === 0) { setError('Your bag is empty.'); return; }
    const v = validateAddress();
    if (v) { setError(v); return; }
    if (shipping == null) { setError('Please calculate shipping first.'); return; }
    setPaying(true);
    try {
      const res = await base44.functions.invoke('createMerchCheckout', {
        items,
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: {
            address1: form.address1.trim(),
            address2: form.address2.trim(),
            city: form.city.trim(),
            state_code: form.state_code,
            country_code: form.country_code,
            zip: form.zip.trim(),
          },
        },
        shipping,
        subtotal,
        total,
      });
      if (res.data?.client_secret) {
        // Create the embedded checkout session and mount it on this page.
        setStripePromise(loadStripe(res.data.publishableKey));
        setEmbedded({
          clientSecret: res.data.client_secret,
          session_id: res.data.session_id,
          orderNumber: res.data.order_number,
        });
      } else {
        setError('Could not start checkout. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Checkout failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <div className="max-w-lg mx-auto py-24 px-4 text-center">
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">Your merch bag is empty</h2>
          <Link to="/merch" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-block">Browse Tasty Threads</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-32 lg:pb-10">
        <Link to="/merch" className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Back to Tasty Threads
        </Link>
        <h1 className="font-heading text-4xl text-obsidian-roast mb-8">Merch Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left – form */}
          <div className="lg:col-span-3 space-y-6">
            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Contact</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
                  <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="jane@example.com"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(270) 555-0000"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
              </div>
            </div>

            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Street Address *</label>
                  <input value={form.address1} onChange={e => update('address1', e.target.value)} placeholder="123 Main St"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Apt / Suite</label>
                  <input value={form.address2} onChange={e => update('address2', e.target.value)} placeholder="Apt 4"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">City *</label>
                  <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Smiths Grove"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">State *</label>
                  <BrandSelect value={form.state_code} onValueChange={(v) => update('state_code', v)}>
                    {US_STATES.map(s => <BrandOption key={s} value={s}>{s}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">ZIP *</label>
                  <input value={form.zip} onChange={e => update('zip', e.target.value)} placeholder="42171"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                </div>
              </div>
              <button
                onClick={handleGetShipping}
                disabled={ratingShipping}
                className="mt-4 btn-mint px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
              >
                {ratingShipping ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Truck size={16} />}
                {shipping != null ? 'Recalculate Shipping' : 'Calculate Shipping'}
              </button>
              {shipping != null && (
                <div className="mt-3 flex items-center gap-2 bg-patina-mint/10 text-patina-mint rounded-2xl px-4 py-3 text-sm font-heading">
                  <Truck size={16} /> {rateName} — ${shipping.toFixed(2)}
                </div>
              )}
            </div>

            {/* Stripe embedded checkout — mounts in an iframe on the page once
                the customer clicks Continue to Payment. No redirect away. */}
            {embedded && (
              <div className="card-diner p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-lg text-obsidian-roast">Payment</h2>
                  <button
                    onClick={() => { setEmbedded(null); setStripePromise(null); }}
                    className="text-xs text-muted-foreground hover:text-midnight-cherry transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {mounting && (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-midnight-cherry border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <div id="merch-embedded-checkout" />
              </div>
            )}
          </div>

          {/* Right – summary */}
          <div className="lg:col-span-2">
            <div className="card-diner p-6 sticky top-32">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Order Summary</h2>
              <div className="space-y-3 mb-5">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3">
                    <div className="flex gap-3">
                      {item.image && <img src={item.image} alt="" className="w-12 h-12 object-cover rounded-lg bg-muted flex-shrink-0" />}
                      <div>
                        <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                        <p className="text-xs text-patina-mint">{item.variantName}</p>
                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                      </div>
                    </div>
                    <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 space-y-2 text-sm mb-4">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>{shipping != null ? `$${shipping.toFixed(2)}` : 'Calculated below'}</span>
                </div>
                <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              <ProductionTimeNotice variant="compact" className="mb-5" />

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {embedded ? (
                <p className="text-xs text-patina-mint text-center font-heading">Complete your payment below ↓</p>
              ) : (
                <button
                  onClick={handlePay}
                  disabled={paying || shipping == null}
                  className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paying ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={15} /> Continue to Payment · ${total.toFixed(2)}</>}
                </button>
              )}
              {shipping == null && !embedded && <p className="text-xs text-muted-foreground text-center mt-2">Calculate shipping to enable payment.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}