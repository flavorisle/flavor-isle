import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// Names the admin screen a path belongs to, so the activity panel can say what
// an admin is working on rather than showing a URL.
const VIEW_LABELS = {
  '/admin': 'Admin Dashboard',
  '/admin/menu': 'Menu Manager',
  '/admin/print-menu': 'Print Menu',
  '/admin/orders': 'Orders',
  '/admin/store-settings': 'Store Settings',
  '/admin/reviews': 'Reviews',
  '/admin/merch-categories': 'Merch Categories',
  '/admin/communications': 'Communications',
  '/admin/emails': 'Emails',
  '/admin/square-logs': 'Square Logs',
  '/admin/kitchen': 'Kitchen',
  '/admin-analytics': 'Analytics',
};

const HEARTBEAT_MS = 3 * 60 * 1000;
const SIGN_IN_KEY = 'flavor-isle-admin-signed-in';

// Invisible: records that this admin is on this screen, once when the screen
// opens and then every few minutes while they stay on it.
export default function AdminPresenceTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    const view = VIEW_LABELS[pathname];
    if (!view) return;

    // The first admin screen of a browser session counts as a sign-in: admin
    // sessions last for days, so the platform's sign-in event does not fire for
    // every visit, and the dashboard still needs to show who was in today.
    const signIn = !sessionStorage.getItem(SIGN_IN_KEY) && document.visibilityState === 'visible';

    const report = (isSignIn = false) => {
      if (document.visibilityState !== 'visible') return;
      base44.functions
        .invoke('trackAdminActivity', { source: 'presence', view, ...(isSignIn ? { sign_in: true } : {}) })
        .catch(() => {});
    };

    report(signIn);
    if (signIn) sessionStorage.setItem(SIGN_IN_KEY, '1');

    const timer = setInterval(report, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [pathname]);

  return null;
}