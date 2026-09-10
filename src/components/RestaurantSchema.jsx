import { useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';
import { DAY_KEYS, DAY_LABELS, DEFAULT_BUSINESS_HOURS } from '@/lib/businessHours';

// Builds schema.org OpeningHoursSpecification entries from the MenuSetting
// business_hours entity, grouping consecutive days that share the same hours
// and skipping days marked closed. Hours are kept in 24h HH:MM (schema format).
function buildOpeningHours(hours) {
  const specs = [];
  let group = null;
  DAY_KEYS.forEach((k) => {
    const d = hours[k];
    const closed = !d || d.closed || !d.open || !d.close;
    if (closed) {
      if (group) { specs.push(group); group = null; }
      return;
    }
    const key = `${d.open}-${d.close}`;
    if (group && group._key === key) {
      group.dayOfWeek.push(DAY_LABELS[k]);
    } else {
      if (group) specs.push(group);
      group = { _key: key, dayOfWeek: [DAY_LABELS[k]], opens: d.open, closes: d.close };
    }
  });
  if (group) specs.push(group);
  return specs.map(({ _key, ...rest }) => ({ '@type': 'OpeningHoursSpecification', ...rest }));
}

// Keeps the Restaurant JSON-LD in <head> accurate by pulling live hours from
// the MenuSetting entity. The static block in index.html (id="restaurant-schema")
// ships as a no-JS fallback with default hours; this updates openingHours once
// the app boots so Google always sees the real schedule.
export default function RestaurantSchema() {
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await getMenuSetting();
        if (!active) return;
        const hours = { ...DEFAULT_BUSINESS_HOURS, ...(s?.business_hours || {}) };
        const script = document.getElementById('restaurant-schema');
        if (!script) return;
        const data = JSON.parse(script.textContent);
        data.openingHoursSpecification = buildOpeningHours(hours);
        script.textContent = JSON.stringify(data);
      } catch {
        // Leave the static fallback hours in place.
      }
    })();
    return () => { active = false; };
  }, []);
  return null;
}