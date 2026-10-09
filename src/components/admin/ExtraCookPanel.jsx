import React, { useState, useEffect } from 'react';
import { Flame, Save, Check, X } from 'lucide-react';
import { getMenuSetting, setExtraCookDate, bustMenuSettingCache } from '@/lib/menuSettings';

// Store-local (America/Chicago) YYYY-MM-DD — the same date key the backend
// busyness model compares extra_cook_date against.
function chicagoDateKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const p = {};
  for (const part of parts) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}`;
}

function formatDateLabel(key) {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// Admin panel for the extra-cook day. Marking a day tells the busyness model
// a second cook is on the line, so the kitchen runs at double output — quoted
// waits shrink and it takes twice the volume to reach Busy or Slammed.
export default function ExtraCookPanel() {
  const todayKey = chicagoDateKey();
  const [dateKey, setDateKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => setDateKey(s.extra_cook_date || ''))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); };

  const persist = async (next) => {
    setSaving(true);
    try {
      await setExtraCookDate(next);
      bustMenuSettingCache();
      flashSaved();
    } finally { setSaving(false); }
  };

  const isToday = dateKey === todayKey;

  const save = () => persist(dateKey);
  const useToday = () => { setDateKey(todayKey); return persist(todayKey); };
  const clear = () => { setDateKey(''); return persist(''); };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className={`card-diner p-6 ${isToday ? 'ring-2 ring-smashie-yellow/40' : ''}`}>
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isToday ? 'bg-smashie-yellow/20' : 'bg-muted'}`}>
            <Flame size={22} className={isToday ? 'text-midnight-cherry' : 'text-muted-foreground'} />
          </div>
          <div>
            <h2 className="font-heading text-lg text-obsidian-roast">Extra Cook Day</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : isToday
                ? `On today (${formatDateLabel(todayKey)}) — kitchen output is doubled.`
                : dateKey
                  ? `Scheduled for ${formatDateLabel(dateKey)}.`
                  : 'Off — normal kitchen output.'}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Set this on a day when a second cook is on the line. The busyness indicator and quoted wait times then treat the kitchen as running at double output — shorter waits, and it takes twice the volume to reach Busy or Slammed. It expires on its own the next day.
        </p>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Extra Cook Date</label>
            <input
              type="date"
              value={dateKey}
              onChange={e => setDateKey(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <button
            onClick={useToday}
            disabled={loading || saving}
            className={`px-5 py-3 rounded-2xl font-heading text-sm transition-colors disabled:opacity-60 ${
              isToday ? 'bg-midnight-cherry text-white hover:bg-red-800' : 'border border-border text-obsidian-roast hover:bg-muted'
            }`}
          >
            Use Today
          </button>
        </div>

        <div className="flex gap-3 flex-wrap mt-5">
          <button
            onClick={save}
            disabled={loading || saving || !dateKey}
            className="btn-mint chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={clear}
            disabled={loading || saving || !dateKey}
            className="px-6 py-3 rounded-2xl font-heading text-sm border border-border text-obsidian-roast hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <X size={15} />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}