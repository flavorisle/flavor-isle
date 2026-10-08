// Referral capture for web checkout (issue #83, Part A).
//
// A `?ref=CODE` link from a friend's confirmation email is remembered for 90
// days, so a friend who browses for a while still credits the referrer. The
// code is never required and never blocks ordering: with no code, checkout
// behaves exactly as before.
const STORAGE_KEY = 'fi_ref';
const EXPIRY_DAYS = 90;
const CODE_PATTERN = /^[A-Z0-9]{6,12}$/;

export function captureReferralFromUrl() {
  try {
    const code = (new URLSearchParams(window.location.search).get('ref') || '').trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, expiresAt: Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000 }),
    );
  } catch {
    // Private-mode storage failures must never break page load.
  }
}

export function getActiveReferralCode() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { code, expiresAt } = JSON.parse(raw);
    if (!code || !expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}