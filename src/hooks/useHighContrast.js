import { useEffect, useState } from 'react';

const KEY = 'fi_high_contrast';

// Accessibility helper: toggles a `high-contrast` class on <html> and persists
// the choice so the site renders with stronger text/background contrast.
export default function useHighContrast() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (enabled) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
    try {
      localStorage.setItem(KEY, enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [enabled]);

  return { enabled, toggle: () => setEnabled((e) => !e) };
}