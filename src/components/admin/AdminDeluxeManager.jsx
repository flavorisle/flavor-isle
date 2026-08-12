import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Check, Save, Trash2, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  getDeluxePresets,
  saveDeluxePresets,
  makeBlankPreset,
  DEFAULT_DELUXE_PRESETS,
} from '@/lib/deluxeConfig';

const norm = (s) => (s || '').trim().toLowerCase();

export default function AdminDeluxeManager() {
  const [presets, setPresets] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPresets(getDeluxePresets());
    base44.entities.MenuItem.list().then((data) => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (id, patch) => {
    setPresets((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const addPreset = () => {
    setPresets((prev) => [...prev, makeBlankPreset()]);
    setDirty(true);
  };

  const copyPreset = (id) => {
    const orig = presets.find((p) => p.id === id);
    if (!orig) return;
    const copy = { ...orig, id: 'preset_' + Math.random().toString(36).slice(2, 9), name: orig.name + ' Copy' };
    setPresets((prev) => [...prev, copy]);
    setDirty(true);
  };

  const deletePreset = (id) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
  };

  const toggleTopping = (preset, field, name) => {
    const list = preset[field] || [];
    const has = list.some((t) => norm(t) === norm(name));
    update(preset.id, {
      [field]: has ? list.filter((t) => norm(t) !== norm(name)) : [...list, name],
    });
  };

  const toggleAppliesTo = (preset, itemId) => {
    const list = preset.appliesTo || [];
    const has = list.includes(itemId);
    update(preset.id, {
      appliesTo: has ? list.filter((id) => id !== itemId) : [...list, itemId],
    });
  };

  const handleSave = () => {
    setSaving(true);
    saveDeluxePresets(presets);
    setDirty(false);
    setSaving(false);
  };

  const handleReset = () => {
    setPresets(DEFAULT_DELUXE_PRESETS);
    setDirty(true);
  };

  // Collect all unique topping names from items for the topping picker
  const allToppings = Array.from(new Set(
    items.flatMap((item) => (item.modifiers || []))
      .flatMap((group) => (group.modifiers || []))
      .map((m) => m.name)
      .filter(Boolean)
  )).sort();

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="card-diner p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-heading text-lg text-obsidian-roast flex items-center gap-2">
            <Sparkles size={18} className="text-midnight-cherry" /> Deluxe Presets
          </h2>
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-4 py-2 rounded-xl text-xs font-heading bg-muted text-obsidian-roast hover:bg-gray-200 transition-colors">
              Reset to Default
            </button>
            <button onClick={addPreset} className="btn-cherry chrome-hover px-4 py-2 text-xs font-heading flex items-center gap-1">
              <Plus size={13} /> Add Preset
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          A preset is a one-tap shortcut in the modifier modal that selects a fixed set of toppings and labels the order with its name. Leave "Applies To" empty to show on all items.
        </p>
        {dirty && (
          <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <span className="text-xs text-amber-700 font-body">You have unsaved changes.</span>
            <button onClick={handleSave} disabled={saving} className="btn-mint px-4 py-1.5 text-xs font-heading flex items-center gap-1">
              <Save size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {presets.length === 0 ? (
        <div className="card-diner p-8 text-center text-muted-foreground">
          <p>No presets yet. Add one above.</p>
        </div>
      ) : (
        presets.map((preset) => (
          <div key={preset.id} className="card-diner p-6 space-y-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={preset.name}
                onChange={(e) => update(preset.id, { name: e.target.value })}
                className="font-heading text-base text-obsidian-roast bg-transparent border-b border-border focus:border-midnight-cherry focus:outline-none flex-1 mr-3"
                placeholder="Preset name"
              />
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => copyPreset(preset.id)} className="p-2 rounded-xl bg-muted hover:bg-gray-200 text-muted-foreground transition-colors" title="Copy">
                  <Copy size={15} />
                </button>
                <button onClick={() => deletePreset(preset.id)} className="p-2 rounded-xl bg-muted hover:bg-red-50 hover:text-destructive text-muted-foreground transition-colors" title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Toppings */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Toppings (selected by the button)</p>
              <div className="flex flex-wrap gap-2">
                {allToppings.map((name) => {
                  const active = (preset.toppings || []).some((t) => norm(t) === norm(name));
                  return (
                    <button
                      key={name}
                      onClick={() => toggleTopping(preset, 'toppings', name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-body border-2 transition-all ${
                        active ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
                {allToppings.length === 0 && <p className="text-xs text-muted-foreground">No toppings found in menu items.</p>}
              </div>
            </div>

            {/* Silent Toppings */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Silent Toppings (selected but never called out as "no X")</p>
              <div className="flex flex-wrap gap-2">
                {(preset.toppings || []).map((name) => {
                  const active = (preset.silentToppings || []).some((t) => norm(t) === norm(name));
                  return (
                    <button
                      key={name}
                      onClick={() => toggleTopping(preset, 'silentToppings', name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-body border-2 transition-all ${
                        active ? 'border-patina-mint bg-patina-mint text-white' : 'border-border bg-white text-obsidian-roast hover:border-patina-mint/50'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
                {(preset.toppings || []).length === 0 && <p className="text-xs text-muted-foreground">Select toppings first.</p>}
              </div>
            </div>

            {/* Applies To */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Applies To (empty = all items)</p>
              <div className="max-h-40 overflow-y-auto flex flex-wrap gap-2">
                {items.map((item) => {
                  const active = (preset.appliesTo || []).includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleAppliesTo(preset, item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-body border-2 transition-all ${
                        active ? 'border-midnight-cherry bg-midnight-cherry/10 text-midnight-cherry' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}