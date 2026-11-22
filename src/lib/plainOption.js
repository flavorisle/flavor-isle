// Options that belong as compact pills rather than photo tiles:
//
// 1. Removals — "No cheese", "No sauce", "No toppings", "Plain", "Without
//    pickles". There is no photo worth a tile for taking something off.
// 2. The shake thickness group — "Thick, Thin, or Regular Thickness" (Light
//    Milk / Regular Milk / Extra Milk). It is one choice of consistency, not a
//    topping, so it reads as a row of chips.
// 3. Pick-your-side lists Square happens to name "Size" — "Chili and Cheese
//    Covered Side" offers fries, tots, waffle fries and curly fries, which are
//    dry side choices, not sizes. They read as pills under their own heading
//    instead of a "SIZE" heading over photo-less tiles. A real size list
//    ("14 oz", "4 Pc", "Black, S") keeps its tiles.
// 4. The fries' "SIDE MODIFIERS" group — REGULAR, DOUBLE ORDER, SEASON WITH
//    CAJUN. Preparation and quantity choices, nothing to photograph, so they
//    are pills three to a row.
const PLAIN_START = /^(no|none|nothing|without)\b/i;
const PLAIN_WORD = /\bplain\b/i;
const THICKNESS = /thick|thickness|thin\b|consistenc/i;
const SIDE_MODIFIERS = /^side( ?dish)? modifiers?$/i;
// 5. Amount-only choices — "LITE", "REGULAR", "EXTRA" — are how much of the
// topping above them, not a food of their own, so they are chips rather than
// photo-less tiles.
const AMOUNT_ONLY = /^(lite|light|reg|regular|normal|extra)$/i;

const SIZE_NAME = /^size$/i;
const SIZE_TOKENS = new Set([
  's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl',
  'small', 'medium', 'large', 'oz', 'pc', 'pcs',
]);

export function isPlainOption(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  return PLAIN_START.test(text) || PLAIN_WORD.test(text);
}

// Does the option name itself spell out a size ("S 14 oz", "4 Pc", "Black, S")?
function looksLikeSize(optionName) {
  return String(optionName || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .some((token) => SIZE_TOKENS.has(token) || /^\d+oz$/.test(token));
}

// True for a "Size" group that actually lists sides ("Curly Fries", "Tator
// Tots") rather than sizes.
export function isSideChoiceGroup(group) {
  if (!SIZE_NAME.test(String(group?.name || '').trim())) return false;
  const options = group?.modifiers || [];
  if (options.length === 0) return false;
  return !options.some((mod) => looksLikeSize(mod?.name));
}

// The heading a group shows: a pick-your-side "Size" list says what it is.
export function groupHeading(group) {
  return isSideChoiceGroup(group) ? 'Choose your side' : (group?.name || '');
}

// groupName lets a group-wide rule apply even when the option names themselves
// don't say it ("Light Milk" inside "Thick, Thin, or Regular Thickness").
// Accepts the group object too, so a pick-your-side list can turn its whole
// set into pills.
export function isPillOption(name, group) {
  const groupName = typeof group === 'string' ? group : group?.name;
  if (isPlainOption(name)) return true;
  if (AMOUNT_ONLY.test(String(name || '').trim())) return true;
  if (THICKNESS.test(String(name || '')) || THICKNESS.test(String(groupName || ''))) return true;
  if (SIDE_MODIFIERS.test(String(groupName || '').trim())) return true;
  return typeof group === 'object' && group !== null && isSideChoiceGroup(group);
}