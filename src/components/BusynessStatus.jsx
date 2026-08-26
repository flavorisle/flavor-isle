import React from 'react';
import { TrendingUp, AlertCircle, Zap, Flame, Lock, Activity } from 'lucide-react';
import useLiveStatus from '@/hooks/useLiveStatus';

const ICONS = { Flame, TrendingUp, AlertCircle, Zap };

// Centralized busyness display — reads the single useLiveStatus source of
// truth (regressed waitMin + recovering flag) so every surface that shows
// kitchen load stays in sync with the live status bar. The level is driven
// by the rolling 60-min order count (liveCount); the wait eases back toward
// the baseline as recent inflow slows.
export default function BusynessStatus() {
  const { loading, isClosed, level, waitMin, recovering, liveCount } = useLiveStatus();

  if (isClosed) {
    return (
      <div className="card-diner p-4 flex items-center justify-between border-2 border-gray-300 bg-gray-100 text-gray-500">
        <div className="flex items-center gap-3">
          <Lock size={20} />
          <div>
            <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
            <p className="font-heading text-lg">Closed</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !level) {
    return (
      <div className="card-diner p-4 flex items-center gap-3 border-2 border-gray-200 bg-gray-50 text-gray-400">
        <Activity size={20} className="animate-pulse" />
        <p className="font-heading text-sm uppercase tracking-wider">Checking kitchen…</p>
      </div>
    );
  }

  const IconComponent = ICONS[level.icon] || Zap;

  return (
    <div>
      <div className={`card-diner p-4 flex items-center justify-between border-2 border-midnight-cherry/20 ${level.bgClass} ${level.textClass}`}>
        <div className="flex items-center gap-3">
          <IconComponent size={20} />
          <div>
            <p className="text-xs font-heading uppercase tracking-wider opacity-75">Status</p>
            <p className="font-heading text-lg">{level.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-heading">{liveCount}</p>
          <p className="text-xs opacity-75">Orders (last 60 min)</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <p className="text-xs font-heading text-obsidian-roast">Est. wait: ~{waitMin} min</p>
        {recovering ? (
          <span className="inline-flex items-center gap-1 text-xs font-heading text-blue-600 animate-float-up">
            <Activity size={12} /> Kitchen catching up
          </span>
        ) : level.urgency ? (
          <p className="text-xs text-midnight-cherry font-heading animate-float-up">{level.urgency}</p>
        ) : null}
      </div>
    </div>
  );
}