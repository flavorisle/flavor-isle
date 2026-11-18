// Pickup times must land inside the store's real open hours (issue #330,
// approved by Wesley Nov 18 2026). The website already builds its slots inside
// those hours; this is the server-side half, so a time that is before opening,
// at or after closing, or on a closed day is refused instead of being saved on
// an order the kitchen cannot honor.
//
// The hours are read from the live MenuSetting record on every call (pinned id
// in storeState.ts) — never a hardcoded constant — so a change made in Admin →
// Store Settings applies to the very next order.
//
// The store runs on America/Chicago time, so the scheduled instant is converted
// to store-local weekday and minute-of-day before it is compared.

import { getMenuSettingRecord } from './storeState.ts';
import { chicagoParts } from './busynessTime.ts';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const PICKUP_HOURS_ERROR = 'Pickup time must be within our open hours.';

function toMins(time) {
  if (!time) return null;
  const [h, m] = String(time).split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

// True when this pickup time is inside open hours for its store-local day.
//
// A request with no scheduledFor at all is the flow that already ran without a
// chosen time, and it is left exactly as it was. A scheduledFor that is present
// but unreadable, on a closed day, before opening, or at/after closing is refused.
export async function pickupTimeAllowed(base44, scheduledFor) {
  if (scheduledFor == null || String(scheduledFor).trim() === '') return true;

  const at = new Date(String(scheduledFor));
  if (Number.isNaN(at.getTime())) return false;

  const setting = await getMenuSettingRecord(base44);
  const hours = setting?.business_hours;
  if (!hours || Object.keys(hours).length === 0) {
    // No hours to check against: never block a real order on a settings gap.
    console.error('pickupHours: business_hours missing on the MenuSetting record — time not gated');
    return true;
  }

  const { weekday, hour, minute } = chicagoParts(at.toISOString());
  const dayHours = hours[DAY_KEYS[(weekday + 6) % 7]];
  if (!dayHours || dayHours.closed) return false;

  const open = toMins(dayHours.open);
  const close = toMins(dayHours.close);
  // A malformed day is a settings problem, not the customer's: let it through.
  if (open == null || close == null) return true;

  const mins = hour * 60 + minute;
  return mins >= open && mins < close;
}