import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

// Double opt-in confirmation landing page. The confirmation email links here
// with ?token=<confirm_token>; on load we activate the subscription.
export default function ConfirmSubscription() {
  const [status, setStatus] = useState('loading');
  const [already, setAlready] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke('confirmEmailSubscription', { token });
        if (res.data?.ok) { setAlready(!!res.data?.alreadyActive); setStatus('done'); }
        else setStatus('error');
      } catch { setStatus('error'); }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-16">
        <div className="card-diner p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={40} className="animate-spin mx-auto mb-4 text-midnight-cherry" />
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">Confirming your subscription…</h1>
            </>
          )}
          {status === 'done' && (
            <>
              <div className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-midnight-cherry" />
              </div>
              <h1 className="font-heading text-3xl text-obsidian-roast mb-2">{already ? "You're already subscribed!" : "You're confirmed!"}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {already
                  ? "Your subscription was already active — no need to do anything else."
                  : "Thanks for confirming. You're on the list for new menu items, seasonal shakes, and special events from Flavor Isle."}
              </p>
              <Link to="/menu" className="btn-cherry chrome-hover px-8 py-3.5 text-sm font-heading inline-block">Order Now</Link>
            </>
          )}
          {status === 'invalid' && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-destructive" />
              </div>
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">Invalid link</h1>
              <p className="text-sm text-muted-foreground mb-6">This confirmation link is missing a token. Use the button in your confirmation email.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-destructive" />
              </div>
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This link didn't work</h1>
              <p className="text-sm text-muted-foreground mb-6">Your confirmation link may have expired or already been used. Sign up again to get a fresh one.</p>
              <Link to="/newsletter" className="btn-mint chrome-hover px-8 py-3.5 text-sm font-heading inline-block">Sign Up Again</Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}