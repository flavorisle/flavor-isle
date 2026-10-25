// Single source of truth for Smashie's runtime-configurable settings.
// The admin Communications page edits the SmashieSettings entity; the Twilio
// webhooks, the phone pipeline, and logPhoneOrder read it here so toggles take
// effect immediately without touching the agent config file.
//
// Reads are pinned to the one live record (see storeState.ts) so a leftover
// duplicate can never be picked up, and there is no create fallback.

import { readSingleRecord, SMASHIE_SETTINGS_ID } from './storeState.ts';

const DEFAULTS = {
  greeting: "Hey fam, Flavor Isle—Smashie here. What can I get started for you?",
  sms_status_updates_enabled: true,
  sms_auto_reply_enabled: true,
  voice_ordering_enabled: true,
  realtime_sip_enabled: false,
  sip_transfer_target: "",
  personality_notes: "",
  // Cash on phone pickup orders is accepted unless the owner turns it off.
  phone_cash_enabled: true,
  // Cash-only phone mode (issue #120): the phone keeps taking cash pickup
  // orders even while website ordering is switched off.
  phone_cash_orders_only: false,
  // Card payments are taken on our own page. The provider switch is the pair of
  // helpers below; these defaults name the primary path (issue #116).
  phone_payment_provider: "wix",
  web_payment_provider: "wix",
  // The approved review request is active unless paused by the owner.
  googleReviewSmsEnabled: true,
  day14ShowcaseEmailEnabled: false,
  day45NudgeEmailEnabled: false,
};

// Returns the active settings merged over defaults. Always resolves (never
// throws) so callers can gate behavior on a value even if the entity is empty
// or the read fails — defaults keep Smashie behaving as before.
export async function getSmashieSettings(base44) {
  const record = await readSingleRecord(base44, 'SmashieSettings', SMASHIE_SETTINGS_ID);
  return { ...DEFAULTS, ...record };
}

// True unless the owner has switched cash off for phone pickup orders.
export function phoneCashEnabled(settings) {
  return settings?.phone_cash_enabled !== false;
}

// True only when the owner has switched the phone into cash-only mode.
export function phoneCashOrdersOnly(settings) {
  return settings?.phone_cash_orders_only === true;
}

// Which systems may back a card payment (issue #116, Part A step 8). Base44
// Payments (Wix) is the primary path; Square stays as the working alternative. Any
// older stored value — including the retired card processor — resolves to the
// primary, so a stale settings record can never point a customer at a dead path.
const PAYMENT_PROVIDERS = ['wix', 'square'];

export function normalizePaymentProvider(value: string | null | undefined): 'wix' | 'square' {
  const wanted = String(value || '').trim().toLowerCase();
  return PAYMENT_PROVIDERS.includes(wanted) ? (wanted as 'wix' | 'square') : 'wix';
}

// The phone line takes cards on our own page, backed by the provider the owner has
// switched on. A settings read that fails falls safe to Square, which takes a card on
// every account.
export function phonePaymentProvider(settings) {
  try {
    return normalizePaymentProvider(settings?.phone_payment_provider);
  } catch (error) {
    console.error('phonePaymentProvider: settings unavailable — falling back to Square:', (error as Error).message);
    return 'square';
  }
}

// The website's secure payment page — food orders and Tasty Threads merch alike. The
// order is saved and re-priced first, then the customer pays and lands straight back
// on its own confirmation. Same fail-safe: an unusable settings record routes the
// customer to the Square page rather than to a checkout that cannot open.
export function webPaymentProvider(settings) {
  try {
    return normalizePaymentProvider(settings?.web_payment_provider);
  } catch (error) {
    console.error('webPaymentProvider: settings unavailable — falling back to Square:', (error as Error).message);
    return 'square';
  }
}