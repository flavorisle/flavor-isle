import { useEffect } from 'react';
import '@/styles/halloween.css';
import { isHalloweenSeason } from '@/lib/halloweenSeason';
import HalloweenDecor from '@/components/halloween/HalloweenDecor';

// Site-wide Halloween theme. While the season is on it tags <html> with
// `halloween` (which re-colors the whole site via halloween.css) and adds the
// spooky decorations. After November 1 it renders nothing and the regular
// theme is back automatically.
export default function HalloweenTheme() {
  const on = isHalloweenSeason();

  useEffect(() => {
    if (!on) return undefined;
    const root = document.documentElement;
    root.classList.add('halloween');
    return () => root.classList.remove('halloween');
  }, [on]);

  return on ? <HalloweenDecor /> : null;
}