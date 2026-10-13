import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Store, Loader2 } from 'lucide-react';

// Issue #96, section B: in-store orders that are not linked to anyone in the
// customer directory, with their dollar total. Nothing is hidden — the crew can
// see exactly how much walk-in volume is not tied to a customer yet.
//
// The numbers come from one grouped aggregate on the server (never by loading
// orders into the page), and in-store orders are counted on their own: a
// "Walk-In" order belongs to no online customer by design.
export default function UnlinkedOrdersCounter() {
  const [state, setState] = useState({ loading: true, count: 0, total: 0, error: '' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { rows } = await base44.entities.Order.aggregate({
          query: { order_source: 'in_store' },
          groupBy: 'customer_id',
          sum: ['total'],
        });
        if (cancelled) return;
        const unlinked = (rows || []).filter((row) => !row.customer_id);
        const count = unlinked.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
        const total = unlinked.reduce((sum, row) => sum + (Number(row.sum_total) || 0), 0);
        setState({ loading: false, count, total, error: '' });
      } catch (error) {
        if (!cancelled) setState({ loading: false, count: 0, total: 0, error: error.message || 'Could not count in-store orders.' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="card-diner p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-smashie-yellow/20 flex items-center justify-center flex-shrink-0">
        <Store size={18} className="text-obsidian-roast" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm text-obsidian-roast">In-store orders not linked to a customer</p>
        {state.loading ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Counting…
          </p>
        ) : state.error ? (
          <p className="text-xs text-destructive">{state.error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {state.count.toLocaleString()} order{state.count === 1 ? '' : 's'} · ${state.total.toFixed(2)} — a Walk-In order belongs to no online customer, so it is counted here rather than hidden.
          </p>
        )}
      </div>
    </div>
  );
}