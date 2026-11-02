// Build Cards for the in-store print builder (issue #148, addendum v2).
//
// Square owns the cards: membership is the Square category "Blend & Bliss", and
// every card's name, price, sizes, ingredient lines and topping lines come from
// that item's Square modifier groups. Nothing is seeded and nothing is invented
// here — this file maps the live MenuItem records for print, and stores only the
// crew's print-copy overrides in the browser (never the live menu, never Square).
export const BUILD_CARDS_STORAGE_KEY = 'flavorisle_build_cards_v1';
export const BLISS_CATEGORY = 'Blend & Bliss';
export const SKIP_ITEM_NAMES = ['Specialty Milkshakes'];

const DEFAULT_ACCENT = '#CC3300';
const DEFAULT_KICKER = 'MILKSHAKE';

const groupsOf = (modifiers) => (Array.isArray(modifiers) ? modifiers.filter(Boolean) : []);
const groupName = (group) => String(group?.name || '');

// Square names modifier options in its own casing ("DRIZZLE OF CARAMEL",
// "Gramham Cracker Crumble"). Only the first letter of each word is raised; the
// rest of every character stays exactly as Square has it.
export function titleCaseFirst(s) {
  return String(s || '').replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
}

// The item's ingredient group: named exactly "Ingredients"; else "What's in it";
// else any group whose name mentions ingredients.
export function findIngredientGroup(modifiers) {
  const groups = groupsOf(modifiers);
  return (
    groups.find(g => groupName(g).trim().toLowerCase() === 'ingredients') ||
    groups.find(g => /what['’]s in it/i.test(groupName(g))) ||
    groups.find(g => /ingredient/i.test(groupName(g))) ||
    null
  );
}

// The item's standard toppings group: its name mentions toppings AND every
// option is free. That price rule is what keeps paid add-on groups such as
// "ADD A TOPPING" (nuts, sprinkles, whipcream at $0.52) off the card.
export function findToppingsGroup(modifiers) {
  const groups = groupsOf(modifiers);
  return (
    groups.find(g => {
      if (!/topping/i.test(groupName(g))) return false;
      const options = Array.isArray(g?.modifiers) ? g.modifiers : [];
      return options.every(option => !Number(option?.price));
    }) || null
  );
}

export function findSizeGroup(modifiers) {
  return groupsOf(modifiers).find(g => /size/i.test(groupName(g))) || null;
}

// Square option order is the source order; the crew's saved order is applied on
// top of it, then any line they haven't touched keeps its Square position.
function applyLineOverrides(lines, order, hidden) {
  const remaining = new Map(lines.map(line => [line.id, line]));
  const ordered = [];
  (Array.isArray(order) ? order : []).forEach(id => {
    const line = remaining.get(id);
    if (line) {
      ordered.push(line);
      remaining.delete(id);
    }
  });
  lines.forEach(line => {
    if (remaining.has(line.id)) ordered.push(line);
  });
  const hiddenIds = new Set(Array.isArray(hidden) ? hidden : []);
  return ordered.map(line => ({ ...line, hidden: hiddenIds.has(line.id) }));
}

const optionLines = (group) =>
  (Array.isArray(group?.modifiers) ? group.modifiers : [])
    .filter(option => option && option.name)
    .map(option => ({ id: option.id || option.name, text: titleCaseFirst(option.name) }));

// Sizes print as Square has them: the option name verbatim, the price as the
// size's upcharge.
const sizeLines = (group) =>
  (Array.isArray(group?.modifiers) ? group.modifiers : [])
    .filter(option => option && option.name)
    .map(option => ({ label: option.name, upcharge: Number(option.price) || 0 }));

const skipSet = () => new Set(SKIP_ITEM_NAMES.map(name => String(name).trim().toLowerCase()));

// The card list, derived from the live menu items the page already loaded.
export function deriveBuildCards(items, overrides = {}) {
  const skip = skipSet();
  const kept = new Map();

  (Array.isArray(items) ? items : []).forEach(item => {
    if (!item || item.square_category !== BLISS_CATEGORY) return;
    if (skip.has(String(item.name || '').trim().toLowerCase())) return;
    const key = item.square_item_id || item.id;
    if (!key) return;
    // Two menu records can share one Square item; the one carrying the fuller
    // modifier list is the one Square actually keeps configured.
    const modifierCount = Array.isArray(item.modifiers) ? item.modifiers.length : 0;
    const current = kept.get(key);
    if (!current || modifierCount > current.modifierCount) kept.set(key, { item, modifierCount });
  });

  return [...kept.values()].map(({ item }) => {
    const key = item.square_item_id || item.id;
    const ov = (overrides && overrides[key]) || {};
    const toppingsGroup = findToppingsGroup(item.modifiers);

    return {
      key,
      name: item.name || '',
      print_name: ov.print_name || item.name || '',
      kicker: ov.kicker ?? DEFAULT_KICKER,
      tagline: ov.tagline ?? '',
      price: Number(item.price) || 0,
      sizes: sizeLines(findSizeGroup(item.modifiers)),
      in_shake: applyLineOverrides(
        optionLines(findIngredientGroup(item.modifiers)),
        ov.line_order?.in_shake,
        ov.hidden_lines?.in_shake,
      ),
      toppings: applyLineOverrides(
        optionLines(toppingsGroup),
        ov.line_order?.toppings,
        ov.hidden_lines?.toppings,
      ),
      // No standard toppings group means the build is served bare; the crew's
      // switch can force the same block when a group exists but shouldn't print.
      not_topped: ov.force_bare === true || !toppingsGroup,
      on_sheet: ov.off_sheet === true ? false : item.is_available !== false,
      accent_color: ov.accent_color || DEFAULT_ACCENT,
      house_portions: ov.house_portions || '',
    };
  });
}

// Print-copy overrides, keyed by square_item_id.
export function loadCardOverrides() {
  try {
    const raw = localStorage.getItem(BUILD_CARDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // One-time migration: the first Build Cards build stored an array of
    // hand-seeded cards under this key. Membership now comes from Square, so a
    // stale seeded array is discarded instead of carried forward.
    if (Array.isArray(parsed)) {
      localStorage.removeItem(BUILD_CARDS_STORAGE_KEY);
      return {};
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCardOverrides(overrides) {
  try {
    localStorage.setItem(BUILD_CARDS_STORAGE_KEY, JSON.stringify(overrides || {}));
  } catch {
    // Print-only edits: a full quota must not break the page.
  }
}