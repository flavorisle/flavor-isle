import React, { useEffect, useMemo, useState } from 'react';
import { getMenuSetting, setModifierOverrides } from '@/lib/menuSettings';
import { collectModifierGroups, getModifierOverrides, overrideCount, EMPTY_OVERRIDES } from '@/lib/modifierOverrides';
import ModifierGroupCard from './ModifierGroupCard';

// Admin control over every modifier group on the menu — parent groups and the
// nested child lists their options reveal. Saves straight to the store's menu
// settings, so the online menu and checkout pick the changes up on the next
// page load without touching the Square catalog.
export default function AdminModifierManager({ items }) {
  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMenuSetting()
      .then((setting) => { if (!cancelled) setOverrides(getModifierOverrides(setting)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const groups = useMemo(() => collectModifierGroups(items), [items]);
  const byKey = useMemo(() => new Map(groups.map((g) => [g.key, g])), [groups]);

  const persist = async (next) => {
    setOverrides(next);
    setSaving(true);
    setSaveError('');
    try {
      await setModifierOverrides(next);
    } catch (e) {
      setSaveError('Could not save that change — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleIn = (listName, id) => {
    const current = overrides[listName] || [];
    persist({
      ...overrides,
      [listName]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const setPrice = (id, value) => {
    const prices = { ...overrides.option_prices };
    if (value == null) delete prices[id];
    else prices[id] = value;
    persist({ ...overrides, option_prices: prices });
  };

  const q = search.trim().toLowerCase();
  const matched = q
    ? groups.filter((g) => g.name.toLowerCase().includes(q) || g.options.some((o) => o.name.toLowerCase().includes(q)))
    : groups;
  // Parents at the top level; while searching, show matched groups of either
  // kind so a nested child list can be found directly.
  const topGroups = q ? matched : matched.filter((g) => g.direct);
  const active = overrideCount(overrides);

  return (
    <div className="space-y-6">
      <div className="card-diner p-6">
        <h2 className="font-heading text-lg text-obsidian-roast mb-2">Modifier controls</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Hide a whole group or a single option from customers, mark an option sold out, or set a site price that
          overrides Square. Parent groups and their nested child lists are both covered — nested lists appear under
          the option that reveals them.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search groups and options…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
          <span className="text-xs text-muted-foreground">
            {active} override{active === 1 ? '' : 's'} active
          </span>
          {saving && <span className="text-xs text-patina-mint font-heading">Saving…</span>}
          {saveError && <span className="text-xs text-destructive">{saveError}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Price overrides apply to the item price and to checkout; hiding and sold-out shape what customers can pick.
          Modifier groups come from Square — use “Sync from Square” to pull in new ones.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : topGroups.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {groups.length === 0 ? 'No modifier groups found. Sync from Square to pull them in.' : 'No groups match that search.'}
        </p>
      ) : (
        <div className="space-y-3">
          {topGroups.map((group) => (
            <ModifierGroupCard
              key={group.key}
              group={group}
              byKey={byKey}
              overrides={overrides}
              onToggleGroupHidden={(key) => toggleIn('hidden_groups', key)}
              onToggleOptionHidden={(id) => toggleIn('hidden_options', id)}
              onToggleSoldOut={(id) => toggleIn('sold_out_options', id)}
              onSetPrice={setPrice}
            />
          ))}
        </div>
      )}
    </div>
  );
}