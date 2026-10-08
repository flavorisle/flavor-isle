// MenuSetting.open_all_day_date / open_all_day_until — the date-scoped 24/7
// ordering override used for overnight tests. Mirrors the rule in
// base44/shared/storeClosure.ts so the website and the phone line agree.
//
// A plain open_all_day_date covers that one store-local day (original behavior).
// Adding open_all_day_until ("YYYY-MM-DDTHH:MM", store local) stretches the
// window so it ends at that moment — e.g. "open now through tomorrow 8 PM" is
// open_all_day_date = today, open_all_day_until = tomorrowT20:00.
export function isOpenAllDay(setting, todayKey, totalMinutes) {
  const start = String(setting?.open_all_day_date || '').trim();
  if (!start) return false;

  const until = String(setting?.open_all_day_until || '').trim().slice(0, 16);
  if (!until) return start === todayKey;

  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  const stamp = `${todayKey}T${hh}:${mm}`;
  return stamp >= `${start}T00:00` && stamp <= until;
}