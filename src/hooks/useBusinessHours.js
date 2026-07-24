import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_BUSINESS_HOURS } from '@/lib/businessHours';

export default function useBusinessHours() {
  const [hours, setHours] = useState(DEFAULT_BUSINESS_HOURS);

  useEffect(() => {
    let active = true;
    base44.entities.MenuSetting.list().then(list => {
      const bh = list?.[0]?.business_hours;
      if (active && bh) setHours({ ...DEFAULT_BUSINESS_HOURS, ...bh });
    });
    return () => { active = false; };
  }, []);

  return hours;
}