// Issue #341 (E1) — the note a traveler adds from Traveler Mode.
//
// The traveler taps once and the note rides with them into checkout, where it
// fills the customer's own notes field (they can still edit or clear it). Kept in
// sessionStorage so it belongs to this visit only, and read once so a later order
// never inherits it. The module cache makes that one read idempotent, so a
// re-render can never consume the note before checkout uses it.
const KEY = 'fi_traveler_note_v1';

let cached = null;

export function setTravelerNote(text) {
  cached = text || '';
  try {
    if (text) sessionStorage.setItem(KEY, text);
  } catch {
    /* private mode — the note simply is not carried */
  }
}

export function takeTravelerNote() {
  if (cached !== null) return cached;
  try {
    const value = sessionStorage.getItem(KEY);
    if (value) sessionStorage.removeItem(KEY);
    cached = value || '';
  } catch {
    cached = '';
  }
  return cached;
}