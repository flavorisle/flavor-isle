import React, { useState, useEffect } from 'react';
import { CalendarClock, Save, Check, Trash2 } from 'lucide-react';
import { getMenuSetting, setEarlyClose } from '@/lib/menuSettings';
import { formatClock, chicagoTodayKey } from '@/lib/storeState';
import { DAY_KEYS } from '@/lib/businessHours';

// One-day early close. Honored only on its own date, so it expires at midnight on
// its own — the weekly business hours are never edited by it. Ordering stops at
// the time set here on both systems and Smashie tells callers we close early.
//
// An "early" close that is later than, or the same as, the regular closing time
// on the chosen day is refused: it would quietly extend the day's hours and read
// as a mistake to customers, so the panel explains why instead of saving it.
const DEFAULT_CLOSE = '19:00';

function minutesOf(time) {
  const [h, m] = String(time || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

// The regular closing time for the day the admin picked in the date field.
function regularCloseFor(date, setting) {
  if (!date) return { close: null, closedAllDay: false };
  const picked = new Date(`${date}T12:00:00`);
  if (Number.isNaN(picked.getTime())) return { close: null, closedAllDay: false };
  const dayKey = DAY_KEYS[(picked.getDay() + 6) % 7];
  const day = setting?.business_hours?.[dayKey] || {};
  if (day.closed) return { close: null, closedAllDay: true };
  return {
    close: String(day.close || setting?.closing_time || DEFAULT_CLOSE).slice(0, 5),
    closedAllDay: false,
  };
}

export default function EarlyClosePanel() {
  const [date, setDate] = useState(chicagoTodayKey());
  const [closeTime, setCloseTime] = useState('17:00');
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(null);
  const [setting, setSetting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMenuSetting()
      .then((s) => {
        setSetting(s || null);
        const early = s?.early_close;
        if (early?.date && early?.close_time) {
          setActive({ date: early.date, close_time: early.close_time, message: early.message || '' });
          setDate(early.date);
          setCloseTime(early.close_time);
          setMessage(early.message || '');
        }
      })
      .catch(() => {});
  }, []);

  const regular = regularCloseFor(date, setting);
  const blockedReason = (() => {
    if (regular.closedAllDay) return "We're closed that day, so there's no closing time to move earlier.";
    const regularMins = minutesOf(regular.close);
    const pickedMins = minutesOf(closeTime);
    if (regularMins == null || pickedMins == null) return '';
    if (pickedMins >= regularMins) {
      return `That isn't earlier than our regular ${formatClock(regular.close)} close on that day, so it wouldn't change anything. Pick a time before ${formatClock(regular.close)}.`;
    }
    return '';
  })();

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const save = async () => {
    setError('');
    if (blockedReason) {
      setError(blockedReason);
      return;
    }
    setSaving(true);
    try {
      const updated = await setEarlyClose({ date, close_time: closeTime, message });
      setActive(updated.early_close);
      flashSaved();
    } catch (e) {
      setError(e.message || 'Could not save the early close.');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setError('');
    setSaving(true);
    try {
      await setEarlyClose(null);
      setActive(null);
      flashSaved();
    } catch (e) {
      setError(e.message || 'Could not clear the early close.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 pt-4">
      <div className="card-diner p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-smashie-yellow/20 flex items-center justify-center">
            <CalendarClock size={22} className="text-patina-mint" />
          </div>
          <div>
            <h2 className="font-heading text-lg text-obsidian-roast">Close Early</h2>
            <p className="text-sm text-muted-foreground">Close at an earlier time for one day — the website and Smashie's phone line both stop taking orders then.</p>
          </div>
        </div>

        {active && (
          <div className="rounded-2xl border border-smashie-yellow/40 bg-smashie-yellow/10 p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-obsidian-roast">
              <span className="font-heading text-patina-mint">CLOSING EARLY</span>
              {' '}on {active.date} at {formatClock(active.close_time)}
              {active.message ? ` — ${active.message}` : ''}
            </p>
            <button
              onClick={clear}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-heading px-4 py-2 rounded-full border border-border hover:border-midnight-cherry/40 text-muted-foreground disabled:opacity-60"
            >
              <Trash2 size={13} /> Clear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Last orders at</label>
            <input
              type="time"
              value={closeTime}
              onChange={e => setCloseTime(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message (optional)</label>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="e.g. closing early for a staff event"
            className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <div className="min-w-[220px]">
            <p className="text-xs text-muted-foreground">Smashie will say: we close at {formatClock(closeTime)} today.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Self-expires at midnight — your weekly hours are never touched.</p>
            {blockedReason && !error && (
              <p className="text-xs text-midnight-cherry mt-1">{blockedReason}</p>
            )}
            {error && <p role="alert" className="text-xs text-destructive mt-1">{error}</p>}
          </div>
          <button
            onClick={save}
            disabled={saving || !date || !closeTime || !!blockedReason}
            className="btn-mint chrome-hover px-5 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save Early Close'}
          </button>
        </div>
      </div>
    </div>
  );
}