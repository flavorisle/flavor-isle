// Unified store state — website mirror of base44/shared/storeState.ts.
//
// The backend module owns the same rules for Smashie's phone line and the
// server-side checks; the website reads its copy here so one switch set in
// Admin → Store Settings means the same thing on both systems.
import { getMenuSetting } from '@/lib/menuSettings';
import { chicagoNow } from '@/lib/chicagoNow';
import { isOpenAllDay } from '@/lib/openAllDay';
import { evaluateClosure } from '@/lib/storeClosure';

export const ORDERING_CLOSED_DEFAULT = 'Ordering is temporarily closed';

// Online ordering unlocks at 8:00 AM daily — earlier than the doors open.
const ORDER_OPEN_MINS = 8 * 60;
const DEFAULT_CLOSE = '20:00';

function toMins(time) {
  if (!time) return null;
  const [h, m] = String(time).split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

// "17:00" → "5:00 PM".
export function formatClock(time) {
  const mins = toMins(time);
  if (mins == null) return '';
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function chicagoTodayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

// A one-day early close, honored only on its own date so it expires at midnight
// on its own. Returns { closeTime, message } or null.
export function earlyCloseToday(setting, todayKey = chicagoTodayKey()) {
  const early = setting?.early_close;
  if (!early?.date || !early?.close_time) return null;
  if (String(early.date).slice(0, 10) !== todayKey) return null;
  const closeTime = String(early.close_time).slice(0, 5);
  if (toMins(closeTime) == null) return null;
  return { closeTime, message: String(early.message || '').trim() };
}

// The closing time that actually applies today.
export function effectiveCloseTime(setting, now = chicagoNow(), todayKey = chicagoTodayKey()) {
  const early = earlyCloseToday(setting, todayKey);
  if (early) return early.closeTime;
  const dayHours = setting?.business_hours?.[now.dayKey] || {};
  if (dayHours.closed) return null;
  const configured = dayHours.close || setting?.closing_time || DEFAULT_CLOSE;
  return String(configured).slice(0, 5);
}

// Build the unified state from a loaded settings record (no fetching).
export function computeUnifiedStoreState(setting) {
  const now = chicagoNow();
  const todayKey = chicagoTodayKey();
  const dayHours = setting?.business_hours?.[now.dayKey] || {};
  const earlyClose = earlyCloseToday(setting, todayKey);
  const closeToday = effectiveCloseTime(setting, now, todayKey) || DEFAULT_CLOSE;

  const orderingEnabled = setting?.ordering_enabled !== false;
  const orderingClosedMessage = String(setting?.ordering_closed_message || '').trim() || ORDERING_CLOSED_DEFAULT;
  const deliveryEnabled = setting?.delivery_enabled !== false;
  const deliveryTiers = (setting?.delivery_tiers || [])
    .filter((t) => t && Number(t.max_miles) > 0)
    .map((t) => ({ max_miles: Number(t.max_miles), fee: Number(t.fee) || 0 }))
    .sort((a, b) => a.max_miles - b.max_miles);

  const notice = setting?.site_notice;
  const noticeText = String(notice?.message || '').trim();
  const activeNotice = notice?.active && noticeText
    ? { active: true, message: noticeText, level: notice.level || 'warning' }
    : { active: false, message: '', level: notice?.level || 'warning' };

  const closure = evaluateClosure(setting);
  const openAllDay = isOpenAllDay(setting, todayKey, now.totalMinutes);

  let open = true;
  let statusMessage = '';
  if (closure.closed) {
    open = false;
    statusMessage = closure.message;
  } else if (!orderingEnabled) {
    open = false;
    statusMessage = orderingClosedMessage;
  } else if (openAllDay) {
    open = true;
  } else if (dayHours.closed) {
    open = false;
    statusMessage = 'closed today';
  } else {
    const closeMins = toMins(closeToday) ?? toMins(DEFAULT_CLOSE);
    if (now.totalMinutes < ORDER_OPEN_MINS || now.totalMinutes >= closeMins) {
      open = false;
      statusMessage = 'we are closed right now';
    } else if (earlyClose) {
      const at = formatClock(earlyClose.closeTime);
      statusMessage = `we close at ${at} today. No orders after ${at}.${earlyClose.message ? ` ${earlyClose.message}` : ''}`;
    }
  }

  return {
    open,
    statusMessage,
    orderingEnabled,
    deliveryEnabled,
    deliveryTiers,
    maxMiles: deliveryTiers.length ? deliveryTiers[deliveryTiers.length - 1].max_miles : null,
    flatDeliveryFee: Number(setting?.delivery_fee ?? 0) || 0,
    activeNotice,
    closure,
    earlyCloseToday: earlyClose,
    effectiveCloseToday: closeToday,
    orderingClosedMessage,
  };
}

// Reads the single settings record, then builds the unified state.
export async function getUnifiedStoreState() {
  const setting = await getMenuSetting();
  return computeUnifiedStoreState(setting);
}