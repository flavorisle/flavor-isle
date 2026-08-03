import { useState, useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';
import { DEFAULT_BUSINESS_HOURS } from '@/lib/businessHours';

export default function useBusinessHours() {
  const [hours, setHours] = useState(DEFAULT_BUSINESS_HOURS);

  useEffect(() => {
    let active = true;
    getMenuSetting().then(s => {
      if (active && s?.business_hours) setHours({ ...DEFAULT_BUSINESS_HOURS, ...s.business_hours });
    });
    return () => { active = false; };
  }, []);

  return hours;
}