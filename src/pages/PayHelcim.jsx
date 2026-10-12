import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Loader2, ShieldCheck, AlertTriangle, Lock } from 'lucide-react';

// Our own secure payment page for the Helcim path (issue #97, Part B).
//
// The customer never leaves flavor-isle.com and never sees a processor name: our
// own page, our own branding. Helcim renders the card fields inside it, and once
// Helcim reports the result this page asks the server to verify the payment —
// nothing is sent to the kitchen on the browser's word.
export default function PayHelcim() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderNumber = params.get('order_number') || '';
  const checkoutToken = params.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const settling = useRef(false);

  useEffect(() => {
    if (!checkoutToken || !orderNumber) {
      setStatus('error');
      setMessage('This payment page is missing its order details. Please use the link we sent you, or call us at (270) 563-4618.');
      return undefined;
    }

    // Verify with the server, then hand the customer to the confirmation screen.
    const settle = async (transactionId) => {
      if (settling.current) return;
      settling.current = true;
      setStatus('confirming');
      try {
        const res = await base44.functions.invoke('settleHelcimWebPayment', {
          order_number: orderNumber,
          ...(transactionId ? { transaction_id: String(transactionId) } : {}),
        });
        const data = res?.data || res;
        if (data?.settled) {
          window.location.href = data?.merch
            ? `/merch-confirmation?order_number=${orderNumber}&helcim=1`
            : `/order-confirmation?order_number=${orderNumber}&helcim=1`;
          return;
        }
        setStatus('paying');
        setMessage('');
      } catch (error) {
        console.warn('Helcim settlement check failed:', error.message);
        setStatus('paying');
      } finally {
        settling.current = false;
      }
    };

    // Helcim's own page reports the result back to us here.
    const onMessage = (event) => {
      const payload = event?.data || {};
      const eventName = String(payload.eventName || '');
      const fromHelcim = /helcim/i.test(String(event?.origin || '')) || eventName.includes(checkoutToken) || /helcim/i.test(eventName);
      if (!fromHelcim) return;
      const transactionId = payload?.data?.transactionId || payload?.data?.transaction_id || payload?.transactionId || '';
      settle(transactionId);
    };
    window.addEventListener('message', onMessage);

    // Helcim Pay renders the card fields in this page.
    const existing = document.getElementById('helcim-pay-script');
    const mount = () => {
      if (typeof window.appendHelcimPayIframe === 'function') {
        window.appendHelcimPayIframe(checkoutToken);
        setStatus('paying');
      } else {
        setStatus('error');
        setMessage('The secure card form could not be loaded. Please turn off any ad blocker and reload this page, or call us at (270) 563-4618.');
      }
    };
    if (existing) {
      mount();
    } else {
      const script = document.createElement('script');
      script.id = 'helcim-pay-script';
      script.src = 'https://js.helcim.com/helcim-pay/v2/helcim-pay.js';
      script.async = true;
      script.onload = mount;
      script.onerror = () => {
        setStatus('error');
        setMessage('The secure card form could not be loaded. Please check your connection and reload, or call us at (270) 563-4618.');
      };
      document.body.appendChild(script);
    }

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [checkoutToken, orderNumber]);

  return (
    <div className="min-h-screen force-light" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="card-diner p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-patina-mint" />
            <h1 className="font-heading text-2xl text-obsidian-roast">Secure payment</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Order #{orderNumber} · paid right here on flavor-isle.com
          </p>

          {status === 'confirming' ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" /> Confirming your payment…
            </div>
          ) : status === 'error' ? (
            <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {message}
              </p>
            </div>
          ) : (
            <>
              <div id="helcim-pay-container" className="mb-3" />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock size={12} /> Your card details are entered on this page and go straight to our payment processor. Flavor Isle never sees your card number.
              </p>
            </>
          )}
        </div>

        <Link to="/" className="inline-block mt-5 text-sm text-patina-mint hover:text-midnight-cherry">
          Return to flavor-isle.com
        </Link>
      </div>
      <Footer />
    </div>
  );
}