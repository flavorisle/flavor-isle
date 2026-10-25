import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// Records one visitor page view per page change. Only the path is sent — query strings
// stay out of the log — and a failed recording never interrupts the page.
export default function VisitorPageTracker() {
  const { pathname } = useLocation();
  const lastView = useRef({ path: '', at: 0 });

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;

    const now = Date.now();
    // React StrictMode mounts twice in development; without this a single page
    // change would be recorded as two visits.
    if (lastView.current.path === pathname && now - lastView.current.at < 2000) return;
    lastView.current = { path: pathname, at: now };

    base44.functions
      .invoke('logPageView', { path: pathname, referrer: document.referrer || '' })
      .catch(() => {});
  }, [pathname]);

  return null;
}