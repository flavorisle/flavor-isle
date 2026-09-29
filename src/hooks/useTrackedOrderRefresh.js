import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useTrackedOrderRefresh(orderNumber, setOrder) {
  useEffect(() => {
    if (!orderNumber) return;
    let disposed = false;
    let busy = false;
    const refresh = async () => {
      if (disposed || busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        const { data } = await base44.functions.invoke('lookupOrder', { order_number: orderNumber });
        if (!disposed && data?.order) {
          setOrder(current => current?.order_number === orderNumber ? data.order : current);
        }
      } catch (error) {
        // Keep the last known status on screen if a refresh fails.
        console.error('Order status refresh failed:', error);
      } finally {
        busy = false;
      }
    };
    const interval = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [orderNumber, setOrder]);
}