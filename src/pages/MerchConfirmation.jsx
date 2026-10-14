// Tasty Threads order confirmation.
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Truck, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMerchCart } from '@/context/MerchCartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function MerchConfirmation() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderNumber = params.get('order_number');
  const [confetti, setConfetti] = useState(false);

  // Paid on the secure payment page: the payment is verified server-side on
  // arrival, and only a verified payment sends the gear to production. This
  // reflects whether it has cleared yet.
  // The card page is the live path; the older Square return is still handled for an
  // order paid on the retired page.
  const cardReturn = params.get('card') === '1';
  const squareReturn = params.get('square') === '1';
  const paidReturn = cardReturn || squareReturn;
  const [paymentConfirmed, setPaymentConfirmed] = useState(null);
  const { clearCart: clearMerchCart } = useMerchCart();

  // Arriving with card=1 means the card fields on our own page just took this payment,
  // so the bag that was paid for is done with.
  useEffect(() => {
    if (cardReturn) clearMerchCart();
  }, [cardReturn, clearMerchCart]);
  useEffect(() => {
    if (!paidReturn || !orderNumber) return;
    (async () => {
      try {
        const settleFn = cardReturn ? 'settleHelcimWebPayment' : 'settleSquareWebPayment';
        const res = await base44.functions.invoke(settleFn, { order_number: String(orderNumber) });
        setPaymentConfirmed(res?.data?.settled === true);
      } catch (err) {
        console.error('Payment confirmation on return failed:', err);
        setPaymentConfirmed(false);
      }
    })();
  }, [paidReturn, cardReturn, orderNumber]);

  useEffect(() => {
    setConfetti(true);
    import('canvas-confetti').then(module => {
      module.default({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.4 },
        colors: ['#CC3300', '#003366', '#F5A623', '#FDF6E3'],
      });
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="card-diner p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <div className="inline-flex items-center gap-2 bg-patina-mint/15 text-patina-mint px-4 py-2 rounded-full text-sm font-heading mb-4">
            <div className="w-2 h-2 bg-patina-mint rounded-full animate-pulse" />
            {paidReturn && paymentConfirmed === false ? 'Confirming Payment…' : 'Order Received!'}
          </div>
          <h1 className="font-heading text-4xl text-obsidian-roast mb-3">Thanks for your order!</h1>
          <p className="text-muted-foreground text-lg mb-8">
            {paidReturn && paymentConfirmed === false
              ? "We're confirming your payment now. Your Tasty Threads gear goes into production the moment it clears, and you'll get a tracking number by email once it ships."
              : "Your Tasty Threads gear is headed into production. You'll get a tracking number by email once it ships."}
          </p>
          {orderNumber && (
            <div className="bg-muted rounded-2xl p-3 mb-8">
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="font-mono text-sm text-obsidian-roast">{orderNumber}</p>
            </div>
          )}
          <div className="border border-border rounded-2xl p-4 mb-8 flex items-start gap-3 text-left">
            <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-midnight-cherry" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm text-obsidian-roast">Printed on demand</p>
              <p className="text-sm text-muted-foreground mb-2">Fulfilled by Printful — your gear is made just for you.</p>
              <div className="flex flex-wrap gap-2 text-[11px] font-heading uppercase tracking-widest">
                <span className="bg-patina-mint/10 text-patina-mint px-2.5 py-1 rounded-full">2–7 days production</span>
                <span className="bg-patina-mint/10 text-patina-mint px-2.5 py-1 rounded-full">2–5 days shipping</span>
                <span className="bg-midnight-cherry/10 text-midnight-cherry px-2.5 py-1 rounded-full">Tracking emailed</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/merch" className="btn-cherry chrome-hover flex-1 py-4 text-sm font-heading flex items-center justify-center gap-2">
              Keep Shopping <ArrowRight size={16} />
            </Link>
            <Link to="/" className="flex-1 py-4 bg-muted text-obsidian-roast font-heading text-sm rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}