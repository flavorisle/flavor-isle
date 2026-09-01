// Editing sidebar for the in-store printable menu: header/footer text, layout
// options, and per-item include / rename / reprice controls.
import React from 'react';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-heading text-obsidian-roast mb-1 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-white text-sm';

export default function PrintMenuEditor({
  config,
  setConfig,
  sections,
  hiddenIds,
  toggleItem,
  overrides,
  setOverride,
  setSectionTitle,
  resetAll,
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
          <textarea
            rows={3}
            className={inputCls}
            value={config.footer}
            onChange={e => update('footer', e.target.value)}
          />
        </Field>
      </div>

      <div className="card-diner p-5">
        <h3 className="font-heading text-lg text-obsidian-roast mb-3">Account Info</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Printed as its own separated block at the bottom of the sheet. Clear the text to remove it.
        </p>
        <Field label="Heading">
          <input
            className={inputCls}
            value={config.accountTitle ?? ''}
            onChange={e => update('accountTitle', e.target.value)}
          />
        </Field>
        <Field label="Text">
          <textarea
            rows={3}
            className={inputCls}
            value={config.accountInfo ?? ''}
            onChange={e => update('accountInfo', e.target.value)}
          />
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
          <input
            type="checkbox"
            checked={config.showDescriptions}
            onChange={e => update('showDescriptions', e.target.checked)}
          />
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
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-midnight-cherry"
          >
            <RotateCcw size={12} /> Reset edits
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Rename sections, items, or reprice for the printout only — your live online menu isn't touched.
        </p>

        <div className="space-y-5 max-h-[32rem] overflow-y-auto pr-1">
          {sections.map(section => (
            <div key={section.key}>
              <input
                className="w-full mb-2 px-2 py-1 font-heading text-sm text-midnight-cherry uppercase tracking-wider bg-transparent rounded border border-transparent hover:border-border focus:border-border"
                value={section.label}
                onChange={e => setSectionTitle(section.key, e.target.value)}
                aria-label={`Section heading for ${section.key}`}
              />
              <div className="space-y-2">
                {section.allItems.map(item => {
                  const hidden = hiddenIds.includes(item.id);
                  const ov = overrides[item.id] || {};
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
                          value={ov.name ?? item.name}
                          onChange={e => setOverride(item.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="w-20 px-2 py-1 text-sm rounded border border-border text-right"
                          value={ov.price ?? item.price ?? 0}
                          onChange={e => setOverride(item.id, 'price', e.target.value)}
                        />
                      </div>
                      {config.showDescriptions && (
                        <input
                          className="w-full mt-1 px-2 py-1 text-xs rounded border border-transparent hover:border-border bg-transparent text-muted-foreground"
                          placeholder="Description…"
                          value={ov.description ?? item.description ?? ''}
                          onChange={e => setOverride(item.id, 'description', e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}