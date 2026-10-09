// Unified store state — the one place that answers "is the store open right
// now, and what do we tell a customer?"
//
// The website (status bar, order cutoffs, early-close banner), Smashie's phone
// line (call context, legacy voice webhook), the busyness card, and the admin
// mirror all read THIS function, so one switch in Admin → Store Settings means
// the same thing on both systems: ordering on/off, delivery on/off with its
// range and fees, the site notice, a temporary closure, and a one-day early
// close.

import { todayChicago } from './busynessTime.ts';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Online ordering unlocks at 8:00 AM daily — earlier than the doors open — and
// runs to the closing time. Mirrors src/lib/storeState.js on the website.
const ORDER_OPEN_MINS = 8 * 60;
const DEFAULT_CLOSE = '20:00';

export const ORDERING_CLOSED_DEFAULT = 'Ordering is temporarily closed';

// The ONE live settings record per entity. Reads are pinned to these ids so a
// leftover duplicate record can never be picked up by a reader again.
export const MENU_SETTING_ID = '6a619923321f89b8d1cf8b3f';
export const SMASHIE_SETTINGS_ID = '6a7fd236b64dc1a4c8de4ae0';

function toMins(time) {
  if (!time) return null;
  const [h, m] = String(time).split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

// "17:00" → "5:00 PM". Spoken/printed the same way everywhere.
export function formatClock(time) {
  const mins = toMins(time);
  if (mins == null) return '';
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

// Reads the single settings record for an entity. Pinned to the known id; if
// that record is gone, falls back to the first record; if the entity is empty
// or the read fails, returns {} so callers keep their safe defaults. Never
// creates a record.
export async function readSingleRecord(base44, entityName, pinnedId) {
  const entity = base44?.asServiceRole?.entities?.[entityName];
  if (!entity) return {};
  if (pinnedId && typeof entity.get === 'function') {
    try {
      const record = await entity.get(pinnedId);
      if (record?.id) return record;
    } catch (error) {
      console.error(`${entityName}.get(${pinnedId}) failed:`, error.message);
    }
  }
  try {
    const list = await entity.list();
    return (list || [])[0] || {};
  } catch (error) {
    console.error(`${entityName}.list failed:`, error.message);
    return {};
  }
}

export async function getMenuSettingRecord(base44) {
  return readSingleRecord(base44, 'MenuSetting', MENU_SETTING_ID);
}

// MenuSetting.open_all_day_date / open_all_day_until — the date-scoped 24/7
// ordering override. A plain date covers that one store-local day; adding
// open_all_day_until ("YYYY-MM-DDTHH:MM", store local) stretches the window to
// that moment. Fixed window, expires on its own, an active closure still wins.
function allDayOverrideActive(s, now) {
  const start = String(s?.open_all_day_date || '').trim();
  if (!start) return false;

  const until = String(s?.open_all_day_until || '').trim().slice(0, 16);
  if (!until) return now.dateKey === start;

  const stamp = `${now.dateKey}T${String(now.hour).padStart(2, '0')}:${String(now.minute).padStart(2, '0')}`;
  return stamp >= `${start}T00:00` && stamp <= until;
}

// The next opening time (store-local) as a friendly string: "11 AM today" or
// "10:30 AM Monday". Walks forward day-by-day from now.
function nextOpeningTime(businessHours, now) {
  const todayIdx = (now.weekday + 6) % 7;
  const todayHours = (businessHours || {})[DAY_KEYS[todayIdx]] || {};
  const nowMins = now.hour * 60 + now.minute;
  const todayOpenMins = toMins(todayHours.open);
  if (!todayHours.closed && todayOpenMins != null && nowMins < todayOpenMins) {
    return `${formatClock(todayHours.open)} today`;
  }
  for (let i = 1; i <= 7; i++) {
    const idx = (todayIdx + i) % 7;
    const hours = (businessHours || {})[DAY_KEYS[idx]] || {};
    if (!hours.closed) {
      const label = i === 1 ? 'tomorrow' : DAY_LABELS[idx];
      return `${formatClock(hours.open)} ${label}`;
    }
  }
  return 'soon';
}

// Admin closure (MenuSetting.closure) evaluated against today, store-local.
function closureToday(s, now) {
  const c = s?.closure;
  if (!c || !c.active) return { active: false, message: '' };
  const start = c.start_date || now.dateKey;
  const end = c.end_date || start;
  if (now.dateKey >= start && now.dateKey <= end) {
    return { active: true, message: String(c.message || '').trim() || 'closed today' };
  }
  return { active: false, message: '' };
}

// One-day early close (MenuSetting.early_close). Honored only on its own date,
// so it expires at midnight on its own — the weekly hours are never touched.
function earlyCloseToday(s, now) {
  const early = s?.early_close;
  if (!early?.date || !early?.close_time) return null;
  if (String(early.date).slice(0, 10) !== now.dateKey) return null;
  const closeTime = String(early.close_time).slice(0, 5);
  if (toMins(closeTime) == null) return null;
  return { closeTime, message: String(early.message || '').trim() };
}

// How Smashie says it out loud and how the website banner reads.
function earlyCloseNote(early) {
  const at = formatClock(early.closeTime);
  return `we close at ${at} today. No orders after ${at}.${early.message ? ` ${early.message}` : ''}`;
}

function todayHours(s, now) {
  return (s?.business_hours || {})[DAY_KEYS[(now.weekday + 6) % 7]] || {};
}

// The closing time that actually applies today: the early close when one is set
// for today, otherwise the weekly hours (falling back to closing_time).
export function effectiveCloseTime(s, now = todayChicago()) {
  const early = earlyCloseToday(s, now);
  if (early) return early.closeTime;
  const dayHours = todayHours(s, now);
  if (dayHours.closed) return null;
  const configured = dayHours.close || s?.closing_time || DEFAULT_CLOSE;
  return String(configured).slice(0, 5);
}

// The unified state every surface reads.
export async function getUnifiedStoreState(base44) {
  const s = await getMenuSettingRecord(base44);
  const now = todayChicago();

  const orderingEnabled = s.ordering_enabled !== false;
  const orderingClosedMessage = String(s.ordering_closed_message || '').trim() || ORDERING_CLOSED_DEFAULT;
  const deliveryEnabled = s.delivery_enabled !== false;
  const deliveryTiers = (s.delivery_tiers || [])
    .filter((t) => t && Number(t.max_miles) > 0)
    .map((t) => ({ max_miles: Number(t.max_miles), fee: Number(t.fee) || 0 }))
    .sort((a, b) => a.max_miles - b.max_miles);
  const maxMiles = deliveryTiers.length ? deliveryTiers[deliveryTiers.length - 1].max_miles : null;
  const flatDeliveryFee = Number(s.delivery_fee ?? 0) || 0;

  const notice = s.site_notice;
  const noticeText = String(notice?.message || '').trim();
  const activeNotice = notice?.active && noticeText
    ? { active: true, message: noticeText, level: notice.level || 'warning' }
    : { active: false, message: '', level: notice?.level || 'warning' };

  const closure = closureToday(s, now);
  const earlyClose = earlyCloseToday(s, now);
  const dayHours = todayHours(s, now);
  const closeToday = effectiveCloseTime(s, now) || DEFAULT_CLOSE;

  const nowMins = now.hour * 60 + now.minute;
  let open = true;
  let statusMessage = '';

  if (closure.active) {
    open = false;
    statusMessage = closure.message;
  } else if (!orderingEnabled) {
    // Ordering off means off everywhere: the website locks checkout and Smashie
    // stops taking orders with the same sentence the owner typed.
    open = false;
    statusMessage = orderingClosedMessage;
  } else if (allDayOverrideActive(s, now)) {
    open = true;
    statusMessage = '';
  } else if (dayHours.closed) {
    open = false;
    statusMessage = 'closed today';
  } else {
    const closeMins = toMins(closeToday) ?? toMins(DEFAULT_CLOSE);
    if (nowMins < ORDER_OPEN_MINS || nowMins >= closeMins) {
      open = false;
      statusMessage = `we open at ${nextOpeningTime(s.business_hours, now)}`;
    } else if (earlyClose) {
      // Smashie says this out loud and the site banner shows the same day.
      statusMessage = earlyCloseNote(earlyClose);
    }
  }

  return {
    open,
    statusMessage,
    orderingEnabled,
    deliveryEnabled,
    deliveryTiers,
    maxMiles,
    flatDeliveryFee,
    activeNotice,
    closure,
    earlyCloseToday: earlyClose,
    effectiveCloseToday: closeToday,
    orderingClosedMessage,
  };
}

// The phone line's own status: the doors must actually be open (a 9 AM call
// should not take an order for a kitchen that opens at 10:30) AND ordering must
// be on — so flipping "All ordering" off closes the phone the same second the
// website locks, with the owner's exact message. A one-day early close keeps the
// line answering until that time and tells the caller we close early.
export async function getPhoneStoreStatus(base44) {
  const s = await getMenuSettingRecord(base44);
  const now = todayChicago();

  const closure = closureToday(s, now);
  if (closure.active) return { open: false, message: closure.message };

  if (s.ordering_enabled === false) {
    return {
      open: false,
      message: String(s.ordering_closed_message || '').trim() || ORDERING_CLOSED_DEFAULT,
    };
  }

  const early = earlyCloseToday(s, now);
  const note = early ? earlyCloseNote(early) : '';
  if (allDayOverrideActive(s, now)) return { open: true, message: note };

  const dayHours = todayHours(s, now);
  if (dayHours.closed) return { open: false, message: 'closed today' };

  const openMins = toMins(dayHours.open);
  const closeMins = toMins(effectiveCloseTime(s, now)) ?? toMins(DEFAULT_CLOSE);
  const nowMins = now.hour * 60 + now.minute;
  if (openMins != null && (nowMins < openMins || nowMins >= closeMins)) {
    return { open: false, message: `we open at ${nextOpeningTime(s.business_hours, now)}` };
  }
  return { open: true, message: note };
}

// Doors-open check: the admin closure + per-day business hours using the ACTUAL
// configured open time (not the 8 AM online-ordering unlock) and today's
// effective closing time. Ordering being paused does not close the doors.
// Returns { open, message } and defaults to open on error.
export async function getPhysicalStoreStatus(base44) {
  try {
    const s = await getMenuSettingRecord(base44);
    const now = todayChicago();

    const closure = closureToday(s, now);
    if (closure.active) return { open: false, message: closure.message };

    if (allDayOverrideActive(s, now)) return { open: true, message: '' };

    const dayHours = todayHours(s, now);
    if (dayHours.closed) return { open: false, message: 'closed today' };

    const openMins = toMins(dayHours.open);
    const closeMins = toMins(effectiveCloseTime(s, now)) ?? toMins(DEFAULT_CLOSE);
    const nowMins = now.hour * 60 + now.minute;

    if (openMins != null && (nowMins < openMins || nowMins >= closeMins)) {
      return { open: false, message: `we open at ${nextOpeningTime(s.business_hours, now)}` };
    }
    return { open: true, message: '' };
  } catch (e) {
    console.error('getPhysicalStoreStatus failed:', e.message);
    return { open: true, message: '' };
  }
}