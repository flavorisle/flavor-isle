// Editing sidebar for the in-store printable menu: header/footer text, layout
// options, per-item include / rename / reprice / reorder controls, custom
// item creation, editable size pricing, and section consolidation.
import React, { useState } from 'react';
import { Eye, EyeOff, RotateCcw, ChevronUp, ChevronDown, Plus, Trash2, Layers } from 'lucide-react';

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-heading text-obsidian-roast mb-1 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-white text-sm';

// Auto-detect size rows from a live menu item's "Size" modifier list.
function autoSizes(item) {
  if (item.is_custom) return [];
  const sizeList = (item.modifiers || []).find(m => /size/i.test(m.name || ''));
  if (!sizeList?.modifiers?.length) return [];
  return sizeList.modifiers
    .filter(o => !o.sold_out)
    .map(o => ({ label: o.name || '', price: Number(item.price || 0) + Number(o.price || 0) }));
}

// Collapsible per-item size pricing editor. Lets staff add small/large rows
// (or any size labels) with absolute prices. For live items with auto-detected
// sizes, a "Reset to auto" button reverts the override.
function SizeEditor({ sizes, canReset, onChange, onReset }) {
  const [expanded, setExpanded] = useState(false);
  const hasSizes = sizes && sizes.length > 0;

  if (!hasSizes && !expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true);
          onChange([{ label: 'Small', price: 0 }, { label: 'Large', price: 0 }]);
        }}
        className="mt-1 flex items-center gap-1 text-[11px] text-patina-mint hover:text-midnight-cherry"
      >
        <Plus size={10} /> Add sizes
      </button>
    );
  }

  if (!expanded && hasSizes) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-obsidian-roast"
        >
          <Layers size={10} /> {sizes.map(s => `${s.label} $${Number(s.price).toFixed(2)}`).join(' · ')}
        </button>
        {canReset && (
          <button onClick={onReset} className="text-[11px] text-muted-foreground hover:text-destructive">
            Reset
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1">
      {sizes.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="flex-1 min-w-0 px-2 py-0.5 text-xs rounded border border-border"
            placeholder="Label…"
            value={s.label}
            onChange={e => { const next = [...sizes]; next[i] = { ...next[i], label: e.target.value }; onChange(next); }}
          />
          <input
            type="number" step="0.01"
            className="w-16 px-2 py-0.5 text-xs rounded border border-border text-right"
            value={s.price}
            onChange={e => { const next = [...sizes]; next[i] = { ...next[i], price: Number(e.target.value) }; onChange(next); }}
          />
          <button
            onClick={() => onChange(sizes.filter((_, j) => j !== i))}
            className="p-0.5 text-muted-foreground hover:text-destructive"
            aria-label="Remove size"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange([...(sizes || []), { label: '', price: 0 }])}
          className="flex items-center gap-1 text-[11px] text-patina-mint hover:text-midnight-cherry"
        >
          <Plus size={10} /> Add size
        </button>
        {canReset && (
          <button onClick={() => { onReset(); setExpanded(false); }} className="text-[11px] text-muted-foreground hover:text-destructive ml-auto">
            Reset to auto
          </button>
        )}
      </div>
    </div>
  );
}

export default function PrintMenuEditor({
  config, setConfig, sections, hiddenIds, toggleItem, overrides, setOverride,
  setSectionTitle, moveSection, moveItem, addCustomItem, removeCustomItem, updateCustomItem,
  consolidatedSections, toggleConsolidate, updateConsolidated, resetAll,
}) {
  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card-diner p-5">
        <h3 className="font-heading text-lg text-obsidian-roast mb-3">Header & Footer</h3>
        <Field label="Title">
          <input className={inputCls} value={config.title} onChange={e => update('title', e.target.value)} />
        </Field>
        <Field label="Subtitle">
          <input className={inputCls} value={config.subtitle} onChange={e => update('subtitle', e.target.value)} />
        </Field>
        <Field label="Footer note">
          <textarea rows={3} className={inputCls} value={config.footer} onChange={e => update('footer', e.target.value)} />
        </Field>
      </div>

      <div className="card-diner p-5">
        <h3 className="font-heading text-lg text-obsidian-roast mb-3">Account Info</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Printed as its own block at the bottom. Clear the text to remove it.
        </p>
        <Field label="Heading">
          <input className={inputCls} value={config.accountTitle ?? ''} onChange={e => update('accountTitle', e.target.value)} />
        </Field>
        <Field label="Text">
          <textarea rows={3} className={inputCls} value={config.accountInfo ?? ''} onChange={e => update('accountInfo', e.target.value)} />
        </Field>
      </div>

      <div className="card-diner p-5">
        <h3 className="font-heading text-lg text-obsidian-roast mb-3">Layout</h3>
        <Field label="Columns">
          <select className={inputCls} value={config.columns} onChange={e => update('columns', Number(e.target.value))}>
            <option value={1}>1 column</option>
            <option value={2}>2 columns</option>
            <option value={3}>3 columns</option>
            <option value={4}>4 columns</option>
            <option value={5}>5 columns</option>
            <option value={6}>6 columns</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-obsidian-roast mb-2">
          <input type="checkbox" checked={config.showDescriptions} onChange={e => update('showDescriptions', e.target.checked)} />
          Show item descriptions
        </label>
        <label className="flex items-center gap-2 text-sm text-obsidian-roast">
          <input type="checkbox" checked={config.showLogo} onChange={e => update('showLogo', e.target.checked)} />
          Show logo
        </label>
      </div>

      <div className="card-diner p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg text-obsidian-roast">Items</h3>
          <button onClick={resetAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-midnight-cherry">
            <RotateCcw size={12} /> Reset edits
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Reorder sections and items, rename, reprice, add custom items, add small/large sizes, or consolidate a section (e.g. shakes: one price + flavor list). Print-only — your live menu isn't touched.
        </p>

        <div className="space-y-5 max-h-[36rem] overflow-y-auto pr-1">
          {sections.map((section, sIdx) => {
            const cons = consolidatedSections[section.key];
            return (
              <div key={section.key}>
                {/* Section header with up/down + consolidate toggle */}
                <div className="flex items-center gap-1 mb-2">
                  <input
                    className="flex-1 min-w-0 px-2 py-1 font-heading text-sm text-midnight-cherry uppercase tracking-wider bg-transparent rounded border border-transparent hover:border-border focus:border-border"
                    value={section.label}
                    onChange={e => setSectionTitle(section.key, e.target.value)}
                    aria-label={`Section heading for ${section.key}`}
                  />
                  <button
                    onClick={() => toggleConsolidate(section.key)}
                    title={cons ? 'Show individual items' : 'Consolidate into one price + flavor list'}
                    className={`p-1 rounded flex-shrink-0 ${cons ? 'text-midnight-cherry bg-midnight-cherry/10' : 'text-muted-foreground hover:text-midnight-cherry'}`}
                  >
                    <Layers size={15} />
                  </button>
                  <button onClick={() => moveSection(section.key, -1)} disabled={sIdx === 0}
                    aria-label={`Move ${section.label} up`}
                    className="p-1 rounded text-muted-foreground hover:text-midnight-cherry disabled:opacity-30 disabled:hover:text-muted-foreground">
                    <ChevronUp size={15} />
                  </button>
                  <button onClick={() => moveSection(section.key, 1)} disabled={sIdx === sections.length - 1}
                    aria-label={`Move ${section.label} down`}
                    className="p-1 rounded text-muted-foreground hover:text-midnight-cherry disabled:opacity-30 disabled:hover:text-muted-foreground">
                    <ChevronDown size={15} />
                  </button>
                </div>

                {cons ? (
                  /* Consolidated section editor — one price, flavor list, extra cost */
                  <div className="rounded-lg border border-midnight-cherry/20 p-3 space-y-2 bg-midnight-cherry/5">
                    <p className="text-xs text-muted-foreground">One price for all flavors. Flavors listed as text.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-heading text-obsidian-roast uppercase w-14">Price</span>
                      <input
                        type="number" step="0.01"
                        className="flex-1 px-2 py-1 text-sm rounded border border-border"
                        value={cons.price}
                        onChange={e => updateConsolidated(section.key, 'price', e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-xs font-heading text-obsidian-roast uppercase block mb-1">Flavors</span>
                      <textarea
                        rows={2}
                        className="w-full px-2 py-1 text-sm rounded border border-border"
                        value={cons.flavors}
                        onChange={e => updateConsolidated(section.key, 'flavors', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-heading text-obsidian-roast uppercase w-14">Extra $</span>
                      <input
                        type="number" step="0.01"
                        className="flex-1 px-2 py-1 text-sm rounded border border-border"
                        value={cons.extraCost}
                        onChange={e => updateConsolidated(section.key, 'extraCost', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  /* Normal item list with per-item controls */
                  <div className="space-y-2">
                    {section.allItems.map((item, iIdx) => {
                      const hidden = hiddenIds.includes(item.id);
                      const isCustom = !!item.is_custom;
                      const ov = overrides[item.id] || {};
                      const autoDetected = autoSizes(item);
                      const hasOverride = !isCustom && ov.sizes !== undefined;
                      const currentSizes = isCustom
                        ? (item.sizes ?? [])
                        : (hasOverride ? ov.sizes : autoDetected);

                      const updateField = (field, value) => {
                        if (isCustom) updateCustomItem(item.id, field, value);
                        else setOverride(item.id, field, value);
                      };

                      return (
                        <div key={item.id} className={`rounded-lg border border-border p-2 ${hidden ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleItem(item.id)}
                              aria-label={hidden ? 'Include on printed menu' : 'Hide from printed menu'}
                              className="p-1 text-muted-foreground hover:text-midnight-cherry flex-shrink-0"
                            >
                              {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <input
                              className="flex-1 min-w-0 px-2 py-1 text-sm rounded border border-transparent hover:border-border focus:border-border bg-transparent"
                              value={item.name}
                              onChange={e => updateField('name', e.target.value)}
                            />
                            <input
                              type="number" step="0.01"
                              className="w-20 px-2 py-1 text-sm rounded border border-border text-right"
                              value={item.price ?? 0}
                              onChange={e => updateField('price', e.target.value)}
                            />
                            <button
                              onClick={() => moveItem(section.key, item.id, -1)}
                              disabled={iIdx === 0}
                              aria-label="Move item up"
                              className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveItem(section.key, item.id, 1)}
                              disabled={iIdx === section.allItems.length - 1}
                              aria-label="Move item down"
                              className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
                            >
                              <ChevronDown size={14} />
                            </button>
                            {isCustom && (
                              <button
                                onClick={() => removeCustomItem(item.id)}
                                aria-label="Remove custom item"
                                className="p-1 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          {config.showDescriptions && (
                            <input
                              className="w-full mt-1 px-2 py-1 text-xs rounded border border-transparent hover:border-border bg-transparent text-muted-foreground"
                              placeholder="Description…"
                              value={item.description ?? ''}
                              onChange={e => updateField('description', e.target.value)}
                            />
                          )}
                          <SizeEditor
                            sizes={currentSizes}
                            canReset={hasOverride && autoDetected.length > 0}
                            onChange={(newSizes) => updateField('sizes', newSizes)}
                            onReset={() => updateField('sizes', undefined)}
                          />
                        </div>
                      );
                    })}
                    <button
                      onClick={() => addCustomItem(section.key)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-heading text-patina-mint border border-dashed border-patina-mint/40 rounded-lg hover:bg-patina-mint/5 transition-colors"
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}