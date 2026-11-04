import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import HometownPinForm from './HometownPinForm';
import HometownMapCanvas from './HometownMapCanvas';

export default function HometownMap() {
  const [pins, setPins] = useState([]);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    base44.entities.VisitorHometown.list('-created_date', 500)
      .then(list => { if (active) setPins(list || []); })
      .catch(() => { if (active) setError('Pins could not be loaded right now.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function onAdded(pin) {
    setPins(current => [pin, ...current]);
    setFocus(pin);
  }

  // Deep links from the Explore Smiths Grove page land here (#traveler-log).
  // The reviews page keeps growing after mount (cards above the map), so a
  // one-shot scroll drifts away. Instead we settle the position over a short
  // polling window and stand down the moment the visitor scrolls himself.
  useEffect(() => {
    if (window.location.hash !== '#traveler-log') return;

    window.scrollTo(0, 0);

    let onTarget = 0;
    const startedAt = Date.now();

    const stop = () => {
      clearInterval(timer);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };

    const timer = setInterval(() => {
      const el = document.getElementById('traveler-log');
      if (el) {
        const desired = el.getBoundingClientRect().top + window.scrollY - 88;
        if (Math.abs(window.scrollY - desired) > 4) {
          window.scrollTo(0, desired);
          onTarget = 0;
        } else {
          onTarget += 1;
          if (onTarget >= 2) return stop();
        }
      }
      if (Date.now() - startedAt >= 4000) stop();
    }, 100);

    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop);

    return stop;
  }, []);

  return (
    <section id="traveler-log" className="scroll-mt-24 px-4 sm:px-6 py-20 bg-vanilla-malt" aria-labelledby="hometown-heading">
      <div className="max-w-6xl mx-auto">
        <p className="font-heading uppercase tracking-widest text-sm text-midnight-cherry">Traveler Log</p>
        <h2 id="hometown-heading" className="font-heading text-4xl sm:text-5xl text-obsidian-roast mt-2">Where the Isle brings us together</h2>
        <p className="text-muted-foreground mt-2 mb-7">Visited Flavor Isle? Pin your hometown on the Traveler Log. Only your city center is shown — never your address.</p>
        <HometownMapCanvas pins={pins} focus={focus} />
        {loading ? <p role="status" className="text-muted-foreground mt-3">Loading hometown pins…</p> : error ? <p role="alert" className="text-destructive mt-3">{error}</p> : <p className="text-muted-foreground text-sm mt-3">{pins.length ? `${pins.length} visitor${pins.length === 1 ? '' : 's'} on the map` : 'Be the first to pin your hometown.'}</p>}
        <div className="mt-7"><HometownPinForm onAdded={onAdded} /></div>
      </div>
    </section>
  );
}