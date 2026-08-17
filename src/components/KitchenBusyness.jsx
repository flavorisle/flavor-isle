import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Flame } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

// 4-stage kitchen-capacity model: cook handles 2-3 orders at a time.
// Stages reflect the active queue depth and estimated clear time.
function getBusynessLevel(counts) {
  const cooking = (counts.pending || 0) + (counts.confirmed || 0) + (counts.preparing || 0);
  const total = cooking + (counts.ready || 0);

  if (cooking <= 3)  return { label: 'Running Smooth', color: 'bg-green-500',    textColor: 'text-green-400',  bars: 1, wait: '~20 min',      emoji: '😎' };
  if (cooking <= 7)  return { label: 'A Little Busy',  color: 'bg-yellow-400',   textColor: 'text-yellow-400', bars: 2, wait: '~30 min',      emoji: '🙂' };
  if (cooking <= 12) return { label: 'Busy',           color: 'bg-orange-400',  textColor: 'text-orange-400', bars: 3, wait: '35–40 min',   emoji: '🔥' };
  return { label: 'Slammed', color: 'bg-midnight-cherry', textColor: 'text-red-400', bars: 4, wait: '50–60 min', emoji: '🚨' };
}

export default function KitchenBusyness() {
  const [counts, setCounts] = useState(null);

  const load = async () => {
    try {
      // Fetch all active orders in parallel
      const [pending, confirmed, preparing, ready] = await Promise.all([
        base44.entities.Order.filter({ status: 'pending' }),
        base44.entities.Order.filter({ status: 'confirmed' }),
        base44.entities.Order.filter({ status: 'preparing' }),
        base44.entities.Order.filter({ status: 'ready' }),
      ]);
      setCounts({
        pending: pending?.length || 0,
        confirmed: confirmed?.length || 0,
        preparing: preparing?.length || 0,
        ready: ready?.length || 0,
      });
    } catch {
      setCounts({ pending: 0, confirmed: 0, preparing: 0, ready: 0 });
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Order.subscribe(() => load());
    return unsubscribe;
  }, []);

  if (counts === null) return null;

  const level = getBusynessLevel(counts);
  const totalActive = Object.values(counts).reduce((s, n) => s + n, 0);
  const cookingCount = counts.pending + counts.confirmed + counts.preparing;

  return (
    <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
      {/* Main busyness row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map(bar => (
            <div
              key={bar}
              className={`w-1.5 rounded-full transition-all duration-700 ${bar <= level.bars ? level.color : 'bg-white/20'}`}
              style={{ height: `${bar * 5 + 6}px` }}
            />
          ))}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{level.emoji}</span>
            <span className={`text-sm font-heading ${level.textColor}`}>{level.label}</span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-white/60 text-xs flex items-center gap-1">
              <Clock size={11} /> ~{level.wait}
            </span>
          </div>
          <p className="text-white/50 text-xs">{cookingCount} order{cookingCount !== 1 ? 's' : ''} in kitchen · {counts.ready} ready for pickup</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white/50 text-xs">Live</span>
        </div>
      </div>

      {/* Live status breakdown */}
      {totalActive > 0 && (
        <div className="border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
          {[
            { key: 'pending', label: 'Received', icon: '📋' },
            { key: 'confirmed', label: 'Confirmed', icon: '✅' },
            { key: 'preparing', label: 'Cooking', icon: '👨‍🍳' },
            { key: 'ready', label: 'Ready', icon: '🔔' },
          ].map(({ key, label, icon }) => (
            <div key={key} className="flex flex-col items-center py-2.5 gap-0.5">
              <span className="text-lg leading-none">{icon}</span>
              <span className={`font-heading text-base leading-none ${counts[key] > 0 ? 'text-white' : 'text-white/30'}`}>{counts[key]}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}