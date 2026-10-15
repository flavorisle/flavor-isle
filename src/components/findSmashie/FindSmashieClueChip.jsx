import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useSmashieHunt from '@/hooks/useSmashieHunt';
import { huntClueText, SMASHIE_IMAGES } from '@/lib/findSmashie';

// The clue chip. It drops onto the pages a player is allowed to hunt on
// (Home, Menu, Gallery, About, Meet Smashie, Find Smashie) and into the footer,
// in two placements:
//
//   placement="corner"  a small fixed chip in the bottom-left corner that opens
//                       on tap, so the riddle never crowds the page it sits on
//   placement="footer"  the same chip inline in the footer band
//
// It shows today's riddle, the FOUND message once somebody has won, or when the
// hunt opens again outside his hours — all from the one shared line in
// lib/findSmashie, so it can never disagree with the banner. Outside the October
// window the hook returns show:false and the chip removes itself.
export default function FindSmashieClueChip({ placement = 'corner' }) {
  const hunt = useSmashieHunt();
  const [open, setOpen] = useState(false);

  const text = huntClueText(hunt);
  if (!hunt?.show || !text) return null;

  const label = hunt.winner ? 'Smashie was found!' : "Clue of the Day";

  if (placement === 'footer') {
    return (
      <div className="border-t border-white/10 px-5 sm:px-6 py-4 flex justify-center">
        <div className="inline-flex max-w-full flex-col items-start rounded-2xl bg-white/10 px-3 py-2">
...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-3 z-30 max-w-[calc(100vw-1.5rem)] sm:max-w-xs">
      {open && (
        <div className="mb-2 rounded-2xl border border-smashie-yellow bg-card px-3 py-2.5 shadow-float-lg">
          <p className="text-xs leading-snug text-obsidian-roast">{text}</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-full border border-smashie-yellow bg-card/95 px-3 py-2 shadow-float-lg backdrop-blur transition-colors hover:bg-card"
      >
        <img src={SMASHIE_IMAGES.pumpkin} alt="" width="20" height="20" className="h-5 w-5 object-contain" />
        <span className="font-heading text-[11px] uppercase tracking-widest text-obsidian-roast">{label}</span>
        {open ? <ChevronDown size={13} className="text-obsidian-roast" /> : <ChevronUp size={13} className="text-obsidian-roast" />}
      </button>
    </div>
  );
}