import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SDK_URL = 'https://web.squarecdn.com/v1/square.js';

// Square's card form, rendered inside our own page — the customer types their
// card on flavor-isle.com and never leaves it. The card data goes straight from
// the browser to Square and comes back as a single-use token; our server is the
// only thing that turns that token into a charge.
//
// The SDK is loaded once per page (a second copy would break it), so a
// module-level promise is shared by every use.
let sdkPromise = null;
function loadSquareSdk() {
  if (window.Square) return Promise.resolve(window.Square);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-square-sdk]');
      const script = existing || document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.dataset.squareSdk = 'true';
      script.onload = () => (window.Square ? resolve(window.Square) : reject(new Error('Square.js loaded without Square')));
      script.onerror = () => reject(new Error('Square.js failed to load'));
      if (!existing) document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

export default function SquareCardForm({ orderNumber, amount, tip = 0, onSuccess, onError }) {
  const cardRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const cfgRes = await base44.functions.invoke('getSquareWebConfig', {});
        const cfg = cfgRes?.data || {};
        if (!cfg.configured) {
          if (active) setLoadError(cfg.reason || 'Card payment is unavailable right now.');
          return;
        }
        const Square = await loadSquareSdk();
        const card = Square.payments(cfg.applicationId, cfg.locationId).card();
        await card.attach('#square-card-container');
        if (!active) {
          try { await card.destroy(); } catch { /* already gone */ }
          return;
        }
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        console.error('Square card form failed to start:', err?.message);
        if (active) {
          setLoadError("We couldn't load the secure card form. Check your connection, turn off any ad blocker, then reload this page.");
        }
      }
    })();

    return () => {
      active = false;
      const instance = cardRef.current;
      cardRef.current = null;
      if (instance) {
        try { instance.destroy(); } catch { /* already gone */ }
      }
    };
  }, []);

  const handlePay = async () => {
    if (!cardRef.current || paying) return;
    setPaying(true);
    onError('');
    try {
      const result = await cardRef.current.tokenize();
      if (result?.status !== 'OK' || !result.token) {
        onError(result?.errors?.[0]?.message || 'Check your card details and try again.');
        setPaying(false);
        return;
      }
      const res = await base44.functions.invoke('paySquareOrder', {
        order_number: orderNumber,
        source_id: result.token,
        ...(Number(tip) > 0 ? { tip: Number(tip) } : {}),
      });
      const data = res?.data || {};
      if (data?.settled === true) {
        onSuccess(data);
        return;
      }
      onError(data?.error || 'That payment did not go through. Please try again.');
      setPaying(false);
    } catch (err) {
      console.error('Square charge failed:', err?.message);
      onError(
        err?.response?.data?.error ||
          "We couldn't take that payment. Check your connection and try again, or call us at (270) 563-4618.",
      );
      setPaying(false);
    }
  };

  const disabled = !ready || paying;

  return (
    <div className="card-diner p-5">
      <div id="square-card-container" className="rounded-xl border border-border bg-white p-3 min-h-[110px]" />
      {!ready && !loadError && <p className="text-xs text-muted-foreground mt-3">Loading the secure card form…</p>}
      {loadError && <p className="text-sm text-destructive mt-3">{loadError}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={disabled}
        className={`w-full mt-4 py-4 font-heading text-sm flex items-center justify-center gap-2 ${
          disabled ? 'rounded-full bg-muted text-muted-foreground cursor-not-allowed' : 'btn-cherry chrome-hover'
        }`}
      >
        <Lock size={15} />
        {paying ? 'Processing…' : `Pay $${Number(amount || 0).toFixed(2)}`}
      </button>
      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Nothing is cooked until this goes through.
      </p>
    </div>
  );
}