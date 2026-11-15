// Combo Isle settings — the admin side of /combos (Wesley, Nov 15 2026, plan v9).
//
// Named combo types (Burgers, Chicken, Sandwiches), each with its own main
// categories; sides, drinks and milkshakes are the shared set every type inherits.
// This page also decides how many of an item make one box (two minis, one
// cheeseburger) and which rows the picker hides. The 9% box price is applied by
// the picker and the server, never here, and never shown as a discount.
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import CategoryChips from '@/components/admin/combo/CategoryChips';
import ComboTypeCard from '@/components/admin/combo/ComboTypeCard';
import BoxItemList from '@/components/admin/combo/BoxItemList';
import { DEFAULT_COMBO_SETTING, cleanTypeName, itemsForRole, typeCategories } from '@/lib/comboIsle';

const MINI_RE = /^mini\b/i;
const newTypeId = () => `type-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const withMiniDefaults = (rows, menu) => {
  const list = (rows || []).filter(Boolean).map((r) => ({
    menu_item_id: r.menu_item_id,
    name: r.name,
    quantity: Number(r.quantity) || 1,
  }));
  (menu || []).forEach((item) => {
    if (!MINI_RE.test(String(item.name || ''))) return;
    const has = list.some((r) =>
      (r.menu_item_id && r.menu_item_id === item.id) ||
      (r.name && String(r.name).toLowerCase() === String(item.name).toLowerCase()));
    if (!has) list.push({ menu_item_id: item.id, name: item.name, quantity: 2 });
  });
  return list;
};

const draftFrom = (saved, menu) => {
  const base = { ...DEFAULT_COMBO_SETTING, ...(saved || {}) };
  return {
    is_active: base.is_active !== false,
    combo_types: (Array.isArray(base.combo_types) ? base.combo_types : [])
      .map((t, i) => ({
        id: String(t.id || `type-${i}`),
        name: String(t.name || ''),
        enabled: t.enabled !== false,
        order: Number.isFinite(Number(t.order)) ? Number(t.order) : i,
        main_categories: t.main_categories || [],
        side_categories: t.side_categories || [],
        drink_categories: t.drink_categories || [],
        shake_categories: t.shake_categories || [],
      }))
      .sort((a, b) => a.order - b.order),
    main_categories: base.main_categories || [],
    side_categories: base.side_categories || [],
    drink_categories: base.drink_categories || [],
    shake_categories: base.shake_categories || [],
    allow_shake_substitution: base.allow_shake_substitution !== false,
    hidden_item_ids: base.hidden_item_ids || [],
    item_quantities: withMiniDefaults(base.item_quantities, menu),
    show_combo_name_on_ticket: base.show_combo_name_on_ticket === true,
  };
};

const toPayload = (d) => ({
  is_active: d.is_active !== false,
  combo_types: (d.combo_types || []).map((t, i) => ({
    id: t.id,
    name: cleanTypeName(t.name),
    enabled: t.enabled !== false,
    order: i,
    main_categories: t.main_categories || [],
    side_categories: t.side_categories || [],
    drink_categories: t.drink_categories || [],
    shake_categories: t.shake_categories || [],
  })),
  main_categories: d.main_categories || [],
  side_categories: d.side_categories || [],
  drink_categories: d.drink_categories || [],
  shake_categories: d.shake_categories || [],
  allow_shake_substitution: d.allow_shake_substitution !== false,
  hidden_item_ids: d.hidden_item_ids || [],
  item_quantities: d.item_quantities || [],
  show_combo_name_on_ticket: d.show_combo_name_on_ticket === true,
});

export default function AdminComboIsle() {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [savedJson, setSavedJson] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.MenuItem.filter({ is_available: true }, '-name', 500).catch(() => []),
      base44.entities.ComboIsleSetting.list('-updated_date', 5).catch(() => []),
    ])
      .then(([menuRows, savedRows]) => {
        if (!alive) return;
        const menu = (menuRows || []).filter((i) => i && i.square_item_id);
        const saved = (savedRows || [])[0] || null;
        if (saved?.id) setRecordId(saved.id);
        const next = draftFrom(saved, menu);
        setItems(menu);
        setDraft(next);
        setSavedJson(JSON.stringify(toPayload(next)));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Every category the synced menu actually carries, for the chip pickers.
  const categoryOptions = useMemo(() => {
    const set = new Set();
    items.forEach((i) => [i.square_category, i.display_category, i.category]
      .filter(Boolean)
      .forEach((c) => set.add(String(c).trim())));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const payload = draft ? toPayload(draft) : null;
  const dirty = Boolean(payload) && JSON.stringify(payload) !== savedJson;

  const blockReason = useMemo(() => {
    if (!draft) return '';
    const types = draft.combo_types || [];
    if (types.some((t) => !cleanTypeName(t.name))) return 'Name is required';
    if (types.some((t) => (t.main_categories || []).filter(Boolean).length === 0)) {
      return 'Name the combo and pick at least one main category';
    }
    return '';
  }, [draft]);

  const groupTypes = useMemo(() => {
    const raw = (draft?.combo_types || []).map((t) => ({
      ...t,
      name: cleanTypeName(t.name) || 'Untitled combo',
    }));
    if (raw.length) return raw;
    return [{
      id: 'default',
      name: 'Combo Isle',
      enabled: true,
      main_categories: draft?.main_categories || [],
      side_categories: draft?.side_categories || [],
      drink_categories: draft?.drink_categories || [],
      shake_categories: draft?.shake_categories || [],
    }];
  }, [draft]);

  const update = (patch) => { setDraft((d) => ({ ...d, ...patch })); setSaveError(''); };
  const updateType = (id, patch) =>
    setDraft((d) => ({
      ...d,
      combo_types: (d.combo_types || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));

  const addType = () =>
    setDraft((d) => ({
      ...d,
      combo_types: [...(d.combo_types || []), {
        id: newTypeId(),
        name: '',
        enabled: true,
        order: (d.combo_types || []).length,
        main_categories: [],
        side_categories: [],
        drink_categories: [],
        shake_categories: [],
      }],
    }));

  const duplicateType = (type) =>
    setDraft((d) => ({
      ...d,
      combo_types: [...(d.combo_types || []), {
        ...type,
        id: newTypeId(),
        name: cleanTypeName(`Copy of ${type.name}`),
        enabled: true,
      }],
    }));

  const deleteType = (id) =>
    setDraft((d) => ({ ...d, combo_types: (d.combo_types || []).filter((t) => t.id !== id) }));

  const moveType = (id, direction) =>
    setDraft((d) => {
      const list = [...(d.combo_types || [])];
      const from = list.findIndex((t) => t.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= list.length) return d;
      [list[from], list[to]] = [list[to], list[from]];
      return { ...d, combo_types: list };
    });

  const quantityOf = (item) => {
    const rows = (draft?.item_quantities || []).filter(Boolean);
    const hit = rows.find((r) => r.menu_item_id && r.menu_item_id === item.id)
      || rows.find((r) => r.name && String(r.name).toLowerCase() === String(item.name).toLowerCase());
    if (hit) return Math.max(1, Math.floor(Number(hit.quantity) || 1));
    return MINI_RE.test(String(item.name || '')) ? 2 : 1;
  };

  const setQuantity = (item, value) =>
    setDraft((d) => {
      const quantity = Math.min(9, Math.max(1, Math.floor(Number(value) || 1)));
      const rows = (d.item_quantities || []).filter((r) => r && !(
        r.menu_item_id
          ? r.menu_item_id === item.id
          : String(r.name || '').toLowerCase() === String(item.name).toLowerCase()
      ));
      rows.push({ menu_item_id: item.id, name: item.name, quantity });
      return { ...d, item_quantities: rows };
    });

  const toggleHidden = (item) =>
    setDraft((d) => {
      const hidden = new Set(d.hidden_item_ids || []);
      if (hidden.has(item.id)) hidden.delete(item.id);
      else hidden.add(item.id);
      return { ...d, hidden_item_ids: Array.from(hidden) };
    });

  const mainCountFor = (type) =>
    itemsForRole(items, { ...draft, main_categories: typeCategories(draft, type, 'main') }, 'main').length;

  const save = async () => {
    if (blockReason) { setSaveError(blockReason); return; }
    setSaving(true);
    setSaveError('');
    try {
      const body = toPayload(draft);
      if (recordId) {
        await base44.entities.ComboIsleSetting.update(recordId, body);
      } else {
        const created = await base44.entities.ComboIsleSetting.create(body);
        setRecordId(created?.id || null);
      }
      setSavedJson(JSON.stringify(body));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setSaveError('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  const types = draft?.combo_types || [];

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28">
        <div className="mb-6">
          <h1 className="font-heading text-3xl text-obsidian-roast">Combo Isle</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The combos the customer picks from, and what goes in a box. The 9% box price is applied
            automatically and is never shown as a discount.
          </p>
        </div>

        {loading || !draft ? (
          <p className="text-sm text-muted-foreground">Loading the menu…</p>
        ) : (
          <>
            {/* Combo types */}
            <section className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="font-heading text-lg text-obsidian-roast">Combo types</p>
                  <p className="text-[11px] text-muted-foreground">
                    Each type is one pill on /combos. Sides, drinks and milkshakes come from the shared set below.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {types.map((type, index) => (
                  <ComboTypeCard
                    key={type.id}
                    type={type}
                    index={index}
                    total={types.length}
                    options={categoryOptions}
                    allTypes={types}
                    mainCount={mainCountFor(type)}
                    onChange={(patch) => updateType(type.id, patch)}
                    onMove={(direction) => moveType(type.id, direction)}
                    onDuplicate={() => duplicateType(type)}
                    onDelete={() => deleteType(type.id)}
                  />
                ))}
              </div>

              <button
                onClick={addType}
                className="mt-3 w-full rounded-2xl border border-dashed border-border py-3 text-sm font-heading text-muted-foreground hover:border-midnight-cherry/50 hover:text-midnight-cherry"
              >
                + Add combo type
              </button>

              {types.length === 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  No combo types: /combos falls back to one combo named Combo Isle built from the shared
                  categories below.
                </p>
              )}
            </section>

            {/* Shared categories */}
            <section className="bg-white rounded-2xl border border-border p-4 mb-8">
              <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">What every combo includes</p>
              <p className="text-[11px] text-muted-foreground mb-4">
                Any type that leaves its own list empty inherits these.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CategoryChips
                  label="Sides"
                  categories={draft.side_categories}
                  options={categoryOptions}
                  onChange={(next) => update({ side_categories: next })}
                />
                <CategoryChips
                  label="Drinks"
                  categories={draft.drink_categories}
                  options={categoryOptions}
                  onChange={(next) => update({ drink_categories: next })}
                />
                <CategoryChips
                  label="Milkshakes"
                  hint="The large-shake stand-in for the drink."
                  categories={draft.shake_categories}
                  options={categoryOptions}
                  onChange={(next) => update({ shake_categories: next })}
                />
              </div>
              <label className="flex items-center justify-between gap-4 mt-4 pt-3 border-t border-border">
                <span className="text-xs text-obsidian-roast">Offer a large milkshake in place of the large drink</span>
                <input
                  type="checkbox"
                  checked={draft.allow_shake_substitution !== false}
                  onChange={(e) => update({ allow_shake_substitution: e.target.checked })}
                  className="w-5 h-5"
                />
              </label>
            </section>

            {/* Items in a box */}
            <section className="mb-8">
              <BoxItemList
                items={items}
                setting={draft}
                types={groupTypes}
                quantityOf={quantityOf}
                onQuantity={setQuantity}
                hiddenIds={draft.hidden_item_ids}
                onToggleShow={toggleHidden}
              />
            </section>

            {/* Editor-only: kitchen ticket naming */}
            <section className="bg-white rounded-2xl border border-border p-4 mb-4">
              <label className="flex items-start justify-between gap-4">
                <span>
                  <span className="text-xs font-semibold text-obsidian-roast">Show the combo name on the kitchen ticket</span>
                  <span className="block text-[11px] text-muted-foreground mt-1">
                    Off prints Box 1 — Cheeseburger. On prints Box 1 — Burgers — Cheeseburger.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={draft.show_combo_name_on_ticket === true}
                  onChange={(e) => update({ show_combo_name_on_ticket: e.target.checked })}
                  className="w-5 h-5 mt-0.5"
                />
              </label>
            </section>
          </>
        )}

        {/* Sticky action bar */}
        {draft && (
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 mt-6 border-t border-border bg-white/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {saveError ? (
                <p className="text-xs text-midnight-cherry font-semibold">{saveError}</p>
              ) : blockReason ? (
                <p className="text-xs text-midnight-cherry font-semibold">{blockReason}</p>
              ) : justSaved ? (
                <p className="text-xs font-heading uppercase tracking-widest text-patina-mint">Saved</p>
              ) : dirty ? (
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Unsaved changes</p>
              ) : null}
            </div>
            <button
              onClick={save}
              disabled={saving || Boolean(blockReason)}
              className="btn-cherry chrome-hover px-6 py-2.5 text-sm font-heading disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}