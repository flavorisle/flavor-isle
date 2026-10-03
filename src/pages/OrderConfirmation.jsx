import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, ShoppingBag, ArrowRight, ChefHat, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SignUpNudge from '@/components/SignUpNudge';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import AppDroppingSoonBanner from '@/components/AppDroppingSoonBanner';
import PostOrderFeedback from '@/components/PostOrderFeedback';
import CheckoutSmsOptIn from '@/components/CheckoutSmsOptIn';
import MerchPromoCard from '@/components/merch/MerchPromoCard';
import useLiveStatus from '@/hooks/useLiveStatus';

export default function OrderConfirmation() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const orderNumber = params.get('order_number');
  const orderId = params.get('order_id');
  const readyFor = params.get('ready_for');
  const readyForLabel = readyFor ? new Date(readyFor).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }) : null;
  const [confetti, setConfetti] = useState(false);
  const { waitMin } = useLiveStatus();
  const prepEstimate = waitMin ? `~${waitMin} min` : '15–25 min for pickup · 35–50 for delivery';

  // Kitchen sync status: 'sent' = order reached Square POS, 'sending' = push
  // still in flight, 'unknown' = can't confirm. The checkout flow awaits the
  // push before navigating here, so most orders are already 'sent' on arrival —
  // but poll a few times in case the Stripe webhook path is still processing.
  const [kitchenStatus, setKitchenStatus] = useState('sending');

  useEffect(() => {
    if (!orderId && !orderNumber) { setKitchenStatus('unknown'); return; }
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      while (!cancelled && attempts < 6) {
        attempts++;
        try {
          let order = null;
          if (orderId) order = await base44.entities.Order.get(String(orderId));
          const orders = order ? null : await base44.entities.Order.filter({ order_number: String(orderNumber) });
          const matchedOrder = order || (orders?.length === 1 ? orders[0] : null);
          if (matchedOrder?.square_order_id) { if (!cancelled) setKitchenStatus('sent'); return; }
        } catch {}
        if (attempts < 6) await new Promise(r => setTimeout(r, 3000));
      }
      if (!cancelled) setKitchenStatus('unknown');
    };
    check();
    return () => { cancelled = true; };
  }, [orderId, orderNumber]);

  useEffect(() => {
    setConfetti(true);
    // Simple confetti effect using canvas-confetti
    import('canvas-confetti').then(module => {
      const confetti = module.default;
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#A1001A', '#4E9F9F', '#FDFBF7', '#FFFFFF'],
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="card-diner p-10">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>

          {/* Kitchen sync status badge */}
          {kitchenStatus === 'sent' ? (
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-heading mb-4">
              <ChefHat size={16} />
              Sent to Kitchen!
            </div>
          ) : kitchenStatus === 'sending' ? (
            <div className="inline-flex items-center gap-2 bg-patina-mint/15 text-patina-mint px-4 py-2 rounded-full text-sm font-heading mb-4">
              <Loader2 size={16} className="animate-spin" />
              Sending to Kitchen…
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-heading mb-4">
              <CheckCircle size={16} />
              Order Received!
            </div>
          )}

          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">You're All Set!</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Thank you for your order! Your payment went through and our kitchen has been notified.
            Get ready for something delicious.
          </p>

          {(orderNumber || sessionId) && (
            <div className="bg-muted rounded-2xl p-3 mb-8">
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="font-mono text-sm text-obsidian-roast">{orderNumber || sessionId?.slice(0, 30)}</p>
            </div>
          )}

          {/* What's next */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: kitchenStatus === 'sent' ? ChefHat : kitchenStatus === 'sending' ? Loader2 : CheckCircle,
                label: kitchenStatus === 'sent' ? 'Sent to Kitchen' : kitchenStatus === 'sending' ? 'Sending to Kitchen' : 'Order Confirmed',
                desc: kitchenStatus === 'sent' ? 'Reached Square POS — the crew is on it' : kitchenStatus === 'sending' ? 'Transmitting to Square POS…' : 'Sent to our kitchen via Square',
                color: kitchenStatus === 'sent' ? 'text-green-600' : 'text-patina-mint',
                spin: kitchenStatus === 'sending',
              },
              { icon: Clock, label: 'Being Prepared', desc: readyForLabel ? `Ready by ${readyForLabel}` : prepEstimate, color: 'text-patina-mint' },
              { icon: ShoppingBag, label: 'Enjoy!', desc: 'Hot, fresh, and made with love', color: 'text-midnight-cherry' },
            ].map(step => (
              <div key={step.label} className={`bg-muted rounded-2xl p-4 ${kitchenStatus === 'sent' && step.label === 'Sent to Kitchen' ? 'ring-2 ring-green-300' : ''}`}>
                <step.icon size={22} className={`${step.color} mx-auto mb-2 ${step.spin ? 'animate-spin' : ''}`} />
                <p className="font-heading text-sm text-obsidian-roast">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* What to expect while you wait */}
          <Link
            to="/what-to-expect"
            className="block w-full text-left bg-patina-mint/5 border border-patina-mint/20 rounded-2xl p-4 mb-8 hover:bg-patina-mint/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-patina-mint/15 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-patina-mint" />
              </div>
              <div className="flex-1">
                <p className="font-heading text-sm text-obsidian-roast">What to expect while you wait</p>
                <p className="text-xs text-muted-foreground mt-0.5">See how busy we are & what each kitchen level means</p>
              </div>
              <ArrowRight size={16} className="text-patina-mint flex-shrink-0" />
            </div>
          </Link>

          {/* App dropping soon — shown while the crew prepares the order */}
          <AppDroppingSoonBanner />

          {/* Location reminder */}
          <div className="border border-border rounded-2xl p-4 mb-8 flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={18} className="text-midnight-cherry" />
            </div>
            <div>
              <p className="font-heading text-sm text-obsidian-roast">Flavor Isle</p>
              <p className="text-sm text-muted-foreground">Main Street, Smiths Grove, KY · (270) 563-4618</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/menu" className="btn-cherry chrome-hover flex-1 py-4 text-sm font-heading flex items-center justify-center gap-2">
              Order Again <ArrowRight size={16} />
            </Link>
            <Link to="/" className="flex-1 py-4 bg-muted text-obsidian-roast font-heading text-sm rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>

        {/* Quick feedback — capture the moment while the experience is fresh */}
        <div className="mt-6">
          <PostOrderFeedback orderId={orderNumber || sessionId} />
        </div>

        {/* SMS opt-in capture — order updates + deals by text */}
        <div className="mt-6">
          <CheckoutSmsOptIn />
        </div>

        {/* Tasty Threads merch promo — cross-sell while the order is prepped */}
        <div className="mt-6">
          <MerchPromoCard />
        </div>

        <SignUpNudge variant="featured" />

        {/* Push opt-in — best moment to ask, right after they place an order */}
        <div className="mt-6 text-left">
          <PushNotificationPrompt />
        </div>
      </div>

      <Footer />
    </div>
  );
}