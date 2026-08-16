import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertCircle, Zap, Flame } from 'lucide-react';

// Uses the getBusyness backend function which aggregates ALL Square order
// sources (online + in-store POS) — not just local app orders — so the status
// reflects real kitchen load even when the rush is at the counter.

export default function BusynessStatus() {
  const [liveCount, setLiveCount] = useState(0);
  const [busyPercent, setBusyPercent] = useState(0);
  const [busynessLevel, setBusynessLevel] = useState('Running Smooth');
  const [busynessColor, setBusynessColor] = useState('bg-green-100 text-green-700');
  const [icon, setIcon] = useState(null);
  const [urgency, setUrgency] = useState('');

  useEffect(() => {
    const loadBusyness = async () => {
      try {
        const res = await base44.functions.invoke('getBusyness', {});
        const data = res?.data || res;
        const live = data.liveCount || 0;
        const pct = data.busyPercent || 0;
        setLiveCount(live);
        setBusyPercent(pct);

        // Determine level from Square-based live vs historical average.
        // Absolute floor catches high-volume hours even when the average is high.
        let level = 'Running Smooth';
        let color = 'bg-green-100 text-green-700';
        let iconComponent = Zap;
        let urgencyMsg = '';

        if (pct >= 130 || live >= 20) {
          level = 'Slammed — Expect a Wait';
          color = 'bg-red-100 text-red-700';
          iconComponent = Flame;
          urgencyMsg = "🔥 Kitchen's slammed — order now to beat the rush!";
        } else if (pct >= 80 || live >= 10) {
          level = 'A Little Busy';
          color = 'bg-yellow-100 text-yellow-700';
          iconComponent = TrendingUp;
          urgencyMsg = '⏱ A little busy — order ahead to skip the line.';
        }

        setBusynessLevel(level);
        setBusynessColor(color);
        setIcon(iconComponent);
        setUrgency(urgencyMsg);
      } catch (e) {
        console.error('BusynessStatus load error', e);
      }
    };

    loadBusyness();
    const interval = setInterval(loadBusyness, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const IconComponent = icon;

  return (
    <div>
      <div className={`card-diner p-4 flex items-center justify-between border-2 border-midnight-cherry/20 ${busynessColor}`}>
        <div className="flex items-center gap-3">
          {IconComponent && <IconComponent size={20} />}
          <div>
            <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
            <p className="font-heading text-lg">{busynessLevel}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading">{liveCount}</p>
          <p className="text-xs opacity-75">Orders (last hr)</p>
        </div>
      </div>
      {urgency && (
        <p className="text-xs text-midnight-cherry font-heading mt-2 text-center animate-float-up">
          {urgency}
        </p>
      )}
    </div>
  );
}