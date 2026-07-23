import React, { useState, useEffect } from 'react';
import { Power, Save, Check } from 'lucide-react';
import { getMenuSetting, setOrderingEnabled } from '@/lib/menuSettings';

export default function StoreStatusCard() {
  const [orderingEnabled, setEnabled] = useState(true);
  const [message, setMessage] = useState('Ordering is temporarily closed');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        setEnabled(s.ordering_enabled !== false);
        setMessage(s.ordering_closed_message || 'Ordering is temporarily closed');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const toggle = async () => {
    const next = !orderingEnabled;
    setEnabled(next);
    setSaving(true);
    try {
      await setOrderingEnabled(next, message);
      flashSaved();
    } finally {
      setSaving(false);
    }
  };

  const saveMessage = async () => {
    setSaving(true);
    try {
      await setOrderingEnabled(orderingEnabled, message);
      flashSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className={`card-diner p-6 ${!orderingEnabled ? 'ring-2 ring-midnight-cherry/30' : ''}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${orderingEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
              <Power size={22} className={orderingEnabled ? 'text-green-700' : 'text-red-600'} />
            </div>
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast">Online Ordering</h2>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading…' : orderingEnabled ? 'Open — accepting orders' : 'Closed — checkout disabled for customers'}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={loading || saving}
            className={`px-6 py-3 rounded-2xl font-heading text-sm transition-all disabled:opacity-60 ${orderingEnabled ? 'bg-midnight-cherry text-white hover:bg-red-800' : 'bg-patina-mint text-white hover:opacity-90'}`}
          >
            {orderingEnabled ? 'Turn Off' : 'Turn On'}
          </button>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Closed Message</label>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ordering is temporarily closed"
              className="flex-1 min-w-[220px] px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
            <button
              onClick={saveMessage}
              disabled={saving}
              className="btn-mint chrome-hover px-5 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
            >
              {savedFlash ? <Check size={15} /> : <Save size={15} />}
              {savedFlash ? 'Saved' : 'Save Message'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Customers see this when ordering is turned off.</p>
        </div>
      </div>
    </div>
  );
}