import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, ShoppingBag, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SignUpNudge from '@/components/SignUpNudge';

export default function OrderConfirmation() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const orderNumber = params.get('order_number');
  const readyFor = params.get('ready_for');
  const readyForLabel = readyFor ? new Date(readyFor).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const [confetti, setConfetti] = useState(false);

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

          <div className="inline-flex items-center gap-2 bg-patina-mint/15 text-patina-mint px-4 py-2 rounded-full text-sm font-heading mb-4">
            <div className="w-2 h-2 bg-patina-mint rounded-full animate-pulse" />
            Order Received!
          </div>

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
              { icon: CheckCircle, label: 'Order Confirmed', desc: 'Sent to our kitchen via Square', color: 'text-green-500' },
              { icon: Clock, label: 'Being Prepared', desc: readyForLabel ? `Ready by ${readyForLabel}` : '15–25 min for pickup · 35–50 for delivery', color: 'text-patina-mint' },
              { icon: ShoppingBag, label: 'Enjoy!', desc: 'Hot, fresh, and made with love', color: 'text-midnight-cherry' },
            ].map(step => (
              <div key={step.label} className="bg-muted rounded-2xl p-4">
                <step.icon size={22} className={`${step.color} mx-auto mb-2`} />
                <p className="font-heading text-sm text-obsidian-roast">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>

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

        <SignUpNudge variant="featured" />
      </div>

      <Footer />
    </div>
  );
}