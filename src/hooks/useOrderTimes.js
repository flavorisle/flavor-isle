import useLiveStatus from '@/hooks/useLiveStatus';
import useBusinessHours from '@/hooks/useBusinessHours';
import { DAY_KEYS, formatTime12 } from '@/lib/businessHours';

// Single source of truth for the pickup / delivery / dine-in time labels
// shown on order buttons across the site. Every page that displays a wait
// time (hero, start-order band, /order landing, menu, checkout) reads from
// here so the numbers always match — driven by the regressed waitMin from
// useLiveStatus, and clamped to the store open when pre-ordering before
// opening (pickup can't be ready before the kitchen opens).
export default function useOrderTimes() {
  const { waitMin, isClosed } = useLiveStatus();
  const businessHours = useBusinessHours();

  const now = new Date();
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7];
  const todayHours = businessHours?.[dayKey] || {};
  const beforeOpen = !todayHours.closed && todayHours.open && (() => {
    const [oh, om] = todayHours.open.split(':').map(Number);
    const so = new Date(now); so.setHours(oh, om, 0, 0);
    return now < so;
  })();
  const fromLabel = beforeOpen ? `from ${formatTime12(todayHours.open)}` : null;

  return {
    waitMin,
    isClosed,
    beforeOpen,
    fromLabel,
    pickup: fromLabel || `${Math.max(10, waitMin - 5)}–${waitMin + 5} min`,
    delivery: fromLabel || `${waitMin + 15}–${waitMin + 25} min`,
    dineIn: fromLabel || 'Seat yourself',
  };
}