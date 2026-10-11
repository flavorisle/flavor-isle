// Issue #93 (B2): the counter pass-through list.
//
// Numbers the crew wants rung straight at the counter instead of being handled
// by Smashie. Enforced on inbound calls in smashieSipIncoming (Live/SIP
// pipeline) and twilioVoiceWebhook (Twilio pipeline).
//
// Two rules hold at both call sites:
//   • the block list always wins — a number on both lists is blocked; and
//   • pass-through applies only while the store is OPEN, so a closed store
//     still runs the normal closed flow.
import { normalizePhone } from './blockedContacts.ts';

// Returns the matching active pass-through record, or null. Matched on the
// last 10 digits, exactly like the block list.
export async function findPassThrough(base44, phone) {
  const want = normalizePhone(phone);
  if (!want) return null;

  const rows = await base44.asServiceRole.entities.CounterPassThrough.filter({ is_active: true });
  return (rows || []).find((row) => normalizePhone(row.phone) === want) || null;
}

// True when the caller should skip Smashie and ring the counter. A failed
// lookup returns false, so a caller is never dropped or misrouted because a
// database read hiccupped.
export async function isPassThrough(base44, phone) {
  try {
    return !!(await findPassThrough(base44, phone));
  } catch (error) {
    console.error('Pass-through lookup failed, treating the caller as a normal call:', error.message);
    return false;
  }
}