import React, { useState, useMemo, useEffect } from 'react';
import { Zap, Calendar } from 'lucide-react';
import { DAY_KEYS, DAY_LABELS, formatTime12 } from '@/lib/businessHours';
import useBusinessHours from '@/hooks/useBusinessHours';
import { normalizeWait } from '@/lib/waitQuote';

const SLOT_INTERVAL = 15;

const pad = (n) => String(n).padStart(2, '0');
const dateKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKeyFor = (d) => DAY_KEYS[(d.getDay() + 6) % 7]; // Sun(0) → 'sunday' at index 6

// The open window for one calendar day, or null when that day is closed.
function openWindow(day, businessHours) {
  const dh = businessHours[dayKeyFor(day)];
  if (!dh || dh.closed || !dh.open || !dh.close) return null;
  const [oh, om] = dh.open.split(':').map(Number);
  const [ch, cm] = dh.close.split(':').map(Number);
  const open = new Date(day); open.setHours(oh, om, 0, 0);
  const close = new Date(day); close.setHours(ch, cm, 0, 0);
  return { open, close };
}

// Inside means open ≤ t < close: the closing moment itself is already closed.
const insideWindow = (t, win) => !!win && t >= win.open && t < win.close;

// First opening moment after `from`, walking up to two weeks ahead.
function nextOpening(from, businessHours) {
  for (let i = 0; i < 14; i++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const win = openWindow(day, businessHours);
    if (win && win.open > from) return win.open;
  }
  return null;
}

// "10:30 AM" — the real clock time, spelled the way the button copy reads.
function clockLabel(d) {
  const h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${pad(d.getMinutes())} ${ap}`;
}

// "Opens 10:30 AM" today, "Tomorrow 10:30 AM", else "Thu 10:30 AM".
function openingLabel(when, now) {
  const days = Math.round(
    (new Date(when.getFullYear(), when.getMonth(), when.getDate()) -
      new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000
  );
  const time = clockLabel(when);
  if (days <= 0) return `Opens ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  return `${DAY_LABELS[dayKeyFor(when)].slice(0, 3)} ${time}`;
}

export default function SchedulePicker({ onChange, prepMinutes = normalizeWait(), compact = false }) {
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

  // Time slots for the selected date, bounded by business hours. The last slot is
  // one interval before closing, so no pickup is ever offered at or after the
  // moment we close — 6:45 PM on a 7 PM day. Closed days have no slots at all.
  // For today, the earliest slot is now + prepMinutes (rounded up to the next interval).
  const slots = useMemo(() => {
    const sel = new Date(date + 'T00:00:00');
    const win = openWindow(sel, businessHours);
    if (!win) return [];
    const start = win.open;
    const last = new Date(win.close.getTime() - SLOT_INTERVAL * 60000);

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
    for (let t = new Date(start); t <= last; t = new Date(t.getTime() + SLOT_INTERVAL * 60000)) {
      if (t >= earliest) list.push(timeStr(t));
    }
    return list;
  }, [date, businessHours, prepMinutes]);

  // ASAP never promises a time we are not open. If now + prep falls outside open
  // hours — before opening, at or after closing, or a closed day — the order rolls
  // forward to the next opening, and the button says that real time instead of
  // "ASAP" (the server refuses any time outside these hours).
  const asapPlan = useMemo(() => {
    const now = new Date();
    const ready = new Date(now.getTime() + prepMinutes * 60000);
    const today = openWindow(now, businessHours);
    if (insideWindow(now, today) && insideWindow(ready, today)) {
      return { scheduledFor: ready, label: 'ASAP' };
    }
    const opening = nextOpening(now, businessHours);
    if (!opening) return { scheduledFor: ready, label: 'ASAP' };
    return { scheduledFor: opening, label: openingLabel(opening, now) };
  }, [businessHours, prepMinutes]);

  // Keep a valid slot whenever the selected day's slot list changes
  useEffect(() => {
    setSlot(slots.length ? slots[0] : '');
  }, [slots]);

  // Report the selection up to the parent
  useEffect(() => {
    const n = new Date();
    if (mode === 'asap') {
      // Now + prep when that moment is inside open hours; otherwise the next
      // opening, never a time we are closed.
      const ready = asapPlan.scheduledFor;
      const est = Math.max(prepMinutes, Math.round((ready - n) / 60000));
      onChange?.({ mode: 'asap', scheduledFor: ready.toISOString(), estimatedTime: est, label: asapPlan.label });
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
  }, [mode, date, slot, onChange, prepMinutes, asapPlan]);

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
          <Zap size={16} /> {asapPlan.label}
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

      {mode === 'asap' ? null : (
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