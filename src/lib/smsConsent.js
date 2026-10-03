// Frontend SMS consent constants + helpers. Mirrors the disclosure version in
// base44/shared/smsConsent.ts. The public URLs use the app's verified
// published domain; swap to flavor-isle.com once Wesley confirms the custom
// domain is connected (per "do not use unverified domain URLs").

export const SMS_CONSENT_VERSION = 'a2p-v2-2026-09-22';

// Verified public domain (the app's published host). Update to flavor-isle.com
// only after Wesley confirms the custom domain is connected.
export const SMS_POLICY_URL = 'https://flavor-isle.com/privacy-policy';
export const SMS_TERMS_URL = 'https://flavor-isle.com/terms-of-service';

// Normalize a US phone number to E.164.
export function toE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 11 && raw.trim().startsWith('+')) return raw.trim();
  return null;
}

// Plain-text disclosure snapshots (stored as consent evidence). These must
// match DISCLOSURE_TEXT in base44/shared/smsConsent.ts at the same version.
export const TRANSACTIONAL_DISCLOSURE_TEXT =
  'Flavor Isle order status updates (confirmed, preparing, ready) and a secure pay-by-text link. Optional and not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help.';

export const MARKETING_DISCLOSURE_TEXT =
  'Recurring promotional offers and specials from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (typically a few per month). Msg & data rates may apply. Reply STOP to cancel, HELP for help. See https://flavor-isle.com/terms-of-service and https://flavor-isle.com/privacy-policy';