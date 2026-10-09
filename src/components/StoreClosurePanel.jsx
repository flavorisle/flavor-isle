import React, { useState, useEffect } from 'react';
import { CalendarOff, Save, Check, X } from 'lucide-react';
import { getMenuSetting, setClosure, bustMenuSettingCache } from '@/lib/menuSettings';
import { evaluateClosure } from '@/lib/storeClosure';

// Admin panel for scheduling a full-day (or multi-day) emergency closure.
// Setting a closure here closes the website (banner + ordering cutoff) and
// tells Smashie to announce the closure on the phone — one place controls both.
export default function StoreClosurePanel() {
  const [closure, setClosureState] = useState({ active: false, start_date: '', end_date: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        const c = s.closure || {};
        setClosureState({
          active: !!c.active,
          start_date: c.start_date || '',
          end_date: c.end_date || '',
          message: c.message || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); };

  const save = async () => {
    setSaving(true);
    try {
      await setClosure(closure);
      bustMenuSettingCache();
      flashSaved();
    } finally { setSaving(false); }
  };

  const clear = async () => {
    const cleared = { active: false, start_date: '', end_date: '', message: '' };
    setClosureState(cleared);
    setSaving(true);
    try {
      await setClosure(cleared);
      bustMenuSettingCache();
      flashSaved();
    } finally { setSaving(false); }
  };

  const liveStatus = evaluateClosure({ closure });
  const todayLabel = new Date().toLocaleDateString('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className={`card-diner p-6 ${liveStatus.closed ? 'ring-2 ring-midnight-cherry/30' : ''}`}>
        <div className="flex items-center gap-4 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${liveStatus.closed ? 'bg-red-100' : 'bg-green-100'}`}>
            <CalendarOff size={22} className={liveStatus.closed ? 'text-red-600' : 'text-green-700'} />
          </div>
          <div>
            <h2 className="font-heading text-lg text-obsidian-roast">Emergency Closure</h2>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : liveStatus.closed
                ? `Closed today (${todayLabel}) — ${liveStatus.message}`
                : `Open normally today (${todayLabel})`}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          Schedule a full-day closure for maintenance, weather, or emergencies. This closes the website (banner + ordering) and tells Smashie to announce the closure on the phone. Use a single date or a date range. Applies to both systems: website checkout and Smashie's phone orders.
        </p>

        <div className="flex items-center justify-between gap-4 flex-wrap mb-5 pb-5 border-b border-border">
          <div>
            <p className="font-heading text-sm text-obsidian-roast">Closure Active</p>
            <p className="text-xs text-muted-foreground">Turn on to apply the closure below.</p>
          </div>
          <button
            onClick={() => setClosureState(c => ({ ...c, active: !c.active }))}
            disabled={loading || saving}
            className={`px-6 py-3 rounded-2xl font-heading text-sm transition-all disabled:opacity-60 ${closure.active ? 'bg-midnight-cherry text-white hover:bg-red-800' : 'bg-patina-mint text-white hover:opacity-90'}`}
          >
            {closure.active ? 'On' : 'Off'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</label>
            <input
              type="date"
              value={closure.start_date}
              onChange={e => setClosureState(c => ({ ...c, start_date: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</label>
            <input
              type="date"
              value={closure.end_date}
              onChange={e => setClosureState(c => ({ ...c, end_date: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Closure Reason (shown on the site & spoken by Smashie)</label>
          <input
            type="text"
            value={closure.message}
            onChange={e => setClosureState(c => ({ ...c, message: e.target.value }))}
            placeholder="closed for maintenance and the heat"
            className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={save}
            disabled={loading || saving}
            className="btn-mint chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save Closure'}
          </button>
          <button
            onClick={clear}
            disabled={loading || saving}
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