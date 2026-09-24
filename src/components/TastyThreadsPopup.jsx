import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Shirt } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'fi_new_merch_session';
const DISMISS_KEY = 'fi_new_merch_dismissed';
const POPUP_ID = 'tasty_threads_new_merch';
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const TRIGGER_DELAY_MS = 18000; // 18s on page — never on load

// Module-level guard: the view event fires exactly once per page load, even if
// the component re-mounts (React StrictMode, route transitions, keep-alive tab
// toggles). Fixes the triple-view / paired-dismissal duplicate-logging bug seen
// in PopupClick data (views at 02:44:45.3/.7/02:44:46.1).
let viewFired = false;

const track = (action, target) => {
  base44.entities.PopupClick.create({ popup_id: POPUP_ID, action, ...(target ? { target } : {}) }).catch(() => {});
};

function isDismissedRecently() {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    if (!ts) return false;
    return Date.now() - ts < DISMISS_COOLDOWN_MS;
  } catch { return false; }
}

function markDismissed() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

export default function TastyThreadsPopup() {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const navigate = useNavigate();
  const shownRef = useRef(false); // prevents double-trigger within one mount

  // Fetch the single newest Printful product (once).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getPrintfulProducts', {});
        if (cancelled) return;
        const all = res.data?.products || [];
        const newest = [...all].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 1);
        if (!cancelled) setProduct(newest[0] || null);
      } catch {
        // fetch failed — pop-up shows without a product card
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Trigger: 18s on page OR exit intent. Once per session. Suppressed for 14
  // days after a dismissal. Never on page load.
  useEffect(() => {
    if (shownRef.current) return;
    if (isDismissedRecently()) return;
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch {}

    let fired = false;
    const show = () => {
      if (fired || shownRef.current) return;
      fired = true;
      shownRef.current = true;
      setOpen(true);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      if (!viewFired) { viewFired = true; track('view'); }
    };

    const timer = setTimeout(show, TRIGGER_DELAY_MS);

    // Exit intent (desktop) — cursor leaves the top of the viewport.
    const onMouseOut = (e) => {
      if (fired) return;
      if (e.relatedTarget) return; // moving to another element, not leaving
      if (e.clientY < 10) show();
    };
    document.addEventListener('mouseout', onMouseOut);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, []);

  const dismiss = () => {
    markDismissed();
    track('dismiss');
    setOpen(false);
  };

  const goToProduct = () => {
    if (product) track('shirt_click', product.name);
    setOpen(false);
    navigate(product ? `/merch?product=${product.id}` : '/merch');
  };

  if (!open) return null;

  // Small bottom-right card — ≤20% of viewport, non-blocking, Google mobile
  // interstitial-compliant (no full-screen overlay, delayed trigger).
  return (
    <div
      className="fixed bottom-3 right-3 z-[100] max-w-[300px] w-[calc(100%-1.5rem)] sm:w-[300px] animate-float-up safe-bottom"
      role="dialog"
      aria-label="Tasty Threads new merch"
    >
      <div
        className="relative rounded-2xl shadow-float-lg overflow-hidden"
        style={{ backgroundColor: 'var(--vanilla-malt)', border: '2px solid var(--midnight-cherry)' }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X size={16} />
        </button>

        {product ? (
          <button onClick={goToProduct} className="block w-full text-left">
            <div className="aspect-[4/3] overflow-hidden bg-white">
              <img
                src={product.thumbnail_url || (product.images && product.images[0]) || ''}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </button>
        ) : (
          <div className="px-4 pt-5 pb-2 text-center">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-1"
              style={{ backgroundColor: 'var(--midnight-cherry)' }}
            >
              <Shirt size={11} /> Tasty Threads
            </div>
          </div>
        )}

        <div className="px-4 py-3">
          <p className="font-heading text-sm leading-tight line-clamp-2" style={{ color: 'var(--patina-mint)' }}>
            {product ? product.name : 'New merch just dropped!'}
          </p>
          {product?.fromPrice > 0 && (
            <p className="text-xs font-heading" style={{ color: 'var(--midnight-cherry)' }}>
              from ${product.fromPrice.toFixed(2)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { track('shop_all'); setOpen(false); navigate('/merch'); }}
              className="btn-cherry chrome-hover flex-1 px-3 py-2 text-xs font-heading flex items-center justify-center gap-1"
            >
              Shop All <ArrowRight size={12} />
            </button>
            <button
              onClick={dismiss}
              className="text-xs font-heading px-3 py-2 rounded-full border-2 transition-colors hover:bg-black/5"
              style={{ borderColor: 'var(--patina-mint)', color: 'var(--patina-mint)' }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}