import { useState, useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';
import { evaluateClosure } from '@/lib/storeClosure';

// Live read of the admin-configured temporary closure. Used by the public
// site banner so it reflects whatever the admin sets in the dashboard.
export default function useStoreClosure() {
  const [state, setState] = useState({ closed: false, message: '', loading: true });

  useEffect(() => {
    let active = true;
    getMenuSetting()
      .then(s => { if (active) setState({ ...evaluateClosure(s), loading: false }); })
      .catch(() => { if (active) setState({ closed: false, message: '', loading: false }); });
    return () => { active = false; };
  }, []);

  return state;
}