import React, { useState, useEffect } from 'react';
import { Flame, Clock, ChefHat } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing'];

function getBusynessLevel(count) {
  if (count === 0) return { label: 'Not Busy', color: 'bg-green-500', textColor: 'text-green-400', bars: 1, wait: '10–15 min', emoji: '😎' };
  if (count <= 3) return { label: 'A Little Busy', color: 'bg-yellow-400', textColor: 'text-yellow-400', bars: 2, wait: '15–20 min', emoji: '🙂' };
  if (count <= 7) return { label: 'Fairly Busy', color: 'bg-orange-400', textColor: 'text-orange-400', bars: 3, wait: '20–30 min', emoji: '🔥' };
  return { label: 'Very Busy!', color: 'bg-midnight-cherry', textColor: 'text-red-400', bars: 4, wait: '30–45 min', emoji: '🚨' };
}

export default function KitchenBusyness() {
  const [activeCount, setActiveCount] = useState(null);

  useEffect(() => {
    const load = async () => {
      const orders = await base44.entities.Order.filter({ status: 'preparing' });
      const orders2 = await base44.entities.Order.filter({ status: 'confirmed' });
      const orders3 = await base44.entities.Order.filter({ status: 'pending' });
      setActiveCount((orders?.length || 0) + (orders2?.length || 0) + (orders3?.length || 0));
    };
    load();

    const unsubscribe = base44.entities.Order.subscribe(() => { load(); });
    return unsubscribe;
  }, []);

  if (activeCount === null) return null;

  const level = getBusynessLevel(activeCount);

  return (
    <div className="mt-4 flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
      <div className="flex items-end gap-0.5">
        {[1, 2, 3, 4].map(bar => (
          <div
            key={bar}
            className={`w-1.5 rounded-full transition-all duration-500 ${bar <= level.bars ? level.color : 'bg-white/20'}`}
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
        <p className="text-white/50 text-xs">{activeCount} order{activeCount !== 1 ? 's' : ''} in kitchen right now</p>
      </div>
    </div>
  );
}