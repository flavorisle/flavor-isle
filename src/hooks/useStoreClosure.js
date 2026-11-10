import { useState, useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';
import { evaluateClosure } from '@/lib/storeClosure';
import { computeUnifiedStoreState } from '@/lib/storeState';

// Live read of the store's day state for the public site. Exposes the
// admin-configured temporary closure (used by the CLOSED banner) and a one-day
// early close, both read from the same settings record and rules the phone line
// uses — see src/lib/storeState.js.
export default function useStoreClosure() {
  const [state, setState] = useState({ closed: false, message: '', earlyClose: null, pickupCutoff: 15, loading: true });

  useEffect(() => {
    let active = true;
    getMenuSetting()
      .then((setting) => {
        if (!active) return;
        const closure = evaluateClosure(setting);
        const unified = computeUnifiedStoreState(setting);
        const cutoff = Number(setting?.pickup_cutoff_minutes);
        setState({
          closed: closure.closed,
          message: closure.message,
          earlyClose: unified.earlyCloseToday,
          pickupCutoff: Number.isFinite(cutoff) && cutoff >= 0 ? cutoff : 15,
          loading: false,
        });
      })
      .catch(() => {
        if (active) setState({ closed: false, message: '', earlyClose: null, pickupCutoff: 15, loading: false });
      });
    return () => { active = false; };
  }, []);

  return state;
}