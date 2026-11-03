// Print sheet settings are local; every card's content comes directly from Square.
import { modifierGroups, countCardModifiers } from '@/lib/buildCardContent';
export const BUILD_CARDS_STORAGE_KEY = 'flavorisle_build_cards_v1';
export const BLISS_CATEGORY = 'Blend & Bliss';
export const SKIP_ITEM_NAMES = ['Specialty Milkshakes'];

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

// The source is the dedicated Square response, never the online-menu projection.
// Keep existing card inclusion / sheet preferences, but never apply content overrides.
export function deriveBuildCards(items, overrides = {}) {
  return (items || [])
    .filter(item => item.square_category === BLISS_CATEGORY && !SKIP_ITEM_NAMES.includes(item.name))
    .map(item => {
      const key = item.square_item_id;
      const groups = modifierGroups(item.modifiers);
      return {
        key, name: item.name, print_name: item.name,
        sizes: item.variations || [], modifier_groups: groups,
        modifier_count: countCardModifiers(groups),
        on_sheet: overrides[key]?.off_sheet !== true && item.is_available !== false,
      };
    });
}

// Existing saved content overrides are intentionally ignored by deriveBuildCards.
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