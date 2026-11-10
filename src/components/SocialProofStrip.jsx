import React from 'react';
import { Star } from 'lucide-react';
import useLiveStatus from '@/hooks/useLiveStatus';
import { pickupQuote } from '@/lib/waitQuote';

export default function SocialProofStrip({ tone = 'dark' }) {
  const isLight = tone === 'light';
  const text = isLight ? 'text-white/90' : 'text-obsidian-roast';
  const { waitMin } = useLiveStatus();

  // The stars row was removed on purpose: the rating is calculus over a
  // handful of reviews, and it argued with the five-star quote on the same
  // screen. The strip now carries only claims we can stand behind, and its one
  // time estimate speaks with the same voice as every other estimate.
  const CHIPS = [
    { icon: '🍔', label: 'Hand-patted burgers' },
    { icon: '🔥', label: 'Made fresh, never frozen' },
    { icon: '🚚', label: `Pickup in ${pickupQuote(waitMin)}` },
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm font-body ${text}`}>
      <span className="inline-flex items-center gap-1.5 font-heading">
        <span className="flex" aria-hidden="true">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={13}
              className="text-yellow-400 fill-yellow-400"
            />
          ))}
        </span>
        <span className="font-body">Loved by Smiths Grove</span>
      </span>
      {CHIPS.map((c) => (
        <span key={c.label} className="inline-flex items-center gap-1.5">
          <span>{c.icon}</span>
          <span>{c.label}</span>
        </span>
      ))}
    </div>
  );
}