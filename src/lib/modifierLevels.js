// Issue #324 — the Lite / Regular / Extra amount on a modifier tile.
//
// A modifier option can carry a child list that holds its amount ("Preferences
// on Sauce" with Lite / Regular / Extra, or Square's "- / + Flavors" list).
// These helpers find that list and turn a tapped segment into the nested
// selection the cart already prices and the kitchen ticket already prints, so
// moving from a pill to a tile changes nothing downstream.
const norm = (s) => String(s || '').trim().toLowerCase();
const LITE = /^(lite|light)$/;
const EXTRA = /^extra$/;
const PREF_ONLY = new Set(['lite', 'light', 'regular', 'normal', 'extra']);

// The child list that carries this option's amount, or null when it has none.
export function levelChildList(mod) {
  const lists = mod?.child_modifier_lists || [];
  const names = (list) => (list.modifiers || []).map((m) => norm(m.name));

  // A list holding nothing but level words is the amount control.
  const pref = lists.find((list) => {
    const n = names(list);
    return n.length > 0 && n.every((x) => PREF_ONLY.has(x));
  });
  if (pref) return pref;

  // Otherwise any list that offers both a Lite and an Extra option.
  return lists.find((list) => {
    const n = names(list);
    return n.some((x) => LITE.test(x)) && n.some((x) => EXTRA.test(x));
  }) || null;
}

// An ice cream base ("VANILLA ICE CREAM", "SWIRL ICE CREAM") is a choice of
// base, never an amount, so it never carries the strip even if a list is there.
const BASE_OPTION = /\bice cream\b/i;

export function supportsLevels(mod) {
  if (BASE_OPTION.test(String(mod?.name || ''))) return false;
  return !!levelChildList(mod);
}

// 'lite' | 'extra' | null, read from a nested selection object.
export function levelFromNested(nested) {
  if (!nested || typeof nested !== 'object') return null;
  for (const entry of Object.values(nested)) {
    const n = norm(entry?.name);
    if (LITE.test(n)) return 'lite';
    if (EXTRA.test(n)) return 'extra';
  }
  return null;
}

// The nested selection for a level: always the REAL Square option (its catalog
// id and price), so the order reports the modifier to Square instead of an
// ad-hoc text line. An option whose Square list has no Lite/Extra records
// nothing at all — a level Square does not define is never invented here.
export function nestedForLevel(mod, level) {
  if (!level || level === 'reg') return {};
  const list = levelChildList(mod);
  const want = level === 'lite' ? LITE : EXTRA;
  const opt = (list?.modifiers || []).find((m) => want.test(norm(m.name)));
  if (!list || !opt) return {};
  return { [list.name]: { id: opt.id, name: opt.name, price: Number(opt.price) || 0 } };
}