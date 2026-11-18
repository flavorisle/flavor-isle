// Options that belong as compact pills rather than photo tiles:
//
// 1. Removals — "No cheese", "No sauce", "No toppings", "Plain", "Without
//    pickles". There is no photo worth a tile for taking something off.
// 2. The shake thickness group — "Thick, Thin, or Regular Thickness" (Light
//    Milk / Regular Milk / Extra Milk). It is one choice of consistency, not a
//    topping, so it reads as a row of chips.
const PLAIN_START = /^(no|none|nothing|without)\b/i;
const PLAIN_WORD = /\bplain\b/i;
const THICKNESS = /thick|thickness|thin\b|consistenc/i;

export function isPlainOption(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  return PLAIN_START.test(text) || PLAIN_WORD.test(text);
}

// groupName lets a group-wide rule apply even when the option names themselves
// don't say it ("Light Milk" inside "Thick, Thin, or Regular Thickness").
export function isPillOption(name, groupName) {
  if (isPlainOption(name)) return true;
  return THICKNESS.test(String(name || '')) || THICKNESS.test(String(groupName || ''));
}