import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Check, Save, Trash2, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  getDeluxePresets,
  saveDeluxePresets,
  makeBlankPreset,
} from '@/lib/deluxeConfig';

const norm = (s) => (s || '').trim().toLowerCase();

// Admin UI to manage multiple Deluxe presets ("tags"): each has a label, a set
// of toppings it selects, a subset of "silent" toppings (selected but never
// called out as "no …"), and the menu items it appears on.
export default function AdminDeluxeManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [presets, setPresets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newTopping, setNewTopping] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loaded = getDeluxePresets();
    setPresets(loaded);
    setActiveId(loaded[0]?.id || null);
    (async () => {
      try {
        const data = await base44.entities.MenuItem.list();
        setItems(data || []);
      } catch (e) {/* ignore */}
      setLoading(false);
    })();
  }, []);

  const active = presets.find((p) => p.id === activeId) || null;

  const patchActive = (patch) => {
    setPresets((prev) => prev.map((p) => (p.id === activeId ? { ...p, ...patch } : p)));
    setSaved(false);
  };

  const addPreset = () => {
    const blank = makeBlankPreset(`Deluxe ${presets.length + 1}`);
    setPresets((prev) => [...prev, blank]);
    setActiveId(blank.id);
    setSaved(false);
  };

  const duplicatePreset = () => {
    if (!active) return;
    const copy = makeBlankPreset(`${active.name} copy`);
    copy.toppings = [...active.toppings];
    copy.silentToppings = [...active.silentToppings];
    copy.appliesTo = [...active.appliesTo];
    setPresets((prev) => [...prev, copy]);
    setActiveId(copy.id);
    setSaved(false);
  };

  const deletePreset = () => {
    if (!active) return;
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== activeId);
      setActiveId(next[0]?.id || null);
      return next;
    });
    setSaved(false);
  };

  const addTopping = () => {
    const t = newTopping.trim();
    if (!t || !active) return;
    if (active.toppings.some((x) => norm(x) === norm(t))) {
      setNewTopping('');
      return;
    }
    patchActive({ toppings: [...active.toppings, t] });
    setNewTopping('');
  };

  const removeTopping = (t) => {
    patchActive({
      toppings: active.toppings.filter((x) => x !== t),
      silentToppings: active.silentToppings.filter((x) => norm(x) !== norm(t)),
    });
  };

  const toggleSilent = (t) => {
    const isSilent = active.silentToppings.some((x) => norm(x) === norm(t));
    patchActive({
      silentToppings: isSilent
        ? active.silentToppings.filter((x) => norm(x) !== norm(t))
        : [...active.silentToppings, t],
    });
  };

  const toggleItem = (id) => {
    const has = active.appliesTo.includes(id);
    patchActive({ appliesTo: has ? active.appliesTo.filter((x) => x !== id) : [...active.appliesTo, id] });
  };

  const handleSave = () => {
    const clean = saveDeluxePresets(presets);
    setPresets(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const allItems = active?.appliesTo.length === 0;

  return (
    <div className="space-y-6">
      <div className="card-diner p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-midnight-cherry" />
          <h2 className="font-heading text-lg text-obsidian-roast">Deluxe Presets</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          One-tap shortcuts in the customizer that select a fixed set of toppings. Each preset shows its name — or "{active?.name || 'Deluxe'}, no [topping]" as items are removed. "Silent" toppings are selected but never called out.
        </p>

        {/* Preset tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={`px-4 py-2 rounded-2xl text-sm font-heading transition-all flex items-center gap-1.5 ${
                p.id === activeId ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-gray-200'
              }`}
            >
              <Sparkles size={13} />
              {p.name}
            </button>
          ))}
          <button
            onClick={addPreset}
            className="px-4 py-2 rounded-2xl text-sm font-heading bg-patina-mint/10 text-patina-mint hover:bg-patina-mint/20 transition-all flex items-center gap-1"
          >
            <Plus size={14} /> New Preset
          </button>
        </div>

        {active ? (
          <>
            {/* Name */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Label</label>
              <input
                type="text"
                value={active.name}
                onChange={(e) => patchActive({ name: e.target.value })}
                placeholder="Deluxe"
                className="w-full max-w-xs px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
            </div>

            {/* Toppings */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Toppings Selected by the Button</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {active.toppings.length === 0 && (
                  <span className="text-sm text-muted-foreground">No toppings yet — add some below.</span>
                )}
                {active.toppings.map((t) => {
                  const isSilent = active.silentToppings.some((x) => norm(x) === norm(t));
                  return (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1.5 text-sm font-heading px-3 py-1.5 rounded-full ${
                        isSilent ? 'bg-patina-mint/10 text-patina-mint border border-patina-mint/30' : 'bg-midnight-cherry/10 text-midnight-cherry'
                      }`}
                    >
                      {t}
                      {isSilent && <span className="text-[10px] font-body normal-case opacity-70">silent</span>}
                      <button onClick={() => toggleSilent(t)} className="hover:opacity-70 transition-opacity" title="Toggle silent">
                        <Sparkles size={12} />
                      </button>
                      <button onClick={() => removeTopping(t)} className="hover:text-destructive transition-colors">
                        <X size={13} />
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={newTopping}
                  onChange={(e) => setNewTopping(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTopping(); } }}
                  placeholder="e.g. Mustard"
                  className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                />
                <button onClick={addTopping} className="btn-mint px-4 py-2.5 text-sm font-heading flex items-center gap-1">
                  <Plus size={15} /> Add
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tap the <Sparkles size={11} className="inline" /> on a chip to mark it silent — selected by the button but never shown as "no {`{topping}`}".
              </p>
            </div>

            {/* Applies to */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Show the Button On</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => patchActive({ appliesTo: [] })}
                  className={`px-4 py-2 rounded-2xl text-sm font-heading transition-all ${allItems ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-gray-200'}`}
                >
                  All items with matching toppings
                </button>
                <button
                  onClick={() => patchActive({ appliesTo: items.length ? [items[0].id] : [] })}
                  className={`px-4 py-2 rounded-2xl text-sm font-heading transition-all ${!allItems ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-gray-200'}`}
                >
                  Only specific items
                </button>
              </div>

              {!allItems && (
                <div className="border border-border rounded-2xl divide-y divide-border max-h-72 overflow-y-auto">
                  {loading ? (
                    <p className="p-4 text-sm text-muted-foreground">Loading items…</p>
                  ) : items.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No menu items found.</p>
                  ) : (
                    items.map((item) => {
                      const checked = active.appliesTo.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <p className="font-heading text-sm text-obsidian-roast truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price?.toFixed(2)} · {item.modifiers?.length || 0} modifier group{(item.modifiers?.length || 0) !== 1 ? 's' : ''}</p>
                          </div>
                          <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full border-2 ${checked ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'}`}>
                            {checked && <Check size={13} className="text-white" />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2"
              >
                {saved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save All Presets</>}
              </button>
              <button
                onClick={duplicatePreset}
                className="px-4 py-3 text-sm font-heading rounded-2xl bg-muted text-obsidian-roast hover:bg-gray-200 transition-all flex items-center gap-1.5"
              >
                <Copy size={15} /> Duplicate
              </button>
              <button
                onClick={deletePreset}
                disabled={presets.length <= 1}
                className="px-4 py-3 text-sm font-heading rounded-2xl bg-muted text-obsidian-roast hover:bg-destructive hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No presets. Click "New Preset" to create one.</p>
        )}
      </div>
    </div>
  );
}