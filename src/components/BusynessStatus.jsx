import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertCircle, Zap, Flame, Lock } from 'lucide-react';
import { getBusynessStage } from '@/lib/busynessStages';

// Uses the getBusyness backend function which aggregates ALL Square order
// sources (online + in-store POS) — not just local app orders — so the status
// reflects real kitchen load even when the rush is at the counter.
//
// The 4-stage model is driven by the rolling 60-minute order count, which
// captures sustained rushes that the momentary 20-min queue depth misses.
// The backend returns the stage + estimated wait, and "Closed" when the
// store is outside business hours or under admin closure.

const ICONS = { Flame, TrendingUp, AlertCircle, Zap };

export default function BusynessStatus() {
  const [activeCount, setActiveCount] = useState(0);
  const [isClosed, setIsClosed] = useState(false);
  const [stage, setStage] = useState(() => getBusynessStage(0));

  useEffect(() => {
    const loadBusyness = async () => {
      try {
        const res = await base44.functions.invoke('getBusyness', {});
        const data = res?.data || res;
        if (data.busyness_level === 'Closed') {
          setIsClosed(true);
        } else {
          setIsClosed(false);
          // The level is driven by the rolling 60-min order count (liveCount).
          const count = data.liveCount ?? data.activeCount ?? 0;
          setActiveCount(count);
          setStage(getBusynessStage(count));
        }
      } catch (e) {
        console.error('BusynessStatus load error', e);
      }
    };

    loadBusyness();
    const interval = setInterval(loadBusyness, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isClosed) {
    return (
      <div>
        <div className="card-diner p-4 flex items-center justify-between border-2 border-gray-300 bg-gray-100 text-gray-500">
          <div className="flex items-center gap-3">
            <Lock size={20} />
            <div>
              <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
              <p className="font-heading text-lg">Closed</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const IconComponent = ICONS[stage.icon] || Zap;

  return (
    <div>
      <div className={`card-diner p-4 flex items-center justify-between border-2 border-midnight-cherry/20 ${stage.bgClass} ${stage.textClass}`}>
        <div className="flex items-center gap-3">
          <IconComponent size={20} />
          <div>
            <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
            <p className="font-heading text-lg">{stage.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading">{activeCount}</p>
          <p className="text-xs opacity-75">Orders (last 60 min)</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-xs font-heading text-obsidian-roast">Est. wait: {stage.waitRange}</p>
        {stage.urgency && (
          <p className="text-xs text-midnight-cherry font-heading animate-float-up">{stage.urgency}</p>
        )}
      </div>
    </div>
  );
}