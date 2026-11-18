// Options that take something OFF an item rather than add it: "No cheese",
// "No sauce", "No toppings", "Plain", "Without pickles". These render as
// compact pills instead of tiles — there is no photo worth 120px for a
// removal, and a whole grid cell each pushes the real toppings down the page.
const PLAIN_START = /^(no|none|nothing|without)\b/i;
const PLAIN_WORD = /\bplain\b/i;

export function isPlainOption(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  return PLAIN_START.test(text) || PLAIN_WORD.test(text);
}