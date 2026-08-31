import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Shirt } from 'lucide-react';

// Visit pop-up promoting the two $19.99 Tasty Threads tees. Shows once per
// browser session, and waits for the Caramel Apple Bliss pop-up to be
// dismissed first so the two never stack on top of each other.
const STORAGE_KEY = 'fi_tasty_threads_tees_seen';
const BLISS_KEY = 'fi_caramel_apple_bliss_seen';

const SHIRTS = [
  {
    id: 462593857,
    name: 'All You Need is Flavor Isle',
    image: 'https://files.cdn.printful.com/files/196/1969f01ea3bcd65b3ee5d20ee0897ca5_preview.png',
  },
  {
    id: 462577528,
    name: 'Feed Me Flavor Isle & Tell Me I\'m Pretty',
    image: 'https://files.cdn.printful.com/files/e3e/e3e9215aebc273152926012ae11e2a1d_preview.png',
  },
];

export default function TastyThreadsPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch (e) {
      // fall through to show
    }
    // Wait until the shake pop-up has been dismissed, then layer in.
    const interval = setInterval(() => {
      try {
        if (sessionStorage.getItem(BLISS_KEY)) {
          clearInterval(interval);
          setTimeout(() => setOpen(true), 800);
        }
      } catch (e) {
        clearInterval(interval);
        setOpen(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // ignore storage errors
    }
  };

  const goToShirt = (id) => {
    close();
    navigate(`/merch?product=${id}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0, 20, 40, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tasty-threads-popup-title"
      onClick={close}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-float-lg animate-float-up"
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
            Fresh Tees, Hot Off the Press
          </h2>
          <p className="font-heading text-lg mt-1" style={{ color: 'var(--midnight-cherry)' }}>
            $19.99 each
          </p>
        </div>

        {/* Shirts */}
        <div className="grid grid-cols-2 gap-4 px-6 pb-4">
          {SHIRTS.map((s) => (
            <button
              key={s.id}
              onClick={() => goToShirt(s.id)}
              className="card-diner overflow-hidden text-left group"
            >
              <div className="aspect-square overflow-hidden bg-white">
                <img
                  src={s.image}
                  alt={`${s.name} tee`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="eager"
                />
              </div>
              <div className="p-3">
                <p className="font-heading text-sm leading-tight" style={{ color: 'var(--patina-mint)' }}>
                  {s.name}
                </p>
                <span className="mt-1 text-xs font-heading uppercase tracking-widest inline-flex items-center gap-1" style={{ color: 'var(--midnight-cherry)' }}>
                  Grab yours <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* CTA bar */}
        <div
          className="px-6 py-5 flex flex-col sm:flex-row items-center gap-3 justify-center border-t-2"
          style={{ borderColor: 'var(--midnight-cherry)' }}
        >
          <button
            onClick={() => { close(); navigate('/merch'); }}
            className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2"
          >
            Shop All Tasty Threads <ArrowRight size={16} />
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
  );
}