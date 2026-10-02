import { useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';
import { DEFAULT_BUSINESS_HOURS } from '@/lib/businessHours';
import { buildOpeningHoursSpecs } from '@/lib/schemaMarkup';

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
        data.openingHoursSpecification = buildOpeningHoursSpecs(hours);
        script.textContent = JSON.stringify(data);
      } catch {
        // Leave the static fallback hours in place.
      }
    })();
    return () => { active = false; };
  }, []);
  return null;
}