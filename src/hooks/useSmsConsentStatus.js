import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toE164 } from '@/lib/smsConsent';

// Module-level cache so the footer (rendered on every page) only fetches a
// logged-in customer's consent state once per phone per session, not on every
// route change.
let _cache = { phone: null, status: null };

// Returns the logged-in customer's SMS consent state (if any) so signup
// surfaces can show an already-subscribed state instead of the full form.
// Guests, or logged-in users with no profile phone, get null — the form shows.
export default function useSmsConsentStatus(enabled = true) {
  const [state, setState] = useState({ status: _cache.status, phone: _cache.phone, loading: false });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
        if (!isAuthed || cancelled) return;
        const me = await base44.auth.me().catch(() => null);
        if (!me || cancelled) return;
        const profiles = await base44.entities.CustomerProfile.filter({ email: me.email }).catch(() => []);
        const rawPhone = profiles?.[0]?.phone || '';
        const phone = toE164(rawPhone);
        if (!phone || cancelled) return;
        if (_cache.phone === phone && _cache.status) {
          if (!cancelled) setState({ status: _cache.status, phone, loading: false });
          return;
        }
        setState(s => ({ ...s, loading: true }));
        const res = await base44.functions.invoke('getSmsConsentStatus', { phone });
        if (cancelled) return;
        const status = res.data || { exists: false };
        _cache = { phone, status };
        setState({ status, phone, loading: false });
      } catch {
        // ignore — fall back to showing the form
      } finally {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}