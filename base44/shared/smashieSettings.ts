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
  // Card payments are taken on our own page, in Square. These two values are
  // kept so stored settings records stay valid, but every path now uses Square —
  // there is no other processor to switch to.
  phone_payment_provider: "square",
  web_payment_provider: "square",
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

// The phone line always takes cards on our own page, in Square.
export function phonePaymentProvider(_settings) {
  return 'square';
}

// The website's secure payment page can be backed by either processor: 'square'
// (our own page, Square's card form) or 'wix' (Base44 Payments, powered by Wix).
// The stored switch is consulted again so the owner can flip it from Admin →
// Communications; anything unrecognised falls back to 'square', the fail-safe
// default, so a bad or missing value can never strand a checkout.
export function webPaymentProvider(settings) {
  return settings?.web_payment_provider === 'wix' ? 'wix' : 'square';
}