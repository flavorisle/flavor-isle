import { useEffect, useState } from 'react';
import { fetchCrew } from '@/lib/crewCache';

// Issue #345, item 4 — the first names of the crew clocked in right now, for the
// top status bar. Empty whenever the doors are shut, nobody is clocked in, or
// the answer is older than the freshness window.
export default function useCrewOnDuty(open) {
  const [crew, setCrew] = useState([]);

  useEffect(() => {
    if (!open) {
      setCrew([]);
      return undefined;
    }
    let active = true;
    const load = async () => {
      const state = await fetchCrew();
      if (active) setCrew(state.fresh ? state.crew : []);
    };
    load();
    const id = setInterval(load, 120000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [open]);

  if (!open) return [];
  return crew.map((p) => p?.first_name).filter(Boolean);
}