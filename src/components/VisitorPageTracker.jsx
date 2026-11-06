import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// A random id created once per visit and kept for the tab's lifetime, so the
// visitors page can group a guest's page views into one visit (issue #161).
const SESSION_ID_KEY = 'flavor-isle-visit-id';
function visitId() {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

// Records one visitor page view per page change. The path, the referrer and the
// device facts only the visitor's browser knows are sent — query strings stay out
// of the log — and a failed recording never interrupts the page.
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
      .invoke('logPageView', {
        path: pathname,
        referrer: document.referrer || '',
        ua: navigator.userAgent,
        webdriver: navigator.webdriver === true,
        vw: window.innerWidth,
        vh: window.innerHeight,
        sw: screen.width,
        sh: screen.height,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sid: visitId(),
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}