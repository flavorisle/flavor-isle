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
  // Card payments are taken on our own page, in Helcim. Stored settings records
  // keep whatever processor they name; the live switch is the pair of helpers below.
  phone_payment_provider: "helcim",
  web_payment_provider: "helcim",
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

// The phone line always takes cards on our own page, in Helcim. Until the Helcim
// API token is in place the caller falls back to the Square link automatically.
export function phonePaymentProvider(_settings) {
  return 'helcim';
}

// The website's food checkout takes the card on our own page, in Helcim: the order
// is saved and re-priced first, then the customer pays on that order's own secure
// page and lands straight back on its confirmation. Until the Helcim API token is
// in place, the checkout opens the alternate Square page rather than a dead one.
//
// Square keeps the flows that take the card on our own page — the phone/text
// payment link's alternate and the Tasty Threads merch checkout — plus the POS.
// The stored web_payment_provider value is kept only so older records stay valid.
export function webPaymentProvider(_settings) {
  return 'helcim';
}