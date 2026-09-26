import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Plus, Save, Trash2, Copy, Search, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  makeBlankPreset,
  DEFAULT_DELUXE_PRESETS,
  normalizeDeluxeConfig,
} from '@/lib/deluxeConfig';
import { getMenuSetting, setDeluxeConfig } from '@/lib/menuSettings';

const norm = (s) => (s || '').trim().toLowerCase();

export default function AdminDeluxeManager() {
  const [enabled, setEnabled] = useState(true);
  const [presets, setPresets] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load the saved Deluxe settings from the store settings record so this panel
  // reflects what customers actually see (not a browser-local copy).
  useEffect(() => {
    Promise.all([
      getMenuSetting(),
      base44.entities.MenuItem.list().catch(() => []),
    ]).then(([setting, data]) => {
      const cfg = normalizeDeluxeConfig(setting?.deluxe);
      setEnabled(cfg.enabled);
      setPresets(cfg.presets);
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

  const setAppliesToAll = (preset, all) => {
    update(preset.id, { appliesTo: all ? [] : items.map((i) => i.id) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDeluxeConfig({ enabled, presets });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPresets(DEFAULT_DELUXE_PRESETS);
    setEnabled(true);
    setDirty(true);
  };

  const toggleEnabled = () => {
    setEnabled((e) => !e);
    setDirty(true);
  };

  // Collect all unique topping names from items for the topping picker
  const allToppings = useMemo(() => Array.from(new Set(
    items.flatMap((item) => (item.modifiers || []))
      .flatMap((group) => (group.modifiers || []))
      .map((m) => m.name)
      .filter(Boolean)
  )).sort(), [items]);

  // Items grouped by category for the assignment section
  const itemsByCategory = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const cat = item.display_category || item.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

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
          Each preset becomes a "Make it {`{name}`}" button in the modifier panel. Create multiple presets and assign each to specific items — great for different Deluxe combos on different burgers.
        </p>

        {/* Master switch — controls whether the Deluxe button appears site-wide */}
        <button
          type="button"
          onClick={toggleEnabled}
          className={`w-full mb-4 flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${
            enabled ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${enabled ? 'bg-midnight-cherry justify-end' : 'bg-gray-300 justify-start'}`}>
              <span className="w-5 h-5 bg-white rounded-full shadow" />
            </div>
            <div>
              <p className="font-heading text-sm text-obsidian-roast">Show the Deluxe button</p>
              <p className="text-xs text-muted-foreground">Turn off to hide every "Make it Deluxe" button from customers.</p>
            </div>
          </div>
          <span className={`text-xs font-heading ${enabled ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
            {enabled ? 'On' : 'Off'}
          </span>
        </button>
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
        presets.map((preset) => {
          const assignedCount = (preset.appliesTo || []).length;
          const appliesToAll = assignedCount === 0;
          return (
          <div key={preset.id} className="card-diner p-6 space-y-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={preset.name}
                onChange={(e) => update(preset.id, { name: e.target.value })}
                className="font-heading text-base text-obsidian-roast bg-transparent border-b border-border focus:border-midnight-cherry focus:outline-none flex-1 mr-3"
                placeholder="Preset name (e.g. Deluxe, Island Deluxe)"
              />
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => copyPreset(preset.id)} className="p-2 rounded-xl bg-muted hover:bg-gray-200 text-muted-foreground transition-colors" title="Duplicate">
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

            {/* Applies To — which items show this Deluxe button */}
            <AppliesToSection
              preset={preset}
              itemsByCategory={itemsByCategory}
              appliesToAll={appliesToAll}
              assignedCount={assignedCount}
              onToggle={toggleAppliesTo}
              onSetAll={setAppliesToAll}
            />
          </div>
          );
        })
      )}
    </div>
  );
}

// ── Item assignment section with search + category grouping ──
function AppliesToSection({ preset, itemsByCategory, appliesToAll, assignedCount, onToggle, onSetAll }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(true);

  const q = norm(query);
  const filteredCats = itemsByCategory
    .map(([cat, list]) => [cat, q ? list.filter((i) => norm(i.name).includes(q)) : list])
    .filter(([, list]) => list.length > 0);

  return (
    <div className="border-2 border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <Check size={14} className="text-midnight-cherry" />
          <span className="text-xs font-semibold text-obsidian-roast uppercase tracking-wider">
            Which items get this button
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-body ${
            appliesToAll
              ? 'bg-midnight-cherry/10 text-midnight-cherry'
              : 'bg-patina-mint/10 text-patina-mint'
          }`}>
            {appliesToAll ? 'All items' : `${assignedCount} item${assignedCount === 1 ? '' : 's'}`}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Leave empty to show on every item with modifiers. Or pick specific items — perfect for giving different burgers their own Deluxe button.
          </p>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetAll(preset, true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body border-2 transition-all ${
                appliesToAll ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
              }`}
            >
              All items
            </button>
            <button
              onClick={() => onSetAll(preset, false)}
              className="px-3 py-1.5 rounded-lg text-xs font-body border-2 border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50 transition-all"
            >
              Clear
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-white text-sm text-obsidian-roast focus:border-midnight-cherry focus:outline-none"
            />
          </div>

          {/* Category-grouped item list */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {filteredCats.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No items match "{query}".</p>
            )}
            {filteredCats.map(([cat, list]) => (
              <div key={cat}>
                <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1.5">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((item) => {
                    const active = (preset.appliesTo || []).includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onToggle(preset, item.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-body border-2 transition-all ${
                          active ? 'border-midnight-cherry bg-midnight-cherry/10 text-midnight-cherry' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                        }`}
                      >
                        {active && <Check size={11} className="inline mr-1" />}
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}