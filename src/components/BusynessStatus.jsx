import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertCircle, Zap, Flame } from 'lucide-react';
import { getBusynessStage } from '@/lib/busynessStages';

// Uses the getBusyness backend function which aggregates ALL Square order
// sources (online + in-store POS) — not just local app orders — so the status
// reflects real kitchen load even when the rush is at the counter.
//
// The 4-stage model is based on kitchen capacity (2-3 orders at a time) and
// a 20-min cook window. The backend returns the stage + estimated wait.

const ICONS = { Flame, TrendingUp, AlertCircle, Zap };

export default function BusynessStatus() {
  const [activeCount, setActiveCount] = useState(0);
  const [stage, setStage] = useState(() => getBusynessStage(0));

  useEffect(() => {
    const loadBusyness = async () => {
      try {
        const res = await base44.functions.invoke('getBusyness', {});
        const data = res?.data || res;
        const count = data.activeCount ?? data.liveCount ?? 0;
        setActiveCount(count);
        setStage(getBusynessStage(count));
      } catch (e) {
        console.error('BusynessStatus load error', e);
      }
    };

    loadBusyness();
    const interval = setInterval(loadBusyness, 60000);
    return () => clearInterval(interval);
  }, []);

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
          <p className="text-xs opacity-75">In queue (20 min)</p>
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