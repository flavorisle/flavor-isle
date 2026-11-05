import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { BLISS_CATEGORY, SKIP_ITEM_NAMES } from '@/lib/buildCards';

// The flavor count is read live — originals + premium bliss + malt — using the
// same rules as the Shake Isle strip, so the card never advertises a stale number.
export default function ShakeFavoriteTile() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MenuItem.filter({ square_category: 'Whirl & Twirl', is_hidden: false }),
      base44.entities.MenuItem.list(),
    ])
      .then(([shakes, all]) => {
        const skip = new Set(SKIP_ITEM_NAMES.map((n) => String(n).trim().toLowerCase()));
        const bliss = (all || []).filter(
          (i) =>
            i.square_category === BLISS_CATEGORY &&
            i.is_hidden !== true &&
            !skip.has(String(i.name || '').trim().toLowerCase()),
        ).length;
        setTotal((shakes || []).length + bliss);
      })
      .catch(() => {});
  }, []);

  return <Link to="/milkshakes" className="relative flex flex-col justify-between h-full min-h-52 overflow-hidden rounded-2xl bg-obsidian-roast p-5 shadow-float text-white">
    <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 90% 15%, rgba(78,227,200,0.18), transparent 55%)' }} />
    <span className="relative text-4xl mt-5" aria-hidden="true">🥤</span>
    <div className="relative"><h3 className="font-heading text-2xl">Shake Isle{total ? ` — ${total} Flavors` : ''}</h3>
      <span className="btn-cherry inline-flex items-center gap-2 px-4 py-2.5 mt-4 text-sm">Order Shakes <ArrowRight size={14} /></span>
    </div>
  </Link>;
}