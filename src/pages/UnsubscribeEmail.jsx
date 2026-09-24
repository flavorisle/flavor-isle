import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

// One-click unsubscribe landing page. Every newsletter email links here
// with ?token=<unsubscribe_token>; on load we set the subscriber to
// unsubscribed and record the timestamp.
export default function UnsubscribeEmail() {
  const [status, setStatus] = useState('loading');
  const [already, setAlready] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      try {
        const res = await base44.functions.invoke('unsubscribeEmail', { token });
        if (res.data?.ok) { setAlready(!!res.data?.alreadyUnsubscribed); setStatus('done'); }
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
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">Unsubscribing…</h1>
            </>
          )}
          {status === 'done' && (
            <>
              <div className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-midnight-cherry" />
              </div>
              <h1 className="font-heading text-3xl text-obsidian-roast mb-2">{already ? "You were already unsubscribed" : "You're unsubscribed"}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {already
                  ? "You were already off the list — no further emails will come from the newsletter."
                  : "Sorry to see you go! You won't receive any more newsletter emails from Flavor Isle. (Order-related emails are unaffected.)"}
              </p>
              <Link to="/menu" className="btn-cherry chrome-hover px-8 py-3.5 text-sm font-heading inline-block">Back to the Menu</Link>
            </>
          )}
          {status === 'invalid' && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-destructive" />
              </div>
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">Invalid link</h1>
              <p className="text-sm text-muted-foreground mb-6">This unsubscribe link is missing a token. Use the unsubscribe link in your newsletter email.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-destructive" />
              </div>
              <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This link didn't work</h1>
              <p className="text-sm text-muted-foreground mb-6">Your unsubscribe link may be invalid. Email hello@order.flavor-isle.com and we'll remove you right away.</p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}