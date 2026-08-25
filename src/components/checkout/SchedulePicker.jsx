import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Calendar, Clock } from 'lucide-react';
import { DAY_KEYS, DAY_LABELS, formatTime12 } from '@/lib/businessHours';
import useBusinessHours from '@/hooks/useBusinessHours';

const SLOT_INTERVAL = 15;

const pad = (n) => String(n).padStart(2, '0');
const dateKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKeyFor = (d) => DAY_KEYS[(d.getDay() + 6) % 7]; // Sun(0) → 'sunday' at index 6

export default function SchedulePicker({ onChange, prepMinutes = 20, compact = false }) {
  const businessHours = useBusinessHours();
  const [mode, setMode] = useState('asap');
  const [date, setDate] = useState(() => dateKeyOf(new Date()));
  const [slot, setSlot] = useState('');

  // Seven day options starting today
  const dayOptions = useMemo(() => {
    const base = new Date();
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const k = dayKeyFor(d);
      const dh = businessHours[k];
      const sub = dh && !dh.closed ? `${formatTime12(dh.open)}–${formatTime12(dh.close)}` : 'Closed';
      const label =
        i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
        `${DAY_LABELS[k]} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      arr.push({ key: dateKeyOf(d), label, sub, dKey: k, closed: !dh || dh.closed });
    }
    return arr;
  }, [businessHours]);

  // Time slots for the selected date, bounded by business hours.
  // For today, the earliest slot is now + prepMinutes (rounded up to the next interval).
  const slots = useMemo(() => {
    const sel = new Date(date + 'T00:00:00');
    const dh = businessHours[dayKeyFor(sel)];
    if (!dh || dh.closed) return [];
    const [oh, om] = dh.open.split(':').map(Number);
    const [ch, cm] = dh.close.split(':').map(Number);
    const start = new Date(sel); start.setHours(oh, om, 0, 0);
    const end = new Date(sel); end.setHours(ch, cm, 0, 0);

    const today = new Date();
    let earliest;
    if (dateKeyOf(sel) === dateKeyOf(today)) {
      earliest = new Date(today.getTime() + prepMinutes * 60000);
      const rem = earliest.getMinutes() % SLOT_INTERVAL;
      if (rem !== 0) earliest.setMinutes(earliest.getMinutes() + (SLOT_INTERVAL - rem));
      earliest.setSeconds(0, 0);
    } else {
      earliest = new Date(start);
    }

    const list = [];
    for (let t = new Date(start); t <= end; t = new Date(t.getTime() + SLOT_INTERVAL * 60000)) {
      if (t >= earliest) list.push(timeStr(t));
    }
    return list;
  }, [date, businessHours, prepMinutes]);

  // Keep a valid slot whenever the selected day's slot list changes
  useEffect(() => {
    setSlot(slots.length ? slots[0] : '');
  }, [slots]);

  // Report the selection up to the parent
  useEffect(() => {
    const n = new Date();
    if (mode === 'asap') {
      const ready = new Date(n.getTime() + prepMinutes * 60000);
      onChange?.({ mode: 'asap', scheduledFor: ready.toISOString(), estimatedTime: prepMinutes, label: 'ASAP' });
    } else if (slot) {
      const ready = new Date(date + 'T' + slot + ':00');
      onChange?.({
        mode: 'schedule',
        scheduledFor: ready.toISOString(),
        estimatedTime: Math.max(prepMinutes, Math.round((ready - n) / 60000)),
        label: formatTime12(slot),
      });
    } else {
      onChange?.({ mode: 'schedule', scheduledFor: '', estimatedTime: prepMinutes, label: '' });
    }
  }, [mode, date, slot, onChange, prepMinutes]);

  return (
    <div>
      {!compact && (
        <>
          <h2 className="font-heading text-lg text-obsidian-roast">When do you want it?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Most orders are ready in about {prepMinutes} minutes. Schedule ahead to lock in your time.
          </p>
        </>
      )}

      <div className={`grid grid-cols-2 gap-3 ${compact ? 'mb-3' : 'mb-4'}`}>
        <button
          type="button"
          onClick={() => setMode('asap')}
          className={`flex items-center justify-center gap-2 ${compact ? 'py-2.5 rounded-xl' : 'py-3 rounded-2xl'} border-2 font-heading text-sm transition-all ${
            mode === 'asap' ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
          }`}
        >
          <Zap size={16} /> ASAP
        </button>
        <button
          type="button"
          onClick={() => setMode('schedule')}
          className={`flex items-center justify-center gap-2 ${compact ? 'py-2.5 rounded-xl' : 'py-3 rounded-2xl'} border-2 font-heading text-sm transition-all ${
            mode === 'schedule' ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
          }`}
        >
          <Calendar size={16} /> Schedule
        </button>
      </div>

      {mode === 'asap' ? (
        <div className="flex items-center gap-2 bg-patina-mint/10 text-patina-mint rounded-2xl px-4 py-3 text-sm font-heading">
          <Clock size={16} />
          Ready in about {prepMinutes} minutes from order time.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Pick a day</label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {dayOptions.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={opt.closed}
                  onClick={() => setDate(opt.key)}
                  className={`flex-shrink-0 min-w-[92px] px-3 py-2 rounded-2xl border-2 font-heading text-xs text-center transition-all ${
                    opt.closed
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : date === opt.key
                      ? 'border-midnight-cherry bg-midnight-cherry text-white'
                      : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="block text-[10px] font-body opacity-70 mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Pick a time</label>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">We're closed that day — please choose another date.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                {slots.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSlot(t)}
                    className={`py-2.5 rounded-2xl border-2 font-heading text-sm transition-all ${
                      slot === t ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
                    }`}
                  >
                    {formatTime12(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}