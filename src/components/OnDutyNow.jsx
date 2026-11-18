import { useEffect, useState } from 'react';
import { fetchCrew } from '@/lib/crewCache';

// "On the floor right now" — the crew actually clocked in at this moment,
// straight from the Square clock by way of the Pulse staff app.
//
// Renders nothing at all when the store is closed, when nobody is clocked in,
// when the answer is older than 10 minutes, or when either app is unreachable.
// First names only. See issue #326.
export default function OnDutyNow({ open, variant = 'band' }) {
  const [crew, setCrew] = useState([]);

  useEffect(() => {
    if (!open) {
      setCrew([]);
      return undefined;
    }
    let active = true;
    const load = async () => {
      const state = await fetchCrew();
      if (active) setCrew(state.fresh ? state.crew : []);
    };
    load();
    const id = setInterval(load, 120000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [open]);

  if (!open || crew.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-obsidian-roast">
        <span className="w-2 h-2 rounded-full bg-green-600" aria-hidden="true" />
        <span className="font-heading uppercase tracking-widest text-[12px] text-midnight-cherry">On the floor now</span>
        <span className="font-semibold">{crew.map((p) => p.first_name).join(' · ')}</span>
      </div>
    );
  }

  return (
    <div className="bg-vanilla-malt border-b border-midnight-cherry/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-x-3 gap-y-2 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(22,163,74,0.18)]" aria-hidden="true" />
        <p className="font-heading text-[13px] uppercase tracking-widest text-midnight-cherry m-0">On the floor right now</p>
        <ul className="flex items-center gap-3 flex-wrap list-none p-0 m-0">
          {crew.map((p, i) => (
            <li key={`${p.first_name}-${i}`} className="flex items-center gap-1.5 text-[15px] font-semibold text-obsidian-roast">
              <span className="w-6 h-6 rounded-full bg-midnight-cherry/10 text-midnight-cherry font-heading text-[13px] flex items-center justify-center">
                {p.first_name.charAt(0)}
              </span>
              {p.first_name}
            </li>
          ))}
        </ul>
        <p className="hidden sm:block text-[13px] text-muted-foreground m-0 ml-auto">Say hey when you walk in.</p>
      </div>
    </div>
  );
}