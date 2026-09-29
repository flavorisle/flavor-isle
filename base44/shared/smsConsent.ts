// Central SMS consent-evidence module. Every SMS send path and every consent
// capture surface goes through here so consent is never bundled and never
// inferred from order/account/loyalty data.
//
// Two independent consent categories:
//   - transactional: order status (confirmed, preparing, ready, completed) + pay-by-text
//   - marketing: recurring promotional offers
// STOP (status='unsubscribed') suppresses BOTH categories globally until an
// explicit ORDERS/OFFERS re-opt-in reactivates the matching category only.

import { normalizePhone } from './sendSmashieSms.ts';

export const SMS_CONSENT_VERSION = 'a2p-v2-2026-09-22';

export const CONSENT_CATEGORY = {
  NONE: 'none',
  TRANSACTIONAL: 'transactional',
  MARKETING: 'marketing',
  BOTH: 'both',
} as const;

// Plain-text disclosure snapshots stored as consent evidence. These mirror
// the copy shown in the UI (src/lib/smsConsent.js) at the same version.
export const DISCLOSURE_TEXT = {
  transactional:
    'Flavor Isle order status updates (confirmed, preparing, ready) and a secure pay-by-text link. Optional and not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help.',
  marketing:
    'Recurring promotional offers and specials from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (typically a few per month). Msg & data rates may apply. Reply STOP to cancel, HELP for help. See https://taste-isle-express.base44.app/terms-of-service and https://taste-isle-express.base44.app/privacy-policy',
};

function deriveCategory(transactional: boolean, marketing: boolean): string {
  if (transactional && marketing) return CONSENT_CATEGORY.BOTH;
  if (marketing) return CONSENT_CATEGORY.MARKETING;
  if (transactional) return CONSENT_CATEGORY.TRANSACTIONAL;
  return CONSENT_CATEGORY.NONE;
}

function consentFlags(rec: any) {
  return {
    transactional_consent: !!rec.transactional_consent,
    marketing_consent: !!rec.marketing_consent,
    proven_marketing_consent: !!rec.proven_marketing_consent,
    consent_category: rec.consent_category || CONSENT_CATEGORY.NONE,
    status: rec.status || 'active',
  };
}

// Upsert an SMSSubscriber record with explicit per-category consent.
// Granting any consent sets status='active' (explicit opt-in reactivates).
// Never sets status='unsubscribed' — only the STOP webhook path does that.
// Preserves an existing proven marketing grant when only re-confirming
// transactional (so checking the transactional box never downgrades marketing).
export async function upsertSmsConsent(base44: any, opts: {
  phone: string;
  name?: string;
  email?: string;
  transactionalConsent?: boolean;
  marketingConsent?: boolean;
  sourcePage: string;
  disclosureVersion?: string;
  disclosureText?: string;
  revokeMarketingConsent?: boolean;
}) {
  const {
    phone, name, email,
    transactionalConsent = false,
    marketingConsent = false,
    sourcePage,
    disclosureVersion = SMS_CONSENT_VERSION,
    disclosureText,
    revokeMarketingConsent = false,
  } = opts;

  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'invalid phone' };

  const now = new Date().toISOString();
  const category = deriveCategory(!!transactionalConsent, !!marketingConsent);
  const granting = !!(transactionalConsent || marketingConsent);

  const patch: any = {
    phone: normalized,
    transactional_consent: !!transactionalConsent,
    marketing_consent: !!marketingConsent,
    proven_marketing_consent: !!marketingConsent,
    consent_category: category,
    consent_timestamp: now,
    consent_source_page: sourcePage,
    consent_disclosure_version: disclosureVersion,
    ...(disclosureText ? { consent_disclosure_text: disclosureText } : {}),
    // Legacy compat
    opted_in: granting,
    source: sourcePage,
    ...(granting ? { status: 'active' } : {}),
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
  };

  const existing = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: normalized });
  if (revokeMarketingConsent) {
    if (!existing[0]) return { ok: true, exists: false, marketing_consent: false };
    const sub = existing[0];
    const revoked = {
      marketing_consent: false,
      proven_marketing_consent: false,
      consent_category: sub.transactional_consent ? CONSENT_CATEGORY.TRANSACTIONAL : CONSENT_CATEGORY.NONE,
      consent_timestamp: now,
      consent_source_page: sourcePage,
      opted_in: !!sub.transactional_consent,
    };
    await base44.asServiceRole.entities.SMSSubscriber.update(sub.id, revoked);
    return { ok: true, id: sub.id, ...consentFlags({ ...sub, ...revoked }) };
  }
  if (existing[0]) {
    const merged = { ...patch };
    // Don't downgrade a proven marketing grant when only re-confirming transactional.
    if (!marketingConsent && existing[0].proven_marketing_consent) {
      merged.proven_marketing_consent = true;
      merged.marketing_consent = existing[0].marketing_consent ?? true;
      merged.consent_category = deriveCategory(!!transactionalConsent, true);
    }
    // If nothing is being granted now, don't reactivate a stopped record.
    if (!granting) {
      delete merged.status;
      merged.opted_in = existing[0].opted_in;
    }
    await base44.asServiceRole.entities.SMSSubscriber.update(existing[0].id, merged);
    return { ok: true, id: existing[0].id, ...consentFlags(merged) };
  }

  const created = await base44.asServiceRole.entities.SMSSubscriber.create(patch);
  return { ok: true, id: created.id, ...consentFlags(patch) };
}

// Mark a phone globally stopped (STOP). Clears both consent categories and
// records opt-out evidence. Suppression is enforced by checkSmsConsent.
export async function stopSubscriber(base44: any, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, error: 'invalid phone' };
  const existing = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: normalized });
  const now = new Date().toISOString();
  const stopPatch = {
    status: 'unsubscribed',
    opted_in: false,
    transactional_consent: false,
    marketing_consent: false,
    proven_marketing_consent: false,
    consent_category: CONSENT_CATEGORY.NONE,
    opt_out_at: now,
  };
  if (existing[0]) {
    await base44.asServiceRole.entities.SMSSubscriber.update(existing[0].id, stopPatch);
    return { ok: true, id: existing[0].id };
  }
  // Record the opt-out even if they were never subscribed, so a later
  // order doesn't silently text them.
  const created = await base44.asServiceRole.entities.SMSSubscriber.create({
    phone: normalized,
    ...stopPatch,
    source: 'keyword_stop',
    consent_source_page: 'keyword_stop',
    consent_disclosure_version: SMS_CONSENT_VERSION,
  });
  return { ok: true, id: created.id };
}

// Check whether a phone may receive a given category. STOP suppresses all.
// category: 'transactional' | 'marketing'. Returns the subscriber record when
// ok so callers can update send timestamps.
export async function checkSmsConsent(base44: any, phone: string, category: 'transactional' | 'marketing') {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, reason: 'invalid phone', subscriber: null };
  const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: normalized });
  const sub = subs[0];
  if (!sub) return { ok: false, reason: 'no consent record', subscriber: null };
  if (sub.status === 'unsubscribed') return { ok: false, reason: 'stopped', subscriber: sub };
  if (category === 'transactional') {
    return sub.transactional_consent === true
      ? { ok: true, reason: 'ok', subscriber: sub }
      : { ok: false, reason: 'no transactional consent', subscriber: sub };
  }
  if (category === 'marketing') {
    return (sub.marketing_consent === true && sub.proven_marketing_consent === true)
      ? { ok: true, reason: 'ok', subscriber: sub }
      : { ok: false, reason: 'no proven marketing consent', subscriber: sub };
  }
  return { ok: false, reason: 'unknown category', subscriber: sub };
}

// Record the last send timestamp for audit/frequency caps. Best-effort.
export async function markSmsSent(base44: any, phone: string, category: 'transactional' | 'marketing') {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: normalized });
  const sub = subs[0];
  if (!sub) return;
  const now = new Date().toISOString();
  const patch = category === 'marketing'
    ? { last_marketing_sent_at: now }
    : { last_transactional_sent_at: now };
  try {
    await base44.asServiceRole.entities.SMSSubscriber.update(sub.id, patch);
  } catch {
    // non-fatal
  }
}

// Public status read for the consent UI (already-subscribed state). Returns
// only the flags needed to render the correct form, never the full disclosure.
export async function getConsentStatusForPhone(base44: any, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return { exists: false };
  const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: normalized });
  const sub = subs[0];
  if (!sub) return { exists: false };
  return {
    exists: true,
    status: sub.status,
    transactional_consent: !!sub.transactional_consent,
    marketing_consent: !!sub.marketing_consent,
    proven_marketing_consent: !!sub.proven_marketing_consent,
    consent_category: sub.consent_category || CONSENT_CATEGORY.NONE,
  };
}