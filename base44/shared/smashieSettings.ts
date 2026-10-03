// Single source of truth for Smashie's runtime-configurable settings.
// The admin Communications page edits the SmashieSettings entity; the Twilio
// webhooks and the order-status sync read it here so toggles/greetings take
// effect immediately without touching the agent config file.

const DEFAULTS = {
  greeting: "Hey fam, Flavor Isle—Smashie here. What can I get started for you?",
  sms_status_updates_enabled: true,
  sms_auto_reply_enabled: true,
  voice_ordering_enabled: true,
  realtime_sip_enabled: false,
  sip_transfer_target: "",
  personality_notes: "",
  // The approved review request is active unless paused by the owner.
  googleReviewSmsEnabled: true,
  day14ShowcaseEmailEnabled: false,
  day45NudgeEmailEnabled: false,
};

// Returns the active settings merged over defaults. Always resolves (never
// throws) so callers can gate behavior on a value even if the entity is empty
// or the read fails — defaults keep Smashie behaving as before.
export async function getSmashieSettings(base44) {
  try {
    const records = await base44.asServiceRole.entities.SmashieSettings.list();
    if (records && records.length > 0) {
      return { ...DEFAULTS, ...records[0] };
    }
  } catch (err) {
    console.error("getSmashieSettings error:", err.message);
  }
  return { ...DEFAULTS };
}