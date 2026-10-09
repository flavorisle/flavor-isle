// Pure diff helpers for the owner-switch audit trail: which fields changed, what
// each switch drives, and a readable rendering of both values. No SDK use here,
// so this is unit-testable and reusable.

export const SETTINGS_ENTITIES = ['MenuSetting', 'SmashieSettings'];

// Never part of a change notice: record bookkeeping, and the Meta token (a secret
// that must not travel in an email).
const IGNORED_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id', 'description', 'facebook_access_token'];

// Which systems each switch drives, so the notice can say what the change reaches.
export const FIELD_REACH = {
  ordering_enabled: "Both - website checkout and Smashie's phone line",
  ordering_closed_message: 'Both - shown on the website and spoken by Smashie',
  delivery_enabled: "Both - website checkout and Smashie's phone orders",
  delivery_fee: "Both - online delivery and Smashie's quotes",
  delivery_tiers: "Both - online delivery and Smashie's quotes",
  closing_time: 'Both - website ordering window and Smashie',
  delivery_cutoff_minutes: 'Both - website checkout and Smashie',
  pickup_cutoff_minutes: 'Both - website checkout and Smashie',
  business_hours: 'Both - the website hours and the phone line',
  site_notice: "Both - website banner and Smashie's phone message",
  closure: 'Both - website ordering and Smashie',
  early_close: 'Both - website ordering and Smashie',
  open_all_day_date: 'Both - website ordering and Smashie',
  open_all_day_until: 'Both - website ordering and Smashie',
  extra_cook_date: 'Kitchen - quoted wait times for website and phone orders',
  happy_hour: 'Website checkout discounts',
  phone_cash_enabled: 'Phone only - what Smashie accepts for pickup orders',
  phone_payment_provider: 'Phone only - which processor backs the secure pay link',
  voice_ordering_enabled: 'Phone only - whether Smashie takes orders by voice',
  realtime_sip_enabled: 'Phone only - which phone pipeline answers calls',
  sms_status_updates_enabled: 'Customer texts',
  sms_auto_reply_enabled: 'Customer texts',
  googleReviewSmsEnabled: 'Customer texts',
  day14ShowcaseEmailEnabled: 'Customer emails',
  day45NudgeEmailEnabled: 'Customer emails',
  greeting: 'Customer texts',
  phone_intro: "Phone only - Smashie's spoken introduction",
  personality_notes: "Phone only - Smashie's tone",
  sip_transfer_target: 'Phone only - where a counter transfer lands',
  capabilities: 'Phone only - which abilities Smashie offers',
  knowledge_topics: 'Phone only - what Smashie can answer',
  modifier_overrides: 'Website menu modifiers',
  deluxe: 'Website menu deluxe preset',
  hidden_categories: 'Website menu categories',
  category_sort_order: 'Website menu order',
  category_renames: 'Website menu labels',
  category_item_order: 'Website menu item order',
};

export function fieldLabel(field) {
  return String(field || '').replace(/_/g, ' ');
}

// A short, human rendering: booleans become ON/OFF, objects become compact JSON
// trimmed so one long value cannot swamp the notice.
export function renderValue(value) {
  if (value === undefined || value === null || value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}...` : value;
  try {
    const json = JSON.stringify(value);
    return json.length > 300 ? `${json.slice(0, 300)}...` : json;
  } catch {
    return '(unreadable)';
  }
}

function sameValue(a, b) {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a === 'object' && typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b);
  return false;
}

// Every top-level field whose value really changed, noise and secrets excluded.
export function diffSettings(before, after) {
  const fields = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changes = [];
  for (const field of fields) {
    if (IGNORED_FIELDS.includes(field)) continue;
    const from = (before || {})[field];
    const to = (after || {})[field];
    if (sameValue(from, to)) continue;
    changes.push({
      field,
      old: renderValue(from),
      new: renderValue(to),
      reach: FIELD_REACH[field] || 'Store settings',
    });
  }
  return changes;
}

// Which systems the change as a whole touched.
export function changeReach(changes) {
  const reaches = (changes || []).map((c) => String(c.reach || ''));
  if (reaches.some((r) => r.startsWith('Both'))) return 'both';
  if (reaches.length && reaches.every((r) => r.startsWith('Phone'))) return 'phone';
  return 'website';
}