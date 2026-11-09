import React from 'react';

// Shared "progress to your next reward tier" block for Star Rewards, so the
// order confirmation card and the Rewards page show the exact same thing.
// `tone` follows the surface it sits on: dark = the navy gradient card,
// light = a white card.
export default function StarTierProgress({ balance, nextTier, tone = 'light' }) {
  if (!nextTier) return null;

  const stars = Number(balance) || 0;
  const points = Number(nextTier.points) || 0;
  const remaining = Math.max(0, points - stars);
  const progress = points > 0 ? Math.min(100, Math.round((stars / points) * 100)) : 0;
  const dark = tone === 'dark';

  return (
    <div>
      <p className={`text-xs mb-2 ${dark ? 'text-white/85' : 'text-obsidian-roast'}`}>
        <span className={`font-heading text-base ${dark ? 'text-smashie-yellow' : 'text-midnight-cherry'}`}>
          {remaining.toLocaleString()}
        </span>{' '}
        more {remaining === 1 ? 'star' : 'stars'} to unlock{' '}
        <span className={`font-semibold ${dark ? 'text-white' : 'text-patina-mint'}`}>{nextTier.name}</span>
      </p>

      <div
        className={`h-3 rounded-full overflow-hidden ${dark ? 'bg-white/15' : 'bg-muted'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={points}
        aria-valuenow={stars}
        aria-label={`${stars} of ${points} stars toward ${nextTier.name}`}
      >
        <div className="h-full rounded-full bg-smashie-yellow transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className={`flex items-center justify-between gap-3 mt-1.5 text-[11px] ${dark ? 'text-white/60' : 'text-muted-foreground'}`}>
        <span>{stars.toLocaleString()} stars</span>
        <span className={`font-heading ${dark ? 'text-smashie-yellow' : 'text-midnight-cherry'}`}>{progress}% of the way</span>
        <span>{points.toLocaleString()} stars · {nextTier.name}</span>
      </div>

      {nextTier.description && (
        <p className={`text-[11px] mt-2 ${dark ? 'text-white/70' : 'text-muted-foreground'}`}>{nextTier.description}</p>
      )}
    </div>
  );
}