// Build Cards for the in-store print builder (issue #148). Print-only data:
// stored in this browser, never written to the live menu or an entity.
export const BUILD_CARDS_STORAGE_KEY = 'flavorisle_build_cards_v1';

const seedSizes = () => [
  { label: '14 oz', upcharge: 0 },
  { label: '20 oz', upcharge: 0.5 },
];

// The three fall builds exactly as approved in issue #148 section 5.
export const DEFAULT_BUILD_CARDS = [
  {
    id: 'pumpkin-pie-bliss',
    name: 'Pumpkin Pie Bliss',
    kicker: 'MILKSHAKE',
    tagline: 'Pumpkin pie syrup and graham crumble, thick like a slice.',
    price: 5.99,
    sizes: seedSizes(),
    in_shake: [
      { text: 'Pumpkin pie syrup', optional: false },
      { text: 'Caramel', optional: false },
      { text: 'Graham cracker crumble', optional: false },
      { text: 'Marshmallow cream', optional: true },
    ],
    toppings: [
      { text: 'Whipped cream', optional: false },
      { text: 'Graham cracker crumble', optional: false },
    ],
    not_topped: false,
    house_portions: '',
    accent_color: '#D2691E',
    order: 1,
  },
  {
    id: 'smores-bliss',
    name: "S'mores Bliss",
    kicker: 'MILKSHAKE',
    tagline: 'Campfire in a cup: hot fudge, marshmallow, graham crunch.',
    price: 5.99,
    sizes: seedSizes(),
    in_shake: [
      { text: 'Hot fudge', optional: false },
      { text: 'Marshmallow fluff', optional: false },
    ],
    toppings: [
      { text: 'Whipped cream', optional: false },
      { text: 'Graham cracker pieces', optional: false },
      { text: 'Marshmallow fluff', optional: true },
    ],
    not_topped: false,
    house_portions: '',
    accent_color: '#4A2E1B',
    order: 2,
  },
  {
    id: 'gingerbread-isle-bliss',
    name: 'Gingerbread Isle Bliss',
    kicker: 'MILKSHAKE',
    tagline: 'Gingerbread and marshmallow, served bare with no toppings.',
    price: 5.99,
    sizes: seedSizes(),
    in_shake: [
      { text: 'Gingerbread syrup', optional: false },
      { text: 'Marshmallow fluff', optional: false },
      { text: 'Graham cracker crumble', optional: false },
    ],
    toppings: [],
    not_topped: true,
    house_portions: '',
    accent_color: '#8A4B2A',
    order: 3,
  },
];

const normalizeLine = (line) => ({
  text: line?.text || '',
  optional: line?.optional === true,
});

// Guarantees every array and flag the editor and the sheet rely on, so a
// half-written localStorage record can never crash the page.
export function normalizeCard(card = {}) {
  return {
    ...card,
    id: card.id || '',
    name: card.name || '',
    kicker: card.kicker || '',
    tagline: card.tagline || '',
    price: card.price ?? 0,
    accent_color: card.accent_color || '#CC3300',
    sizes: Array.isArray(card.sizes)
      ? card.sizes.map(s => ({ label: s?.label || '', upcharge: s?.upcharge ?? 0 }))
      : [],
    in_shake: Array.isArray(card.in_shake) ? card.in_shake.map(normalizeLine) : [],
    toppings: Array.isArray(card.toppings) ? card.toppings.map(normalizeLine) : [],
    not_topped: card.not_topped === true,
    house_portions: card.house_portions || '',
    order: card.order ?? 0,
  };
}

export function loadBuildCards() {
  try {
    const raw = localStorage.getItem(BUILD_CARDS_STORAGE_KEY);
    if (!raw) return DEFAULT_BUILD_CARDS.map(normalizeCard);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BUILD_CARDS.map(normalizeCard);
    return parsed.map(normalizeCard);
  } catch {
    return DEFAULT_BUILD_CARDS.map(normalizeCard);
  }
}

export function saveBuildCards(cards) {
  try {
    localStorage.setItem(BUILD_CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // Print-only edits: a full quota must not break the page.
  }
}