// Store-local time helpers for busyness aggregation.
// Flavor Isle runs on America/Chicago time; Square order timestamps are UTC.

export const BUSYNESS_TZ = "America/Chicago";
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function partsToChicago(parts) {
  let hour = parseInt(parts.hour, 10);
  if (Number.isNaN(hour)) hour = 0;
  if (hour === 24) hour = 0;
  let minute = parseInt(parts.minute, 10);
  if (Number.isNaN(minute)) minute = 0;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute,
    weekday: WEEKDAY_NAMES.indexOf(parts.weekday),
  };
}

const chicagoFormatter = () =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: BUSYNESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long",
  });

function partsFor(date) {
  const out = {};
  for (const p of chicagoFormatter().formatToParts(date)) out[p.type] = p.value;
  return out;
}

export function chicagoParts(isoStr) {
  return partsToChicago(partsFor(new Date(isoStr)));
}

export function todayChicago() {
  return partsToChicago(partsFor(new Date()));
}