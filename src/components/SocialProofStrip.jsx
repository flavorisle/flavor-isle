import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useLiveStatus from '@/hooks/useLiveStatus';

export default function SocialProofStrip({ tone = 'dark' }) {
  const isLight = tone === 'light';
  const text = isLight ? 'text-white/90' : 'text-obsidian-roast/80';
  const [rating, setRating] = useState(null);
  const [count, setCount] = useState(0);
  const { waitMin } = useLiveStatus();

  const CHIPS = [
    { icon: '🍔', label: 'Hand-patted burgers' },
    { icon: '🔥', label: 'Made fresh, never frozen' },
    { icon: '🚚', label: `Pickup in ~${waitMin || 20} min` },
  ];

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true })
      .then((data) => {
        const arr = data || [];
        setCount(arr.length);
        if (arr.length) {
          setRating(arr.reduce((a, r) => a + (r.rating || 0), 0) / arr.length);
        }
      })
      .catch(() => {});
  }, []);

  const fillCount = rating ? Math.round(rating) : 5;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm font-body ${text}`}>
      <span className="inline-flex items-center gap-1.5 font-heading">
        <span className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={13}
              className={
                i < fillCount
                  ? 'text-yellow-400 fill-yellow-400'
                  : isLight ? 'text-white/40' : 'text-gray-300'
              }
            />
          ))}
        </span>
        <span className="font-body">
          {rating ? `${rating.toFixed(1)} · ${count} review${count !== 1 ? 's' : ''}` : 'Loved by Smiths Grove'}
        </span>
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