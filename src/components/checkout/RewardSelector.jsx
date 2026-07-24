import React from 'react';
import { Gift, Check } from 'lucide-react';

export default function RewardSelector({ rewards, subtotal, appliedId, onApply }) {
  return (
    <div className="card-diner p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={18} className="text-patina-mint" />
        <h2 className="font-heading text-lg text-obsidian-roast">Your Rewards</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Apply a reward to this order.</p>
      <div className="space-y-2">
        {rewards.map(r => {
          const min = r.min_subtotal || 0;
          const eligible = subtotal >= min;
          const applied = appliedId === r.id;
          return (
            <button
              key={r.id}
              disabled={!eligible}
              onClick={() => onApply(applied ? null : r.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                applied
                  ? 'border-patina-mint bg-patina-mint/10'
                  : eligible
                    ? 'border-border hover:border-patina-mint/50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <div>
                <p className={`font-heading text-sm ${eligible ? 'text-obsidian-roast' : 'text-gray-400'}`}>{r.description}</p>
                {!eligible && (
                  <p className="text-xs mt-1">Requires a subtotal of at least ${min.toFixed(2)}</p>
                )}
              </div>
              <span className={`flex items-center gap-1.5 flex-shrink-0 text-sm font-heading px-3 py-1.5 rounded-lg ${
                applied ? 'bg-patina-mint text-white' : eligible ? 'bg-patina-mint/15 text-patina-mint' : 'bg-gray-200 text-gray-500'
              }`}>
                {applied ? (<><Check size={14} /> Applied</>) : `−$${r.discount_value}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}