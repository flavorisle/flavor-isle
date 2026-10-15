import { useEffect, useState } from 'react';
import { PartyPopper, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// The winner's free Find Smashie shake, waiting on the Milkshakes page.
//
// The flag is set the moment the winner picks the milkshake prize, so the banner
// only greets somebody who chose it. It still asks the server whether the prize
// is genuinely active, so it can never appear for a player whose shake has
// already been used on an order — and it clears itself as soon as the prize is
// spent or dismissed.
export const FREE_SHAKE_FLAG = 'smashie_free_shake';

export default function FindSmashieFreeShakeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let flagged = false;
    try { flagged = localStorage.getItem(FREE_SHAKE_FLAG) === '1'; } catch { flagged = false; }
    if (!flagged) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await base44.functions.invoke('getMySmashiePrize', {});
        if (cancelled) return;
        if (data?.active) {
          setShow(true);
        } else {
          // Prize already used on an order, or a different day: the banner is done.
          try { localStorage.removeItem(FREE_SHAKE_FLAG); } catch { /* storage unavailable */ }
        }
      } catch {
        // Could not check — stay quiet rather than promise a shake we can't confirm.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.removeItem(FREE_SHAKE_FLAG); } catch { /* storage unavailable */ }
  };

  if (!show) return null;

  return (
    <div className="bg-smashie-yellow text-obsidian-roast">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <PartyPopper size={18} className="flex-shrink-0" />
          Your free shake is ready — pick your flavor and check out.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-black/10 transition-colors flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}