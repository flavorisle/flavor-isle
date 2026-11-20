import React, { useEffect, useState } from 'react';
import { Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMenuSetting } from '@/lib/menuSettings';
import { getHappyHourConfig } from '@/lib/happyHour';
import { chicagoNow } from '@/lib/chicagoNow';

// Issue #340 (D3) — Happy Hour countdown.
//
// Nothing here is hardcoded: the window is the admin MenuSetting record read
// through the existing happyHour lib, so changing Happy Hour in admin changes the
// countdown with no build. Store-local (America/Chicago) time, ticked once a
// minute. Display only — it never applies, changes or quotes a discount.
const toMins = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// "3h 12m", or "45m" when it is under an hour.
const formatSpan = (mins) => {
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function HappyHourCountdown({ className }) {
  const [setting, setSetting] = useState(null);
  const [now, setNow] = useState(() => chicagoNow());

  useEffect(() => {
    let alive = true;
    getMenuSetting()
      .then((s) => { if (alive) setSetting(s); })
      .catch(() => {});
    const id = setInterval(() => setNow(chicagoNow()), 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Nothing to count down to while Happy Hour is switched off in admin.
  if (!setting) return null;
  const config = getHappyHourConfig(setting);
  if (!config?.active) return null;

  const start = toMins(config.start_time);
  const end = toMins(config.end_time);
  const mins = now.totalMinutes;
  const on = mins >= start && mins < end;
  const span = on
    ? end - mins
    : (mins < start ? start - mins : 1440 - mins + start);

  const Icon = on ? Zap : Clock;
  const label = on ? 'Happy Hour on' : 'Happy Hour in';
  const value = on ? `${formatSpan(span)} left` : formatSpan(span);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-heading text-xs uppercase tracking-wider',
        on ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast',
        className,
      )}
    >
      <Icon size={14} aria-hidden="true" className={on ? 'text-smashie-yellow' : 'text-midnight-cherry'} />
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}