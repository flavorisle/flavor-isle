import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Package } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { COMBO_ISLE_ANNOUNCEMENT as CFG } from '@/config/comboIsleAnnouncement';
import { optimizedImageUrl } from '@/lib/utils';
import { issue23Photos } from '@/lib/issue23Photos';

// Combo Isle announcement pop-up (Wesley, Nov 15 2026, issue #315).
// Real Flavor Isle photos only: the cheeseburger-and-tots shot and the crinkle
// fries shot, both from the gallery. The only edit is cropping via object-fit.
// Nothing here mentions a discount.
const SEEN_KEY = 'fi.comboIsleAnnouncement.seen';
const SESSION_KEY = 'fi.comboIsleAnnouncement.session';

// Issue #333: the pop-up photo was the /menu LCP at 7.1s because it was a 467 KB
// cross-app storage file and a 1.1 MB full-size PNG. Both now come from this
// app's own media library — the burger is the issue #23 import of the same
// IMG_0099 shot — and each is requested as a 500x500 WebP, the way
// MenuItemCard requests a menu photo.
const BURGER_PHOTO = issue23Photos.diner0099;
const FRIES_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/c5a5ce796_IMG_0407.png';

const shouldShow = () => {
  if (!CFG.enabled) return false;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
    return !seen || Date.now() - seen > CFG.showAgainAfterDays * 86400000;
  } catch (e) {
    return true;
  }
};

export default function ComboIsleAnnouncement() {
  const [open, setOpen] = useState(false);
  const { cartItems, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The Menu page stays mounted across tab switches (keep-alive), so this
  // component is alive on every route. Opening it off the menu page would lock
  // page scrolling behind a pop-up nobody can see or dismiss, so it only ever
  // runs while the menu tab is the one on screen.
  useEffect(() => {
    if (pathname !== '/menu') return undefined;
    if (cartItems?.length) return undefined;
    const timer = setTimeout(() => {
      if (pathname === '/menu' && shouldShow()) setOpen(true);
    }, CFG.delayMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Leaving the menu closes the pop-up (and releases the scroll lock).
  useEffect(() => {
    if (pathname !== '/menu' && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const remember = () => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {
      /* private mode */
    }
  };

  const dismiss = () => {
    remember();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        remember();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = () => {
    remember();
    setOpen(false);
    setIsCartOpen(false);
    navigate('/combos');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="combo-isle-announce-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-2xl bg-vanilla-malt rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 sm:grid-cols-[0.9fr_1.1fr]"
      >
        <div className="relative grid grid-cols-2 sm:grid-cols-1 sm:grid-rows-[1.15fr_0.85fr] h-36 sm:h-auto bg-obsidian-roast">
          <span className="absolute top-3 left-3 z-10 bg-smashie-yellow text-obsidian-roast font-heading text-xs tracking-[0.16em] px-3 py-1.5 rounded-full">
            NEW
          </span>
          <img
            src={optimizedImageUrl(BURGER_PHOTO, 500, 500)}
            alt="Cheeseburger with tater tots"
            width="500"
            height="500"
            decoding="async"
            loading="eager"
            className="w-full h-full object-cover"
          />
          <img
            src={optimizedImageUrl(FRIES_PHOTO, 500, 500)}
            alt="Golden crinkle-cut fries"
            width="500"
            height="500"
            decoding="async"
            loading="eager"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative p-5 sm:p-8 flex flex-col gap-2.5">
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-obsidian-roast/10 text-obsidian-roast flex items-center justify-center hover:bg-obsidian-roast/20 transition-colors"
          >
            <X size={16} />
          </button>

          <p className="font-heading text-xs tracking-[0.2em] text-midnight-cherry">NOW ON THE MENU</p>
          <h2 id="combo-isle-announce-title" className="font-heading text-4xl sm:text-5xl leading-[0.92] text-obsidian-roast">
            COMBO ISLE IS OPEN
          </h2>
          <p className="text-sm sm:text-base text-obsidian-roast/85 leading-relaxed">
            Pick a main, a side and a drink off our own menu. Your three picks go in the bag as one numbered box, at our regular menu prices.
          </p>

          <div className="flex flex-wrap gap-2 my-1">
            {['Main', 'Side', 'Drink'].map((label, i) => (
              <span key={label} className="inline-flex items-center gap-2 border border-obsidian-roast/20 rounded-full pl-1.5 pr-3 py-1.5 bg-white">
                <span className="w-5 h-5 rounded-full bg-obsidian-roast text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-xs font-bold text-obsidian-roast">{label}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1">
            <button onClick={go} className="btn-cherry chrome-hover w-full sm:w-auto px-6 py-3 font-heading text-base inline-flex items-center justify-center gap-2">
              <Package size={16} /> Build my combo
            </button>
            <button onClick={dismiss} className="text-sm font-bold text-obsidian-roast/60 underline w-full sm:w-auto">
              Not now
            </button>
          </div>

          <p className="text-[11px] text-obsidian-roast/55 mt-1">
            Burgers, chicken or sandwiches. Fries, tots or rings. Soda, float or a large milkshake.
          </p>
        </div>
      </div>
    </div>
  );
}