import React, { useState, useEffect } from 'react';
import { Save, Check, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  getShakeConfig,
  saveShakeConfig,
  DEFAULT_FLAVOR_NAMES,
  DEFAULT_FLAVOR_EMOJIS,
} from '@/lib/shakeConfig';
import { MILKSHAKE_ITEM_ID } from '@/components/ShakeCustomizer';

// Admin UI to rename milkshake flavors and swap their emojis. The flavors come
// from the single Square "Milkshake" item's FLAVOR CHOICE modifier list; this
// manager just controls the display name + emoji customers see on the
// Milkshakes page and in the customizer.
export default function AdminShakeManager() {
  const [shakeItem, setShakeItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState({});
  const [emojis, setEmojis] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = getShakeConfig();
    setNames(cfg.flavorNames || {});
    setEmojis(cfg.flavorEmojis || {});
    base44.entities.MenuItem
      .get(MILKSHAKE_ITEM_ID)
      .then((it) => setShakeItem(it))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flavors = (shakeItem?.modifiers || []).find((g) => (g.name || '').toLowerCase().includes('flavor'))?.modifiers || [];

  const updateName = (id, value) => {
    setNames((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  const updateEmoji = (id, value) => {
    setEmojis((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  const resetFlavor = (id) => {
    setNames((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEmojis((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    // Drop empty overrides so storage stays clean.
    const cleanNames = {};
    const cleanEmojis = {};
    for (const f of flavors) {
      const n = (names[f.id] || '').trim();
      const e = (emojis[f.id] || '').trim();
      if (n && n !== DEFAULT_FLAVOR_NAMES[f.id] && n !== f.name) cleanNames[f.id] = n;
      if (e && e !== DEFAULT_FLAVOR_EMOJIS[f.id]) cleanEmojis[f.id] = e;
    }
    saveShakeConfig({ flavorNames: cleanNames, flavorEmojis: cleanEmojis });
    setNames(cleanNames);
    setEmojis(cleanEmojis);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="card-diner p-6 text-center text-muted-foreground">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        Loading milkshake flavors…
      </div>
    );
  }

  if (!shakeItem) {
    return <div className="card-diner p-6 text-center text-muted-foreground">Could not load the Milkshake item.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card-diner p-6">
        <h2 className="font-heading text-lg text-obsidian-roast mb-1">Milkshake Names</h2>
        <p className="text-sm text-muted-foreground mb-5">
          These are the {flavors.length} flavors customers see as milkshake types on the Milkshakes page. Rename them or swap the emoji — the Square modifier stays linked, so pricing and POS tickets are unaffected.
        </p>

        <div className="space-y-3">
          {flavors.map((f) => {
            const defaultName = DEFAULT_FLAVOR_NAMES[f.id] || f.name;
            const defaultEmoji = DEFAULT_FLAVOR_EMOJIS[f.id] || '🥤';
            const currentName = names[f.id] !== undefined ? names[f.id] : '';
            const currentEmoji = emojis[f.id] !== undefined ? emojis[f.id] : '';
            const isOverridden = !!(names[f.id] || emojis[f.id]);
            return (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-white">
                <input
                  type="text"
                  value={currentEmoji}
                  onChange={(e) => updateEmoji(f.id, e.target.value)}
                  placeholder={defaultEmoji}
                  className="w-12 text-center text-xl px-1 py-2 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
                />
                <input
                  type="text"
                  value={currentName}
                  onChange={(e) => updateName(f.id, e.target.value)}
                  placeholder={defaultName}
                  className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-heading text-obsidian-roast focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                />
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Square</p>
                  <p className="text-xs text-muted-foreground font-body max-w-[120px] truncate">{f.name}</p>
                </div>
                {isOverridden && (
                  <button
                    onClick={() => resetFlavor(f.id)}
                    title="Reset to default"
                    className="p-2 text-muted-foreground hover:text-midnight-cherry transition-colors"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 mt-5"
        >
          {saved ? (
            <>
              <Check size={15} /> Saved
            </>
          ) : (
            <>
              <Save size={15} /> Save Names
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Leave a field blank to use the curated default. Names are stored in your browser — merge to main to sync them to every customer's device.
        </p>
      </div>
    </div>
  );
}