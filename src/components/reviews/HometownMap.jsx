import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import HometownPinForm from './HometownPinForm';
import HometownMapCanvas from './HometownMapCanvas';

export default function HometownMap() {
  const [pins, setPins] = useState([]);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Deep link from other pages (e.g. Explore Smiths Grove) — the router's
  // ScrollToTop fires before this lazily-loaded page mounts, so re-run it here.
  useEffect(() => {
    if (window.location.hash !== '#traveler-log') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('traveler-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

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

  return (
    <section id="traveler-log" className="px-4 sm:px-6 py-20 bg-vanilla-malt scroll-mt-24" aria-labelledby="hometown-heading">
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