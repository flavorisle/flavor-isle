import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Shirt } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Visit pop-up promoting the newest Tasty Threads merch. Pulls the most
// recently added Printful products so the pop-up always shows what's fresh.
// Shows once per browser session.
const STORAGE_KEY = 'fi_new_merch_seen';
const POPUP_ID = 'tasty_threads_new_merch';

// Fire-and-forget click tracking — never block or break the pop-up UI.
const track = (action, target) => {
  base44.entities.PopupClick.create({ popup_id: POPUP_ID, action, ...(target ? { target } : {}) }).catch(() => {});
};

export default function TastyThreadsPopup() {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  // Fetch the newest Printful products — sorted by id descending (Printful
  // assigns sequential ids, so the highest ids are the most recently added).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getPrintfulProducts', {});
        if (cancelled) return;
        const all = res.data?.products || [];
        const newest = [...all].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 2);
        if (!cancelled) setProducts(newest);
      } catch (err) {
        // If the fetch fails, the pop-up simply won't show product cards.
      }
    })();
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch (e) {
      // fall through to show
    }
    // Small delay so the hero paints first, then the pop-up layers in.
    const t = setTimeout(() => { setOpen(true); track('view'); }, 600);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // ignore storage errors
    }
  };

  const dismiss = () => {
    track('dismiss');
    close();
  };

  const goToProduct = (product) => {
    track('shirt_click', product.name);
    close();
    navigate(`/merch?product=${product.id}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0, 20, 40, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tasty-threads-popup-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-float-lg animate-float-up"
        style={{ backgroundColor: 'var(--vanilla-malt)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading tracking-widest uppercase text-white mb-3"
            style={{ backgroundColor: 'var(--midnight-cherry)' }}
          >
            <Shirt size={13} /> Tasty Threads
          </div>
          <h2
            id="tasty-threads-popup-title"
            className="font-heading text-3xl leading-tight"
            style={{ color: 'var(--patina-mint)' }}
          >
            NEW MERCH JUST DROPPED! 👕🍔
          </h2>
          <div className="text-sm font-body mt-3 space-y-2 text-left sm:text-center" style={{ color: 'var(--patina-mint)' }}>
            <p>Fresh threads, hot off the press:</p>
            <p className="font-semibold">
              {products.length > 0
                ? products.map((p) => `• ${p.name}`).join('\n')
                : '• New tees, hoodies & more'}
            </p>
            <p>Soft, comfy, and printed to order in your size and color. Wear the flavor, Smiths Grove. 💙❤️</p>
          </div>
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 gap-4 px-6 pb-4">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => goToProduct(p)}
                className="card-diner overflow-hidden text-left group"
              >
                <div className="aspect-square overflow-hidden bg-white">
                  <img
                    src={p.thumbnail_url || (p.images && p.images[0]) || ''}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                </div>
                <div className="p-3">
                  <p className="font-heading text-sm leading-tight line-clamp-2" style={{ color: 'var(--patina-mint)' }}>
                    {p.name}
                  </p>
                  {p.fromPrice > 0 && (
                    <span className="text-xs font-heading" style={{ color: 'var(--midnight-cherry)' }}>
                      from ${p.fromPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="mt-1 text-xs font-heading uppercase tracking-widest inline-flex items-center gap-1" style={{ color: 'var(--midnight-cherry)' }}>
                    Grab yours <ArrowRight size={12} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CTA bar */}
        <div
          className="px-6 py-5 flex flex-col sm:flex-row items-center gap-3 justify-center border-t-2"
          style={{ borderColor: 'var(--midnight-cherry)' }}
        >
          <button
            onClick={() => { track('shop_all'); close(); navigate('/merch'); }}
            className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2"
          >
            Shop All Tasty Threads <ArrowRight size={16} />
          </button>
          <button
            onClick={dismiss}
            className="font-heading text-sm px-4 py-3 rounded-full border-2 transition-colors hover:bg-black/5"
            style={{ borderColor: 'var(--patina-mint)', color: 'var(--patina-mint)' }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}