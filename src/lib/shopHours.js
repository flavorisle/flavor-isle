// src/lib/shopHours.js
// Reads the free-text Hours line on an Explore Smiths Grove shop and answers one
// question for the card face: is this shop open right now?
//
// The lines are hand-written in the ExploreShop table, so the parser is deliberately
// forgiving: en dashes or hyphens, short or long day names, day ranges either way
// round, "8:00am – 4:00pm" or "10–4", and a "Closed Mon–Tue" tail.
// It never guesses. If a piece of the line cannot be read, that piece is ignored
// and the result is marked partial, so a card is never given a wrong Open badge.

const DAY_WORDS = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

export const STATUS_UNKNOWN = 'unknown';
export const STATUS_OPEN = 'open';
export const STATUS_CLOSED = 'closed';

function toMinutes(value, kind) {
  const m = String(value).trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = m[2] ? Number(m[2]) : 0;
  const suffix = m[3];
  if (h > 24 || mins > 59) return null;
  if (suffix) {
    if (h > 12) return null;
    if (suffix === 'pm' && h !== 12) h += 12;
    if (suffix === 'am' && h === 12) h = 0;
  } else if (kind === 'close') {
    // Bare closing times on these signs are afternoons: 3, 4, 5, 6, 7 mean PM.
    if (h <= 7) h += 12;
  } else if (kind === 'open') {
    // Bare opening times are mornings, except 12 which reads as noon.
    if (h >= 1 && h <= 7) h += 12;
  }
  return h * 60 + mins;
}

function daysInWords(text) {
  const out = [];
  let broken = false;
  String(text)
    .split(',')
    .forEach((chunk) => {
      chunk.split('&').forEach((part) => {
        const words = part.match(/[A-Za-z]+/g);
        if (!words || words.length === 0) return;
        if (words.length === 1) {
          const d = DAY_WORDS[words[0].toLowerCase()];
          if (d === undefined) broken = true; else out.push(d);
          return;
        }
        if (words.length === 2) {
          const a = DAY_WORDS[words[0].toLowerCase()];
          const b = DAY_WORDS[words[1].toLowerCase()];
          if (a === undefined || b === undefined) { broken = true; return; }
          let d = a;
          for (let i = 0; i < 7; i += 1) {
            out.push(d);
            if (d === b) break;
            d = (d + 1) % 7;
          }
          return;
        }
        broken = true; // "winter: Mon–Sat" and anything else unreadable
      });
    });
  return { days: [...new Set(out)], broken };
}

const TIME_RANGE = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:[–—-]|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;

/**
 * Parses an Hours line into a week of windows.
 * Returns { ok, always, partial, schedule } where schedule[0..6] is
 * { open, close } in minutes from midnight, or null when closed that day.
 */
export function parseShopHours(text) {
  const schedule = [null, null, null, null, null, null, null];
  const raw = String(text || '').replace(/\u00a0/g, ' ').trim();
  if (!raw) return { ok: false, always: false, partial: false, schedule };
  if (/open\s*24\s*hours/i.test(raw)) {
    return { ok: true, always: true, partial: false, schedule: Array(7).fill({ open: 0, close: 24 * 60 }) };
  }

  let read = 0;
  let partial = false;

  raw.split(/[·|]/).forEach((segmentRaw) => {
    const segment = segmentRaw.trim().replace(/\.$/, '');
    if (!segment) return;

    const closedMatch = segment.match(/^closed\s+(.+)$/i);
    if (closedMatch) {
      const { days, broken } = daysInWords(closedMatch[1].replace(TIME_RANGE, ''));
      if (broken || days.length === 0) { partial = true; return; }
      days.forEach((d) => { schedule[d] = null; });
      read += days.length;
      return;
    }

    const range = segment.match(TIME_RANGE);
    if (!range) { partial = true; return; }

    const dayText = segment.slice(0, range.index);
    const { days, broken } = daysInWords(dayText);
    if (broken || days.length === 0) { partial = true; return; }

    const open = toMinutes(range[1], 'open');
    const close = toMinutes(range[2], 'close');
    if (open === null || close === null || close <= open) { partial = true; return; }

    days.forEach((d) => { schedule[d] = { open, close }; });
    read += days.length;
  });

  return { ok: read > 0, always: false, partial, schedule };
}

/** Today's window in minutes, or null. */
export function todaysWindow(parsed, now) {
  if (!parsed?.ok) return null;
  return parsed.schedule[now.getDay()] || null;
}

/**
 * The one answer the card needs.
 * state: 'open' | 'closed' | 'unknown'
 * until: minutes-from-midnight the doors close today, when open
 * opensAt: minutes-from-midnight the doors open later today, when closed
 */
export function shopStatus(text, now = new Date()) {
  const parsed = parseShopHours(text);
  if (!parsed.ok) return { state: STATUS_UNKNOWN, parsed };
  if (parsed.always) return { state: STATUS_OPEN, until: null, opensAt: null, parsed };

  const minutes = now.getHours() * 60 + now.getMinutes();
  const window = parsed.schedule[now.getDay()];
  if (!window) return { state: STATUS_CLOSED, until: null, opensAt: null, parsed };
  if (minutes >= window.open && minutes < window.close) {
    return { state: STATUS_OPEN, until: window.close, opensAt: null, parsed };
  }
  if (minutes < window.open) {
    return { state: STATUS_CLOSED, until: null, opensAt: window.open, parsed };
  }
  return { state: STATUS_CLOSED, until: null, opensAt: null, parsed };
}

export function formatMinutes(mins) {
  if (mins === null || mins === undefined) return '';
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}` : `${h12} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

/**
 * Same answer for Flavor Isle's own card, whose times live in the admin panel
 * (MenuSetting through useBusinessHours) and not in the typed Hours line.
 */
export function statusFromBusinessHours(hours, now = new Date()) {
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = hours?.[keys[now.getDay()]];
  if (!day || day.closed || !day.open || !day.close) return { state: STATUS_CLOSED, until: null, opensAt: null };
  const [oh, om] = String(day.open).split(':').map(Number);
  const [ch, cm] = String(day.close).split(':').map(Number);
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= open && minutes < close) return { state: STATUS_OPEN, until: close, opensAt: null };
  return { state: STATUS_CLOSED, until: null, opensAt: minutes < open ? open : null };
}