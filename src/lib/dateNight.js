// Date Night for Two (issue #357) — which slot each menu item fills, and how a
// pick is handed to the server. The server re-checks every rule against the live
// catalog (base44/shared/dateNightSlots.ts); this copy only drives what the page
// offers, so the two people can never pick something the ticket will not take.

export const SLOT_ORDER = ['burger', 'side', 'shake', 'cake'];

export function dateNightSlot(item) {
  const key = String(item?.display_category || item?.square_category || item?.category || '');
  const name = String(item?.name || '').trim();
  if (/twirl|bliss/i.test(key)) return 'shake';
  if (/crunch|snack/i.test(key)) return 'side';
  if (/stacked|sweet/i.test(key)) return /^banana split$/i.test(name) ? null : 'cake';
  if (/burger/i.test(key)) return 'burger';
  return null;
}

export function itemsBySlot(items = []) {
  const out = { burger: [], side: [], shake: [], cake: [] };
  for (const item of items) {
    if (item?.is_hidden || item?.is_available === false) continue;
    const slot = dateNightSlot(item);
    if (slot) out[slot].push(item);
  }
  return out;
}

// The side we suggest: the house fries when the menu has them, otherwise the
// first side the menu lists.
export function suggestedSide(sides = []) {
  return sides.find((item) => /^french fries$/i.test(String(item?.name || '').trim())) || sides[0] || null;
}

// A picked line, kept small enough to survive a page reload in the draft.
export function slimLine(line) {
  if (!line) return null;
  return {
    id: line.id,
    name: line.name,
    price: Number(line.price) || 0,
    quantity: 1,
    selectedModifiers: line.selectedModifiers || [],
    flavorLevel: line.flavorLevel || '',
    allergyNote: line.allergyNote || '',
    saltNote: line.saltNote || '',
  };
}

// Exactly what the server needs: which item and which options. Never a price.
export function lineToApi(line) {
  return {
    item_id: line.id,
    quantity: 1,
    selected_mods: line.selectedModifiers || [],
    core_level: line.flavorLevel || '',
    salt_answer: line.saltNote || '',
    allergy_note: line.allergyNote || '',
  };
}

// The picks as receipt lines, in the order the headings read.
export function picksToLines(picks = {}) {
  return SLOT_ORDER.map((slot) => picks[slot]).filter(Boolean);
}

const DRAFT_KEY = 'flavor-isle-date-night-draft';

export function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

export function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}