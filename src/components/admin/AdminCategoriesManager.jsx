import React, { useEffect, useState } from 'react';
import { EyeOff, Eye, ChevronUp, ChevronDown, Plus, Pencil, Check, X, Layers } from 'lucide-react';
import { getMenuSetting, setHiddenCategories, setCategorySortOrder, setCategoryRenames } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories } from '@/lib/menuCategory';

// Self-contained Categories tab: reorder, rename, hide/show, and add custom
// categories. Items are passed in so we can derive the full set of category keys
// (Square + custom via display_category) and show counts + rename targets.
export default function AdminCategoriesManager({ items = [] }) {
  const [hidden, setHidden] = useState([]);
  const [order, setOrder] = useState([]);
  const [renames, setRenames] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        setHidden(s.hidden_categories || []);
        setOrder(s.category_sort_order || []);
        setRenames(s.category_renames || {});
      })
      .catch(() => {});
  }, []);

  // All category keys present in the menu (effective keys, including custom).
  const allKeys = Array.from(new Set(items.map(itemCategoryKey)));
  const orderedKeys = sortCategories(allKeys, order);

  const move = async (key, dir) => {
    const idx = orderedKeys.indexOf(key);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= orderedKeys.length) return;
    const next = [...orderedKeys];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setOrder(next);
    try { await setCategorySortOrder(next); } catch (e) { /* ignore */ }
  };

  const toggleVisible = async (key) => {
    const next = hidden.includes(key) ? hidden.filter(c => c !== key) : [...hidden, key];
    setHidden(next);
    try { await setHiddenCategories(next); } catch (e) { /* ignore */ }
  };

  const startRename = (key) => {
    setEditingKey(key);
    setRenameDraft(renames[key] || '');
  };

  const saveRename = async (key) => {
    const next = { ...renames };
    const draft = renameDraft.trim();
    if (draft && draft !== key) next[key] = draft;
    else delete next[key];
    setRenames(next);
    setEditingKey(null);
    setSaving(true);
    try { await setCategoryRenames(next); } finally { setSaving(false); }
  };

  const addCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    // Custom categories are tracked via the sort order so they appear even before
    // items are assigned; once an item's display_category is set to this name it
    // also shows up live on the menu.
    if (!order.includes(name) && !allKeys.includes(name)) {
      const next = [...order, name];
      setOrder(next);
      try { await setCategorySortOrder(next); } catch (e) { /* ignore */ }
    }
    setCustomName('');
  };

  return (
    <div className="space-y-6">
      <div className="card-diner p-6">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={18} className="text-midnight-cherry" />
          <h2 className="font-heading text-lg text-obsidian-roast">Categories</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Reorder how sections appear on the menu, rename any category (Square or custom), hide sections you don't want shown, and create your own custom categories below.
        </p>

        {orderedKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Sync from Square first, or create a custom category below.</p>
        ) : (
          <div className="space-y-2">
            {orderedKeys.map((key, idx) => {
              const count = items.filter(i => itemCategoryKey(i) === key).length;
              const isHidden = hidden.includes(key);
              return (
                <div key={key} className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
                  <div className="flex flex-col">
                    <button onClick={() => move(key, 'up')} disabled={idx === 0}
                      className="p-0.5 text-muted-foreground hover:text-obsidian-roast disabled:opacity-30 disabled:cursor-not-allowed" title="Move up">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => move(key, 'down')} disabled={idx === orderedKeys.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-obsidian-roast disabled:opacity-30 disabled:cursor-not-allowed" title="Move down">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground font-heading w-5 text-center">{idx + 1}</span>

                  <div className="flex-1 min-w-0">
                    {editingKey === key ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={renameDraft}
                          onChange={e => setRenameDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(key); if (e.key === 'Escape') setEditingKey(null); }}
                          placeholder={key}
                          className="flex-1 px-3 py-1.5 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
                        />
                        <button onClick={() => saveRename(key)} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200" title="Save">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingKey(null)} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200" title="Cancel">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-sm text-obsidian-roast truncate">{categoryLabel(key, renames)}</span>
                        {renames[key] && <span className="text-xs text-muted-foreground truncate">({key})</span>}
                        <button onClick={() => startRename(key)} className="p-1 rounded-lg text-muted-foreground hover:bg-white hover:text-obsidian-roast" title="Rename">
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{count} item{count !== 1 ? 's' : ''}{isHidden ? ' · hidden' : ''}</p>
                  </div>

                  <button onClick={() => toggleVisible(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${isHidden ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                    {isHidden ? 'Hidden' : 'Visible'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create custom category */}
      <div className="card-diner p-6">
        <h2 className="font-heading text-lg text-obsidian-roast mb-2">Create a Custom Category</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add a brand-new section (like a unique burger grouping). Once created, open the Menu Items tab and set any item's category to this name to place it here.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Signature Hand-Patted Burgers"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
            className="flex-1 px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
          <button onClick={addCustom} disabled={!customName.trim() || saving}
            className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-50">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}