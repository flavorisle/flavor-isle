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

// The sheet itself is a crew setting and lives in the same override record as
// the per-card print copy: paper size, cards per page, and the print order.
// All sizes are measured at 150 px/in, the unit the printed build is drawn in.
export const PAPER_OPTIONS = [
  { id: 'letter', label: '8.5 × 11', width: 1275, height: 1650, header: 120, spec: 230, perPage: [1, 2, 3] },
  { id: 'tabloid', label: '11 × 17', width: 1650, height: 2550, header: 150, spec: 300, perPage: [1, 2, 3, 4, 8] },
];
export const DEFAULT_PAPER = 'letter';
export const DEFAULT_PER_PAGE = 3;

export function paperSpec(paper) {
  return PAPER_OPTIONS.find(option => option.id === paper) || PAPER_OPTIONS[0];
}

// Cards per page as the chosen paper allows: 8 exists only on 11 × 17.
export function perPageFor(paper, perPage) {
  const spec = paperSpec(paper);
  const wanted = Number(perPage) || DEFAULT_PER_PAGE;
  return spec.perPage.includes(wanted) ? wanted : DEFAULT_PER_PAGE;
}

// The sheet settings, read out of the same override record the cards live in.
export function sheetSettings(overrides = {}) {
  return {
    paper: overrides?.paper === 'tabloid' ? 'tabloid' : DEFAULT_PAPER,
    perPage: perPageFor(overrides?.paper, overrides?.perPage),
    order: Array.isArray(overrides?.order) ? overrides.order : [],
  };
}

// Print order: the saved order first, any card Square has added since appends at
// the end. Same idea as the line ordering above.
export function orderCards(cards, order) {
  const remaining = new Map((Array.isArray(cards) ? cards : []).map(card => [card.key, card]));
  const ordered = [];
  (Array.isArray(order) ? order : []).forEach(key => {
    const card = remaining.get(key);
    if (card) {
      ordered.push(card);
      remaining.delete(key);
    }
  });
  remaining.forEach(card => ordered.push(card));
  return ordered;
}

const groupsOf = (modifiers) => (Array.isArray(modifiers) ? modifiers.filter(Boolean) : []);
const groupName = (group) => String(group?.name || '');

// Square names modifier options in its own casing ("DRIZZLE OF CARAMEL",
// "Gramham Cracker Crumble"). Only the first letter of each word is raised; the
// rest of every character stays exactly as Square has it.
export function titleCaseFirst(s) {
  return String(s || '').replace(/\S+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
}

// Every ingredient group the item has: Square cards often carry more than one
// ("Banana Split Main Ingredient" next to "Banana Split Bliss Ingredients"), and
// each one holds real recipe lines, so all of them print.
export function findIngredientGroups(modifiers) {
  const groups = groupsOf(modifiers);
  const named = groups.filter(g => /ingredient/i.test(groupName(g)));
  if (named.length) return named;
  return groups.filter(g => /what['’]s in it/i.test(groupName(g)));
}

// The item's standard toppings: the first group whose name says toppings AND
// that has a free option, limited to those free options. A group that also
// sells add-ons (nuts, sprinkles at $0.52) still prints the house topping that
// comes with the shake, and a paid-only group like "ADD A TOPPING" prints
// nothing at all.
export function findToppingsGroup(modifiers) {
  const groups = groupsOf(modifiers).filter(g => /topping/i.test(groupName(g)));
  for (const group of groups) {
    const free = (Array.isArray(group?.modifiers) ? group.modifiers : []).filter(option => !Number(option?.price));
    if (free.length) return { ...group, modifiers: free };
  }
  return null;
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

// Lines from one or more Square groups, deduped by wording so a line Square
// repeats across groups prints once.
const optionLines = (groups) => {
  const seen = new Set();
  const lines = [];
  (Array.isArray(groups) ? groups : [groups]).filter(Boolean).forEach(group => {
    (Array.isArray(group?.modifiers) ? group.modifiers : []).forEach(option => {
      if (!option || !option.name) return;
      const text = titleCaseFirst(option.name);
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      lines.push({ id: option.id || option.name, text });
    });
  });
  return lines;
};

// Crew additions typed into the editor. They print after the Square lines and
// live only in the print overrides — Square and the online menu never see them.
const customLines = (lines) =>
  (Array.isArray(lines) ? lines : [])
    .filter(line => line && String(line.text || '').trim())
    .map(line => ({ id: line.id || line.text, text: String(line.text).trim() }));

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
        optionLines(findIngredientGroups(item.modifiers)),
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
      extra_in: customLines(ov.extra_in),
      extra_top: customLines(ov.extra_top),
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