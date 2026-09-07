// Single customer review card — stars, quote, name, and a share action.
import React, { useState } from 'react';
import { Star, Share2, Check } from 'lucide-react';

const SHARE_URL = 'https://crave.flavor-isle.com';

export default function ReviewCard({ review }) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const text = `"${review.text}" — ${review.customer_name}, ${review.rating}★ on Flavor Isle`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Flavor Isle review', text, url: SHARE_URL });
      } else {
        await navigator.clipboard.writeText(`${text} — ${SHARE_URL}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* user cancelled share */ }
  };

  return (
    <div className="card-diner p-6 flex flex-col gap-3 h-full">
      {review.photo_url && (
        <div className="w-full h-40 rounded-2xl overflow-hidden">
          <img src={review.photo_url} alt="Visit photo" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{review.text}"</p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-sm text-obsidian-roast">— {review.customer_name}</p>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-midnight-cherry transition-colors"
          aria-label="Share review"
        >
          {shared ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
        </button>
      </div>
    </div>
  );
}