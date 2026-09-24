import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Check } from 'lucide-react';
import { getMenuSetting, setSiteNotice, bustMenuSettingCache } from '@/lib/menuSettings';

// Admin panel for the site-wide notice banner. Toggle it on, write a custom
// message, and pick a tone. The banner appears at the top of every page for
// every visitor — use for delivery pauses, staffing shortages, holiday hours.
const LEVELS = [
  { key: 'info', label: 'Info', desc: 'General update', dot: 'bg-patina-mint' },
  { key: 'warning', label: 'Warning', desc: 'Heads up — limited service', dot: 'bg-smashie-yellow' },
  { key: 'urgent', label: 'Urgent', desc: 'Ordering impacted', dot: 'bg-midnight-cherry' },
];

const PRESETS = [
  'Delivery is paused today — no driver available. Pickup is still open!',
  'Short-staffed today — orders may take a little longer than usual. Thanks for your patience!',
  'Delivery is temporarily stopped due to staff shortages. Pickup and dine-in are still available.',
  'Holiday hours — closing early today at 6 PM.',
];

export default function SiteNoticePanel() {
  const [notice, setNotice] = useState({ active: false, message: '', level: 'warning' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        const n = s.site_notice || {};
        setNotice({
          active: !!n.active,
          message: n.message || '',
          level: n.level || 'warning',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); };

  const persist = async (next) => {
    setSaving(true);
    try {
      await setSiteNotice(next);
      bustMenuSettingCache();
      flashSaved();
    } finally { setSaving(false); }
  };

  const toggle = async (active) => {
    const next = { ...notice, active };
    setNotice(next);
    await persist(next);
  };

  const save = async () => {
    const next = { ...notice, message: notice.message.trim() };
    setNotice(next);
    await persist(next);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className={`card-diner p-6 ${notice.active ? 'ring-2 ring-smashie-yellow/40' : ''}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${notice.active ? 'bg-smashie-yellow/20' : 'bg-muted'}`}>
              <Megaphone size={22} className={notice.active ? 'text-midnight-cherry' : 'text-muted-foreground'} />
            </div>
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast">Customer Notice Banner</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading…' : notice.active
                  ? 'Showing on every page — visitors see your message at the top.'
                  : 'Off — no banner is shown right now.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggle(!notice.active)}
            disabled={loading || saving}
            role="switch"
            aria-checked={notice.active}
            aria-label={notice.active ? 'Turn notice off' : 'Turn notice on'}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 flex-shrink-0 ${notice.active ? 'bg-midnight-cherry' : 'bg-muted-foreground/30'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${notice.active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Show a banner at the top of every page to let customers know about delivery pauses, staffing shortages, driver availability, or special hours.
        </p>

        {/* Tone selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {LEVELS.map(l => (
            <button
              key={l.key}
              onClick={() => setNotice(n => ({ ...n, level: l.key }))}
              className={`p-3 rounded-2xl border-2 text-left transition-all ${notice.level === l.key ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-3 h-3 rounded-full ${l.dot}`} />
                <span className="font-heading text-sm text-obsidian-roast">{l.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
            </button>
          ))}
        </div>

        {/* Message */}
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Banner Message</label>
        <textarea
          value={notice.message}
          onChange={e => setNotice(n => ({ ...n, message: e.target.value }))}
          placeholder="Delivery is paused today — no driver available. Pickup is still open!"
          rows={2}
          className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none"
        />

        {/* Quick presets */}
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Messages</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setNotice(n => ({ ...n, message: p }))}
                className="text-xs px-3 py-2 rounded-full border border-border text-muted-foreground hover:border-midnight-cherry hover:text-midnight-cherry transition-colors text-left max-w-full"
              >
                {p.length > 48 ? p.slice(0, 48) + '…' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={save}
            disabled={loading || saving}
            className="btn-mint chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save Notice'}
          </button>
          <span className="text-xs text-muted-foreground">Turn the switch on to show it instantly.</span>
        </div>
      </div>
    </div>
  );
}