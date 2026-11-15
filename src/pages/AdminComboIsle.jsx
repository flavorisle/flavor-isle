// Combo Isle settings — the admin side of /combos (Wesley, Nov 15 2026).
//
// This page decides what the picker offers: which Square categories fill Main,
// Side and Drink, how many of an item make one box (two minis, one cheeseburger),
// which rows to hide because their category drags junk in, and whether a large
// milkshake may stand in for the large drink. The picker reads this record on
// every load, so a change here takes effect without a code change.
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import { itemCategoryKey } from '@/lib/menuCategory';
import { DEFAULT_COMBO_SETTING, COMBO_DISCOUNT_PERCENT, requiredQuantity, round2 } from '@/lib/comboIsle';

const ROLES = [
  { key: 'main_categories', label: 'Main', hint: 'Burgers, chicken, melts, sandwiches.' },
  { key: 'side_categories', label: 'Side', hint: 'Fries, tots, rings, munchies.' },
  { key: 'drink_categories', label: 'Drink', hint: 'The large drink in the box.' },
  { key: 'shake_categories', label: 'Milkshakes', hint: 'Offered when the shake substitution is on.' },
];

const keysOf = (item) =>
  [itemCategoryKey(item), item.display_category, item.square_category, item.category]
    .filter(Boolean)
    .map((k) => String(k).trim());

export default function AdminComboIsle() {
  const [items, setItems] = useState([]);
  const [setting, setSetting] = useState({ ...DEFAULT_COMBO_SETTING });
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [openRole, setOpenRole] = useState('main_categories');

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.MenuItem.filter({ is_available: true }, '-name', 500).catch(() => []),
      base44.entities.ComboIsleSetting.list('-updated_date', 5).catch(() => []),
    ])
      .then(([menuRows, savedRows]) => {
        if (!alive) return;
        setItems((menuRows || []).filter((i) => i && i.square_item_id));
        const saved = (savedRows || [])[0];
        if (saved) {
          setRecordId(saved.id);
          setSetting({ ...DEFAULT_COMBO_SETTING, ...saved });
        }
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Every category name the menu actually carries, so the tick lists are real.
  const allCategories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => keysOf(i).forEach((k) => set.add(k)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const toggleCategory = (key, category) => {
    setSetting((prev) => {
      const list = new Set(prev[key] || []);
      if (list.has(category)) list.delete(category);
      else list.add(category);
      return { ...prev, [key]: Array.from(list) };
    });
    setSaved('');
  };

  const setQuantity = (item, quantity) => {
    setSetting((prev) => {
      const rows = (prev.item_quantities || []).filter((r) => r && (r.menu_item_id ? r.menu_item_id !== item.id : String(r.name || '').toLowerCase() !== String(item.name).toLowerCase()));
      const next = Math.max(1, Math.floor(Number(quantity) || 1));
      rows.push({ menu_item_id: item.id, name: item.name, quantity: next });
      return { ...prev, item_quantities: rows };
    });
    setSaved('');
  };

  const toggleHidden = (item) => {
    setSetting((prev) => {
      const hidden = new Set(prev.hidden_item_ids || []);
      if (hidden.has(item.id)) hidden.delete(item.id);
      else hidden.add(item.id);
      return { ...prev, hidden_item_ids: Array.from(hidden) };
    });
    setSaved('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        is_active: setting.is_active !== false,
        main_categories: setting.main_categories || [],
        side_categories: setting.side_categories || [],
        drink_categories: setting.drink_categories || [],
        shake_categories: setting.shake_categories || [],
        allow_shake_substitution: setting.allow_shake_substitution !== false,
        hidden_item_ids: setting.hidden_item_ids || [],
        item_quantities: setting.item_quantities || [],
      };
      if (recordId) await base44.entities.ComboIsleSetting.update(recordId, payload);
      else {
        const created = await base44.entities.ComboIsleSetting.create(payload);
        setRecordId(created?.id || null);
      }
      setSaved(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    } catch (e) {
      setSaved('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  // The items each role currently offers, and which rows are junk to hide.
  const itemsInRole = (key) => {
    const cats = new Set((setting[key] || []).map((c) => String(c).trim().toLowerCase()));
    return items.filter((i) => keysOf(i).some((k) => cats.has(k.toLowerCase())));
  };

  const hidden = new Set(setting.hidden_item_ids || []);
  const previewMain = itemsInRole('main_categories').filter((i) => !hidden.has(i.id));
  const previewSide = itemsInRole('side_categories').filter((i) => !hidden.has(i.id));
  const previewDrink = itemsInRole('drink_categories').filter((i) => !hidden.has(i.id));
  const previewShake = itemsInRole('shake_categories').filter((i) => !hidden.has(i.id));
  const ready = previewMain.length > 0 && previewSide.length > 0 && previewDrink.length > 0;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Combo Isle</h1>
            <p className="text-sm text-muted-foreground mt-1">
              What the picker offers. The 9% box price is applied automatically and is never shown as a discount.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-muted-foreground">Saved {saved}</span>}
            <button onClick={save} disabled={saving} className="btn-cherry chrome-hover px-5 py-2.5 text-sm font-heading disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading the menu…</p>
        ) : (
          <>
            <div className={`rounded-2xl p-4 mb-6 ${ready ? 'bg-patina-mint/10 border border-patina-mint/30' : 'bg-smashie-yellow/20 border border-smashie-yellow/50'}`}>
              <p className="text-sm font-semibold text-obsidian-roast">
                {ready
                  ? `Ready: ${previewMain.length} mains, ${previewSide.length} sides, ${previewDrink.length} drinks${setting.allow_shake_substitution !== false ? `, ${previewShake.length} shakes on the substitution` : ''}.`
                  : 'Not ready: Main, Side and Drink each need at least one item. Until then the builder shows its off state instead of a teaser.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {ROLES.map((role) => {
                const chosen = setting[role.key] || [];
                const open = openRole === role.key;
                return (
                  <div key={role.key} className="bg-white rounded-2xl border border-border p-4">
                    <button onClick={() => setOpenRole(open ? '' : role.key)} className="w-full flex items-start justify-between gap-3 text-left">
                      <div>
                        <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{role.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{role.hint}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{chosen.length} chosen</span>
                    </button>
                    {chosen.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {chosen.map((c) => (
                          <span key={c} className="text-[11px] bg-muted px-2 py-1 rounded-full">{c}</span>
                        ))}
                      </div>
                    )}
                    {open && (
                      <div className="mt-3 max-h-56 overflow-y-auto space-y-1 border-t border-border pt-2">
                        {allCategories.map((cat) => {
                          const on = chosen.some((c) => String(c).toLowerCase() === cat.toLowerCase());
                          return (
                            <button
                              key={cat}
                              onClick={() => toggleCategory(role.key, cat)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left ${on ? 'bg-midnight-cherry/10 text-midnight-cherry font-semibold' : 'hover:bg-muted'}`}
                            >
                              <span className="truncate">{cat}</span>
                              <span>{on ? '✓' : ''}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-border p-4 mb-8">
              <label className="flex items-center justify-between gap-4">
                <span>
                  <span className="font-heading text-sm text-obsidian-roast">Large milkshake in place of the large drink</span>
                  <span className="block text-xs text-muted-foreground mt-1">
                    {setting.allow_shake_substitution !== false
                      ? `On — ${previewShake.length} shakes offered from the Milkshakes categories.`
                      : 'Off — the drink column offers only Drinks categories.'}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={setting.allow_shake_substitution !== false}
                  onChange={(e) => { setSetting((prev) => ({ ...prev, allow_shake_substitution: e.target.checked })); setSaved(''); }}
                  className="w-5 h-5"
                />
              </label>
            </div>

            {[
              { key: 'main_categories', label: 'Main items', rows: itemsInRole('main_categories') },
              { key: 'side_categories', label: 'Side items', rows: itemsInRole('side_categories') },
              { key: 'drink_categories', label: 'Drink items', rows: itemsInRole('drink_categories') },
            ].map((section) => (
              <div key={section.key} className="bg-white rounded-2xl border border-border p-4 mb-4">
                <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-1">{section.label}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  How many of an item make one box, and whether it shows in the picker at all.
                </p>
                {section.rows.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No items — tick a category above.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {section.rows.sort((a, b) => (a.price || 0) - (b.price || 0)).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-obsidian-roast truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${round2(item.price || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            In a box
                            <select
                              value={requiredQuantity(setting, item)}
                              onChange={(e) => setQuantity(item, e.target.value)}
                              className="border border-border rounded-lg px-2 py-1 text-xs"
                            >
                              {[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={!hidden.has(item.id)}
                              onChange={() => toggleHidden(item)}
                              className="w-4 h-4"
                            />
                            Show
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <p className="text-xs text-muted-foreground">
              A complete box is charged {100 - COMBO_DISCOUNT_PERCENT}% of its three Square prices. Remove an item and the box ends:
              the rest sell as singles at full price. Happy Hour never stacks on a box.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
