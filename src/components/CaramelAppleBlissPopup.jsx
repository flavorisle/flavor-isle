import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';

// Visit pop-up promoting the limited-time Caramel Apple Bliss shake.
// Shows once per browser session (sessionStorage) so it doesn't nag repeat
// visitors. CTA deep-links into the Shake Isle page and auto-opens the size
// picker for the Caramel Apple Bliss premium shake.
const STORAGE_KEY = 'fi_caramel_apple_bliss_seen';
const PROMO_IMAGE =
  'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/170e2d430_attTKamXBOjFy4zFpNJ1vGMqwXd-Wh3NxdzIhUaQjy3Q20.jpeg';
const CARAMEL_APPLE_BLISS_ID = '6a7b92470796edccdb26af34';

export default function CaramelAppleBlissPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch (e) {
      // sessionStorage may be unavailable (private mode) — fall through to show.
    }
    // Small delay so the hero paints first, then the pop-up layers in.
    const t = setTimeout(() => setOpen(true), 600);
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

  const goToBliss = () => {
    close();
    navigate(`/milkshakes?bliss=${CARAMEL_APPLE_BLISS_ID}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0, 20, 40, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="caramel-apple-bliss-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl shadow-float-lg animate-float-up"
        style={{ backgroundColor: 'var(--vanilla-malt)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Promo graphic */}
        <div className="relative">
          <img
            src={PROMO_IMAGE}
            alt="Caramel Apple Bliss shake — new limited-time flavor at Flavor Isle"
            className="w-full h-auto block"
            loading="eager"
          />
        </div>

        {/* CTA bar */}
        <div className="px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center gap-4 justify-between border-t-2"
          style={{ borderColor: 'var(--midnight-cherry)' }}
        >
          <div className="text-center sm:text-left">
            <p
              className="font-heading text-lg leading-tight"
              style={{ color: 'var(--patina-mint)' }}
            >
              Limited Time Only
            </p>
            <p className="text-xs font-heading tracking-widest uppercase" style={{ color: 'var(--midnight-cherry)' }}>
              Try it before it's gone
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={goToBliss}
              className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2"
            >
              Order Now <ArrowRight size={16} />
            </button>
            <button
              onClick={close}
              className="font-heading text-sm px-4 py-3 rounded-full border-2 transition-colors hover:bg-black/5"
              style={{ borderColor: 'var(--patina-mint)', color: 'var(--patina-mint)' }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}